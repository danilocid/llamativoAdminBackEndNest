import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleLoggingService } from '../../common/services/google-logging.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Products } from '../products/entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { VentaMl } from './entities/venta-ml.entity';
import { DetalleVentaMl } from './entities/detalle-venta-ml.entity';
import { MercadoLibreAuthService } from './mercado-libre-auth.service';
import { ProductSyncService } from './product-sync.service';
import { Sales } from '../sales/entities/sales.entity';
import { SalesDetails } from '../sales/entities/sales-details.entity';
import { Entities } from '../entities/entities/entities.entity';
import { DocumentType } from '../common/entities/document_type.entity';
import { PaymentMethod } from '../common/entities/payment_method.entity';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';
import { AsociarVentaMlDto } from './dto/asociar-venta-ml.dto';
@Injectable()
export class MercadoLibreService {
  constructor(
    private readonly googleLoggingService: GoogleLoggingService,
    private readonly httpService: HttpService,
    private readonly mercadoLibreAuthService: MercadoLibreAuthService,
    private readonly productSyncService: ProductSyncService,
    @InjectRepository(Products)
    private readonly productsRepository: Repository<Products>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(VentaMl)
    private readonly ventaMlRepository: Repository<VentaMl>,
    @InjectRepository(DetalleVentaMl)
    private readonly detalleVentaMlRepository: Repository<DetalleVentaMl>,
    @InjectRepository(Sales)
    private readonly salesRepository: Repository<Sales>,
    @InjectRepository(SalesDetails)
    private readonly salesDetailsRepository: Repository<SalesDetails>,
    @InjectRepository(Entities)
    private readonly entitiesRepository: Repository<Entities>,
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(ProductMovementDetail)
    private readonly productMovementDetailRepository: Repository<ProductMovementDetail>,
    @InjectRepository(ProductMovementType)
    private readonly productMovementTypeRepository: Repository<ProductMovementType>,
  ) {}

  private async limitNotifications() {
    const MAX_NOTIFICATIONS = 30;
    const count = await this.notificationRepository.count();
    if (count > MAX_NOTIFICATIONS) {
      const notificationsToDelete = await this.notificationRepository.find({
        order: { createdAt: 'ASC' },
        take: count - MAX_NOTIFICATIONS,
      });
      if (notificationsToDelete.length > 0) {
        const idsToDelete = notificationsToDelete.map((n) => n.id);
        await this.notificationRepository.delete(idsToDelete);
      }
    }
  }

  async listProducts() {
    const response = await this.getProductListFromML();

    // Registrar log en Google Cloud solo al inicio
    await this.googleLoggingService.log(
      'Iniciando listado de productos de Mercado Libre',
      { total: response.data?.results?.length ?? 0 },
      'INFO',
      'listProducts',
      'mercado-libre',
    );

    if (response.data && response.data.results.length > 0) {
      response.data.details = [];
      for (const product of response.data.results) {
        let productDetails = null;
        try {
          productDetails = await this.getProductDetailsFromMl(product);
          delete productDetails.data.sale_terms;
          delete productDetails.data.pictures;
          delete productDetails.data.shipping;
          delete productDetails.data.seller_address;
          //productDetails.data.attributes;

          if (productDetails.data.variations.length > 0) {
            for (let variation of productDetails.data.variations) {
              const productFromDB =
                await this.productSyncService.validateAndSyncProduct(
                  productDetails,
                  variation,
                  true,
                );

              if (productFromDB) {
                await this.productSyncService.validateStockAndPrice(
                  productFromDB,
                  variation,
                );
              } else {
                await this.productSyncService.createProductNotification(
                  'Producto no encontrado',
                  `El producto ${productDetails.data.title} con ID ${variation.id} no se encontró en la base de datos`,
                );
              }
            }
          } else {
            const productFromDB =
              await this.productSyncService.validateAndSyncProduct(
                productDetails,
                productDetails.data,
                false,
              );

            if (productFromDB) {
              await this.productSyncService.validateStockAndPrice(
                productFromDB,
                productDetails.data,
              );
            } else {
              let notificationText =
                'El producto ' +
                productDetails.data.title +
                ' con ID ' +
                productDetails.data.id +
                ' no se encontró en la base de datos';
              // Crear notificación
              await this.notificationRepository.save({
                title: 'Producto no encontrado',
                description: notificationText,
              });
            }
          }

          response.data.details.push(productDetails.data);
        } catch (error: any) {
          // Registrar solo un log de error por cada producto
          await this.googleLoggingService.log(
            'Error al obtener detalles del producto de Mercado Libre',
            { error: error.message, product },
            'ERROR',
            'listProducts',
            'mercado-libre',
          );
          throw new InternalServerErrorException(
            'Error al obtener detalles del producto de Mercado Libre: ' +
              error.message,
          );
        }
      }

      delete response.data.seller_id;
      delete response.data.paging;
      delete response.data.query;
      delete response.data.orders;
      delete response.data.available_orders;
      delete response.data.filters;
      delete response.data.available_filters;
      delete response.data.sale_terms;
      delete response.data.pictures;
      return response;
    } else {
      return response;
    }
  }

  async getProductDetailsFromMl(id: string) {
    const url = `https://api.mercadolibre.com/items/${id}?include_attributes=all`;
    let response = null;

    let token = await this.mercadoLibreAuthService.getAuthToken();

    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    };
    try {
      response = await firstValueFrom(
        this.httpService.get(url, {
          validateStatus: () => true,
          headers: headers,
        }),
      );
    } catch (error: any) {
      /*  await this.googleLoggingService.log(
        'Error al obtener detalles del producto de Mercado Libre',
        { error: error.message, id },
        'ERROR',
        'getProductDetailsFromMl',
        'mercado-libre',
      ); */
      response = {
        error: error.message,
        status: error.response?.status,
        data: null,
      };
      throw new Error(
        'Error al obtener detalles del producto de Mercado Libre: ' +
          error.message,
      );
    }

    return {
      error: response?.data?.error,
      status: response?.status,
      data: response?.data,
    };
  }

  async getProductListFromML(): Promise<{
    error?: string;
    status?: number;
    data?: any;
  }> {
    let response = null;
    let token = null;

    const tokenResponse = await this.mercadoLibreAuthService.getAuthToken();
    token = tokenResponse;
    const url =
      'https://api.mercadolibre.com/users/169479376/items/search?include_filters=true&status=active';

    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    };
    try {
      response = await firstValueFrom(
        this.httpService.get(url, {
          validateStatus: () => true,
          headers: headers,
        }),
      );
    } catch (error: any) {
      await this.googleLoggingService.log(
        'Error al listar productos de Mercado Libre',
        { error: error.message },
        'ERROR',
        'getProductListFromML',
        'mercado-libre',
      );
      response = {
        error: error.message,
        status: error.response?.status,
        data: null,
      };
      throw new Error(
        'Error al listar productos de Mercado Libre: ' + error.message,
      );
    }

    return {
      error: response?.data?.error,
      status: response?.status,
      data: response?.data,
    };
  }

  async getMe(): Promise<{
    error?: string;
    status?: number;
    data?: any;
  }> {
    const token = await this.mercadoLibreAuthService.getAuthToken();
    const url = 'https://api.mercadolibre.com/users/me';

    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    };

    const response = await firstValueFrom(
      this.httpService.get(url, {
        validateStatus: () => true,
        headers: headers,
      }),
    );

    return {
      error: response?.data?.error,
      status: response?.status,
      data: response?.data,
    };
  }

  async listSales(): Promise<{
    error?: string;
    status?: number;
    data?: any;
  }> {
    let response = null;

    const token = await this.mercadoLibreAuthService.getAuthToken();

    const userResponse = await firstValueFrom(
      this.httpService.get('https://api.mercadolibre.com/users/me', {
        validateStatus: () => true,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      }),
    );

    const sellerId = userResponse.data?.id;
    if (!sellerId) {
      return {
        error: 'No se pudo obtener el ID del vendedor',
        status: 400,
        data: null,
      };
    }

    const url = `https://api.mercadolibre.com/orders/search?seller=${sellerId}&sort=date_desc&limit=25`;

    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    };
    let newData = [];
    try {
      response = await firstValueFrom(
        this.httpService.get(url, {
          validateStatus: () => true,
          headers: headers,
        }),
      );

      await this.googleLoggingService.log(
        'Listado de ventas de Mercado Libre',
        { sellerId, total: response.data?.results?.length ?? 0 },
        'INFO',
        'listSales',
        'mercado-libre',
      );

      if (response.data?.results?.length > 0) {
        for (const order of response.data.results) {
          const shipmentId = order.shipping?.id;
          if (shipmentId) {
            try {
              const shipmentResponse = await firstValueFrom(
                this.httpService.get(
                  `https://api.mercadolibre.com/shipments/${shipmentId}`,
                  {
                    validateStatus: () => true,
                    headers: {
                      Authorization: 'Bearer ' + token,
                      'Content-Type': 'application/json',
                    },
                  },
                ),
              );
              order.shipping = shipmentResponse.data;
              delete order.payments;
              delete order.fulfilled;
              delete order.taxes;
              delete order.expiration_date;
              delete order.order_request;
              delete order.feedback;
            } catch (error: any) {
              await this.googleLoggingService.log(
                'Error al obtener detalle de envío',
                { shipmentId, error: error.message },
                'ERROR',
                'listSales',
                'mercado-libre',
              );
            }
          }
          console.log(newData.includes(shipmentId));
          newData.push({
            idShipment: shipmentId,
            fulfilled: order.fulfilled,
          });
        }
      }
    } catch (error: any) {
      await this.googleLoggingService.log(
        'Error al listar ventas de Mercado Libre',
        { error: error.message },
        'ERROR',
        'listSales',
        'mercado-libre',
      );
      response = {
        error: error.message,
        status: error.response?.status,
        data: null,
      };
    }

    return {
      error: response?.data?.error,
      status: response?.status,
      data: {
        mlData: response.data?.results,
        newData,
      },
    };
  }

  async validateProductExist(id: string, isVariant: boolean) {
    const product = await this.productsRepository.findOne({
      where: isVariant ? { id_variante_ml: id } : { id_ml: id },
    });

    if (!product) {
      return null;
    }

    return product;
  }

  async validateProductStockAndPrice(product: Products, productDetails: any) {
    // Validar si el stock en la base de datos es diferente al stock de Mercado Libre
    if (product.stock !== productDetails.available_quantity) {
      await this.googleLoggingService.log(
        'Stock diferente detectado',
        {
          productId: product.id,
          descripcion: product.descripcion,
          stockDB: product.stock,
          stockML: productDetails.available_quantity,
          productDetailsFromAPI: productDetails,
        },
        'WARNING',
        'validateProductStockAndPrice',
        'mercado-libre',
      );
      let notificationText = `El stock en la base de datos es diferente al stock de Mercado Libre. Base de datos: ${product.stock}, Mercado Libre: ${productDetails.available_quantity}`;
      await this.notificationRepository.save({
        title: 'Stock diferente:' + product.descripcion,
        description: notificationText,
        url: '/articulos/ver/' + product.id,
      });
    }
    // Validar si el precio en la base de datos es diferente al precio de Mercado Libre
    if (product.venta_neto + product.venta_imp !== productDetails.price) {
      await this.googleLoggingService.log(
        'Precio diferente detectado',
        {
          productId: product.id,
          descripcion: product.descripcion,
          precioDBTotal: product.venta_neto + product.venta_imp,
          precioDBNeto: product.venta_neto,
          precioDBImp: product.venta_imp,
          precioML: productDetails.price,
          productDetailsFromAPI: productDetails,
        },
        'WARNING',
        'validateProductStockAndPrice',
        'mercado-libre',
      );
      let notificationText = `El precio en la base de datos es diferente al precio de Mercado Libre. Base de datos: ${product.venta_neto + product.venta_imp}, Mercado Libre: ${productDetails.price}`;
      await this.notificationRepository.save({
        title: 'Precio diferente:' + product.descripcion,
        description: notificationText,
        url: '/articulos/ver/' + product.id,
      });
    }
    // validar si el enlace al producto es diferente
    if (product.enlace_ml !== productDetails.permalink) {
      await this.googleLoggingService.log(
        'Enlace al producto diferente, actualizando con el de Mercado Libre',
        {
          productId: product.id,
          descripcion: product.descripcion,
          oldLink: product.enlace_ml,
          newLink: productDetails.permalink,
          productDetailsFromAPI: productDetails,
        },
        'INFO',
        'validateProductStockAndPrice',
        'mercado-libre',
      );
      // Actualizar el enlace en la base de datos
      product.enlace_ml = productDetails.permalink;
      await this.productsRepository.save(product);
    }
  }

  async validateProductExistAndDetails(
    productDetails: any,
    variation: any,
    isVariant: boolean,
  ) {
    // Buscar producto en la base de datos
    const productFromDB = await this.productsRepository.findOne({
      where: isVariant
        ? { id_variante_ml: variation.id }
        : { id_ml: productDetails.data.id },
    });

    if (!productFromDB) {
      // Si no existe el producto, intentar buscarlo por SKU para actualizarlo
      if (variation.attributes) {
        const sku = variation.attributes.find(
          (attribute) => attribute.id === 'SELLER_SKU',
        )?.value_name;

        if (sku) {
          const productBySku = await this.productsRepository.findOne({
            where: { cod_barras: sku },
          });

          if (productBySku) {
            // Actualizar el producto con los detalles de Mercado Libre
            productBySku.id_variante_ml = variation.id;
            productBySku.id_ml = productDetails.data.id;
            productBySku.enlace_ml = productDetails.data.permalink;
            productBySku.publicado = true;

            await this.productsRepository.save(productBySku);

            await this.googleLoggingService.log(
              'Producto encontrado por SKU y actualizado',
              { productId: productBySku.id, sku, variationId: variation.id },
              'INFO',
              'validateProductExistAndDetails',
              'mercado-libre',
            );

            return productBySku;
          }
        }
      }

      await this.googleLoggingService.log(
        'Producto no encontrado en la base de datos',
        { variationId: variation.id, productId: productDetails.data.id },
        'WARNING',
        'validateProductExistAndDetails',
        'mercado-libre',
      );

      return null;
    }

    return productFromDB;
  }

  async syncSales() {
    const token = await this.mercadoLibreAuthService.getAuthToken();

    const userResponse = await firstValueFrom(
      this.httpService.get('https://api.mercadolibre.com/users/me', {
        validateStatus: () => true,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      }),
    );

    const sellerId = userResponse.data?.id;
    if (!sellerId) {
      console.log(userResponse.data);
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'No se pudo obtener el ID del vendedor',
        data: null,
      };
    }

    const url = `https://api.mercadolibre.com/orders/search?seller=${sellerId}&sort=date_desc&limit=50`;

    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { validateStatus: () => true, headers }),
      );

      if (!response.data?.results?.length) {
        return {
          serverResponseCode: 200,
          serverResponseMessage: 'No hay órdenes para sincronizar',
          data: { total: 0, nuevas: 0, actualizadas: 0 },
        };
      }

      let nuevas = 0;
      let actualizadas = 0;

      for (const order of response.data.results) {
        const shipmentId = order.shipping?.id;
        if (!shipmentId) continue;

        let shipmentData = null;
        try {
          const shipmentResponse = await firstValueFrom(
            this.httpService.get(
              `https://api.mercadolibre.com/shipments/${shipmentId}`,
              {
                validateStatus: () => true,
                headers,
              },
            ),
          );
          shipmentData = shipmentResponse.data;
        } catch (error: any) {
          await this.googleLoggingService.log(
            'Error al obtener detalle de envío en syncSales',
            { shipmentId, error: error.message },
            'WARNING',
            'syncSales',
            'mercado-libre',
          );
        }

        const productos = (order.order_items || []).map((item: any) => ({
          id_ml: item.item?.id || '',
          sku: item.item?.seller_sku || '',
          titulo: item.item?.title || '',
          cantidad: item.quantity || 1,
          precio: item.unit_price || 0,
        }));

        const montoTotal = order.total_amount || 0;
        const costoEnvio = shipmentData?.shipping_option?.list_cost || null;
        const comisionMl = (order.order_items || []).reduce(
          (sum: number, item: any) => sum + (item.sale_fee || 0),
          0,
        );

        const shipmentIdStr = String(shipmentId);
        const compradorNombre =
          [order.buyer?.first_name, order.buyer?.last_name]
            .filter(Boolean)
            .join(' ') ||
          order.buyer?.nickname ||
          'Sin nombre';

        // Buscar si ya existe una venta con este envío
        let ventaMl = await this.ventaMlRepository.findOne({
          where: { id_envio_ml: shipmentIdStr },
        });

        if (ventaMl) {
          // Actualizar venta existente
          ventaMl.estado = order.status;
          ventaMl.comprador_nombre = compradorNombre;
          ventaMl.fecha_sync = new Date();
          ventaMl.comision_ml = comisionMl;
          if (costoEnvio) {
            ventaMl.costo_envio = (ventaMl.costo_envio || 0) + costoEnvio;
          }
          await this.ventaMlRepository.save(ventaMl);
          actualizadas++;
        } else {
          // Crear nueva venta por envío
          ventaMl = new VentaMl();
          ventaMl.id_envio_ml = shipmentIdStr;
          ventaMl.estado = order.status;
          ventaMl.comprador_nombre = compradorNombre;
          ventaMl.comprador_email = order.buyer?.email || null;
          ventaMl.monto_total = montoTotal;
          ventaMl.moneda = order.currency_id || 'CLP';
          ventaMl.costo_envio = costoEnvio;
          ventaMl.comision_ml = comisionMl;
          ventaMl.fecha_venta_ml = new Date(order.date_created);
          ventaMl.fecha_sync = new Date();
          await this.ventaMlRepository.save(ventaMl);
          nuevas++;
        }

        // Crear o actualizar detalle de orden (siempre, porque una venta puede tener múltiples órdenes)
        const ordenId = String(order.id);
        let detalle = await this.detalleVentaMlRepository.findOne({
          where: { id_orden_ml: ordenId },
        });

        if (!detalle) {
          detalle = new DetalleVentaMl();
          detalle.id_orden_ml = ordenId;
          detalle.venta_ml_id = ventaMl.id;
          detalle.productos = productos;
          detalle.monto_orden = montoTotal;
          detalle.fecha_orden_ml = new Date(order.date_created);
          await this.detalleVentaMlRepository.save(detalle);
        }

        // Recalcular monto total de la venta sumando todas sus órdenes
        const detalles = await this.detalleVentaMlRepository.find({
          where: { venta_ml_id: ventaMl.id },
        });
        ventaMl.monto_total = detalles.reduce(
          (sum, d) => sum + d.monto_orden,
          0,
        );
        await this.ventaMlRepository.save(ventaMl);
      }

      await this.googleLoggingService.log(
        'Sincronización de ventas ML completada',
        { total: response.data.results.length, nuevas, actualizadas },
        'INFO',
        'syncSales',
        'mercado-libre',
      );

      // Generar notificación por cada venta sincronizada
      for (const order of response.data.results) {
        const shipmentId = order.shipping?.id;
        if (!shipmentId) continue;

        const shipmentIdStr = String(shipmentId);
        const ventaMl = await this.ventaMlRepository.findOne({
          where: { id_envio_ml: shipmentIdStr },
        });

        const compradorNombre =
          [order.buyer?.first_name, order.buyer?.last_name]
            .filter(Boolean)
            .join(' ') ||
          order.buyer?.nickname ||
          'Sin nombre';

        const montoTotal = order.total_amount || 0;
        const estado = order.status || 'desconocido';

        let titulo: string;
        let descripcion: string;

        if (ventaMl?.venta_id) {
          titulo = 'Venta ML vinculada';
          descripcion = `Envío #${shipmentIdStr} - ${compradorNombre} - $${montoTotal.toLocaleString('es-CL')} - Venta #${ventaMl.venta_id} - ${estado}`;
        } else {
          titulo = 'Venta ML pendiente';
          descripcion = `Envío #${shipmentIdStr} - ${compradorNombre} - $${montoTotal.toLocaleString('es-CL')} - Sin asociar - ${estado}`;
        }

        await this.notificationRepository.save({
          title: titulo,
          description: descripcion,
          url: '/mercado-libre/ventas-ml',
        });
      }

      // Si no hubo nuevas ni actualizadas, generar notificación informativa
      if (nuevas === 0 && actualizadas === 0) {
        await this.notificationRepository.save({
          title: 'Sincronización ML sin novedad',
          description: `Se revisaron ${response.data.results.length} órdenes, sin ventas nuevas`,
          url: '/mercado-libre/ventas-ml',
        });
      }

      // Mantener máximo 30 notificaciones
      await this.limitNotifications();

      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Ventas sincronizadas correctamente',
        data: { total: response.data.results.length, nuevas, actualizadas },
      };
    } catch (error: any) {
      await this.googleLoggingService.log(
        'Error al sincronizar ventas ML',
        { error: error.message },
        'ERROR',
        'syncSales',
        'mercado-libre',
      );
      return {
        serverResponseCode: 500,
        serverResponseMessage: 'Error al sincronizar ventas: ' + error.message,
        data: null,
      };
    }
  }

  async getVentasMl(page = 1, limit = 10, estado?: string, asociada?: string) {
    const query = this.ventaMlRepository
      .createQueryBuilder('venta_ml')
      .leftJoinAndSelect('venta_ml.detalles', 'detalles');

    if (estado) {
      query.andWhere('venta_ml.estado = :estado', { estado });
    }

    if (asociada === 'true') {
      query.andWhere('venta_ml.venta_id IS NOT NULL');
    } else if (asociada === 'false') {
      query.andWhere('venta_ml.venta_id IS NULL');
    }

    query.orderBy('venta_ml.fecha_venta_ml', 'DESC');

    const total = await query.getCount();
    const totalPages = Math.ceil(total / limit);
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Ventas ML obtenidas',
      data,
      total,
      page,
      totalPages,
    };
  }

  async getVentaMlById(id: number) {
    const venta = await this.ventaMlRepository.findOne({
      where: { id },
      relations: ['detalles'],
    });

    if (!venta) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Venta ML no encontrada',
        data: null,
      };
    }

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Venta ML obtenida',
      data: venta,
    };
  }

  async asociarVentaMl(dto: AsociarVentaMlDto) {
    const ventaMl = await this.ventaMlRepository.findOne({
      where: { id: dto.venta_ml_id },
      relations: ['detalles'],
    });

    if (!ventaMl) {
      throw new NotFoundException('Venta ML no encontrada');
    }

    if (ventaMl.venta_id) {
      throw new NotFoundException('Esta venta ML ya está asociada a una venta del sistema');
    }

    // Validar cliente
    const client = await this.entitiesRepository.findOne({
      where: { rut: dto.cliente },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Validar tipo documento
    const documentType = await this.documentTypeRepository.findOne({
      where: { id: dto.tipo_documento },
    });
    if (!documentType) {
      throw new NotFoundException('Tipo de documento no encontrado');
    }

    // Validar medio pago
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: dto.medio_pago },
    });
    if (!paymentMethod) {
      throw new NotFoundException('Medio de pago no encontrado');
    }

    // Validar duplicado
    const saleExist = await this.salesRepository.findOne({
      where: { documento: dto.documento, tipo_documento: documentType },
    });
    if (saleExist) {
      throw new NotFoundException('Ya existe una venta con ese número de documento');
    }

    // Recoger todos los productos de todas las órdenes
    const allProductos: any[] = [];
    for (const detalle of ventaMl.detalles) {
      if (Array.isArray(detalle.productos)) {
        allProductos.push(...detalle.productos);
      }
    }

    if (allProductos.length === 0) {
      throw new NotFoundException('La venta ML no tiene productos');
    }

    // Buscar productos por SKU y validar stock
    const productosParaVenta: any[] = [];
    const iva = 19;

    for (const prodMl of allProductos) {
      if (!prodMl.sku) {
        throw new NotFoundException(`El producto "${prodMl.titulo}" no tiene SKU configurado en ML`);
      }

      const product = await this.productsRepository.findOne({
        where: { cod_barras: prodMl.sku },
      });

      if (!product) {
        throw new NotFoundException(`Producto con SKU ${prodMl.sku} no encontrado en el sistema`);
      }

      if (product.stock < prodMl.cantidad) {
        throw new NotFoundException(`Stock insuficiente para "${product.descripcion}". Stock: ${product.stock}, requerido: ${prodMl.cantidad}`);
      }

      if (product.deprecado) {
        throw new NotFoundException(`El producto "${product.descripcion}" está deprecado`);
      }

      const precioConIva = prodMl.precio;
      const precioNeto = Math.round(precioConIva * 100 / (100 + iva));
      const precioImp = precioConIva - precioNeto;

      productosParaVenta.push({
        articulo: product,
        cantidad: prodMl.cantidad,
        precio_neto: precioNeto,
        precio_imp: precioImp,
        costo_neto: product.costo_neto,
        costo_imp: product.costo_imp,
      });
    }

    // Calcular totales
    let totalNeto = 0;
    let totalImp = 0;
    let totalCostoNeto = 0;
    let totalCostoImp = 0;

    for (const p of productosParaVenta) {
      totalNeto += p.precio_neto * p.cantidad;
      totalImp += p.precio_imp * p.cantidad;
      totalCostoNeto += p.costo_neto * p.cantidad;
      totalCostoImp += p.costo_imp * p.cantidad;
    }

    // Crear venta
    const sale = new Sales();
    sale.documento = dto.documento;
    sale.tipo_documento = documentType;
    sale.cliente = client;
    sale.medio_pago = paymentMethod;
    sale.monto_neto = totalNeto;
    sale.monto_imp = totalImp;
    sale.costo_neto = totalCostoNeto;
    sale.costo_imp = totalCostoImp;
    sale.fecha = new Date();
    sale.usuario = 1;

    const saleSaved = await this.salesRepository.save(sale);

    // Guardar detalles, descontar stock y registrar movimientos
    const productMovementType = await this.productMovementTypeRepository.findOne({
      where: { tipo_movimiento: 'venta' },
    });

    for (const prod of productosParaVenta) {
      const detail = new SalesDetails();
      detail.venta = saleSaved;
      detail.articulo = prod.articulo;
      detail.cantidad = prod.cantidad;
      detail.precio_neto = prod.precio_neto;
      detail.precio_imp = prod.precio_imp;
      detail.costo_neto = prod.costo_neto;
      detail.costo_imp = prod.costo_imp;
      await this.salesDetailsRepository.save(detail);

      // Descontar stock
      prod.articulo.stock = prod.articulo.stock - prod.cantidad;
      await this.productsRepository.save(prod.articulo);

      // Registrar movimiento
      const productMovementDetail = new ProductMovementDetail();
      productMovementDetail.producto = prod.articulo;
      productMovementDetail.cantidad = prod.cantidad;
      productMovementDetail.createdAt = new Date();
      productMovementDetail.movimiento = productMovementType;
      productMovementDetail.id_movimiento = saleSaved.id;
      await this.productMovementDetailRepository.save(productMovementDetail);
    }

    // Vincular venta ML con la venta creada
    ventaMl.venta_id = saleSaved.id;
    await this.ventaMlRepository.save(ventaMl);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Venta ML asociada correctamente',
      data: { venta_id: saleSaved.id },
    };
  }
}
