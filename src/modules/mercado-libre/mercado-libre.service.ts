import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleLoggingService } from '../../common/services/google-logging.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Products } from '../products/entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { MercadoLibreAuthService } from './mercado-libre-auth.service';
import { ProductSyncService } from './product-sync.service';
@Injectable()
export class MercadoLibreService {
  constructor(
    private readonly googleLoggingService: GoogleLoggingService,
    private readonly httpService: HttpService,
    private readonly mercadoLibreAuthService: MercadoLibreAuthService,
    private readonly productSyncService: ProductSyncService, // Nuevo servicio
    @InjectRepository(Products)
    private readonly productsRepository: Repository<Products>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

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
          delete productDetails.data.attributes;

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
        } catch (error) {
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
    // Un solo log para la solicitud de detalles
    await this.googleLoggingService.log(
      'Obteniendo detalles del producto de Mercado Libre',
      { id },
      'INFO',
      'getProductDetailsFromMl',
      'mercado-libre',
    );
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
    } catch (error) {
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
    } catch (error) {
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

  async validateProductExist(id: string, isVariant: boolean) {
    const product = await this.productsRepository.findOne({
      where: isVariant ? { id_variante_ml: id } : { id_ml: id },
    });

    if (!product) {
      return null;
    }

    await this.googleLoggingService.log(
      `Producto encontrado en la base de datos`,
      { productId: product.id, tipo: isVariant ? 'id_variante_ml' : 'id_ml' },
      'INFO',
      'validateProductExist',
      'mercado-libre',
    );
    return product;
  }

  async validateProductStockAndPrice(product: Products, productDetails: any) {
    // Un solo log para la validación
    await this.googleLoggingService.log(
      'Validando stock, precio y enlace del producto',
      { dbProduct: product, mlProduct: productDetails },
      'INFO',
      'validateProductStockAndPrice',
      'mercado-libre',
    );
    // Validar si el stock en la base de datos es diferente al stock de Mercado Libre
    if (product.stock !== productDetails.available_quantity) {
      let notificationText = `El stock en la base de datos es diferente al stock de Mercado Libre. Base de datos: ${product.stock}, Mercado Libre: ${productDetails.available_quantity}`;
      await this.notificationRepository.save({
        title: 'Stock diferente:' + product.descripcion,
        description: notificationText,
        url: '/articulos/ver/' + product.id,
      });
    }
    // Validar si el precio en la base de datos es diferente al precio de Mercado Libre
    if (product.venta_neto + product.venta_imp !== productDetails.price) {
      let notificationText = `El precio en la base de datos es diferente al precio de Mercado Libre. Base de datos: ${product.venta_neto + product.venta_imp}, Mercado Libre: ${productDetails.price}`;
      await this.notificationRepository.save({
        title: 'Precio diferente:' + product.descripcion,
        description: notificationText,
        url: '/articulos/ver/' + product.id,
      });
    }
    // validar si el enlace al producto es diferente
    if (product.enlace_ml !== productDetails.permalink) {
      console.log(
        'Enlace al producto diferente en la base de datos y Mercado Libre',
        { dbLink: product.enlace_ml, mlLink: productDetails.permalink },
      );
      let notificationText = `El enlace al producto ${product.descripcion} en la base de datos es diferente al enlace de Mercado Libre.`;
      await this.notificationRepository.save({
        title: 'Enlace diferente:' + product.descripcion,
        description: notificationText,
        url: '/articulos/ver/' + product.id,
      });
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

        await this.googleLoggingService.log(
          'Buscando producto por SKU',
          { sku, variationId: variation.id },
          'INFO',
          'validateProductExistAndDetails',
          'mercado-libre',
        );

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
}
