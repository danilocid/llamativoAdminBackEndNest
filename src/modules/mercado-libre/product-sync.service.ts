import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Products } from '../products/entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';

// product-sync.service.ts
@Injectable()
export class ProductSyncService {
  constructor(
    @InjectRepository(Products)
    private readonly productsRepository: Repository<Products>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly googleLoggingService: GoogleLoggingService,
  ) {}

  async validateAndSyncProduct(
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
      if (isVariant && variation.attributes) {
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
              'Producto encontrado por SKU y actualizado (variant)',
              { productId: productBySku.id, sku, variationId: variation.id },
              'INFO',
              'validateAndSyncProduct',
              'product-sync',
            );

            return productBySku;
          }
        }
      } else if (!isVariant && productDetails.data.attributes) {
        const sku = productDetails.data.attributes.find(
          (attribute) => attribute.id === 'SELLER_SKU',
        )?.value_name;

        if (sku) {
          const productBySku = await this.productsRepository.findOne({
            where: { cod_barras: sku },
          });

          if (productBySku) {
            // Actualizar el producto con los detalles de Mercado Libre
            productBySku.id_ml = productDetails.data.id;
            productBySku.enlace_ml = productDetails.data.permalink;
            productBySku.publicado = true;

            await this.productsRepository.save(productBySku);

            await this.googleLoggingService.log(
              'Producto encontrado por SKU y actualizado (no variant)',
              { productId: productBySku.id, sku, mlId: productDetails.data.id },
              'INFO',
              'validateAndSyncProduct',
              'product-sync',
            );

            return productBySku;
          }
        }
      }

      await this.googleLoggingService.log(
        'Producto no encontrado en la base de datos',
        {
          variationId: isVariant ? variation.id : null,
          productId: productDetails.data.id,
        },
        'WARNING',
        'validateAndSyncProduct',
        'product-sync',
      );

      return null;
    }

    return productFromDB;
  }

  async validateStockAndPrice(product: Products, productDetails: any) {
    // Solo validar si la publicación está activa
    if (productDetails.status && productDetails.status !== 'active') {
      await this.googleLoggingService.log(
        'Publicación no activa, saltando validación de stock y precio',
        {
          productId: product.id,
          descripcion: product.descripcion,
          status: productDetails.status,
        },
        'INFO',
        'validateStockAndPrice',
        'product-sync',
      );

      await this.createProductNotification(
        `Publicación no activa: ${product.descripcion}`,
        `La publicación en Mercado Libre está en estado "${productDetails.status}". Stock y precio no se validan.`,
        `/articulos/ver/${product.id}`,
      );

      return { hasDifferences: false, differences: [], skipped: true };
    }

    const differences = [];

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
        'validateStockAndPrice',
        'product-sync',
      );

      differences.push({
        type: 'stock',
        dbValue: product.stock,
        mlValue: productDetails.available_quantity,
      });

      // Generar notificación
      await this.createProductNotification(
        `Stock diferente: ${product.descripcion}`,
        `El stock en la base de datos es diferente al stock de Mercado Libre. Base de datos: ${product.stock}, Mercado Libre: ${productDetails.available_quantity}`,
        `/articulos/editar/${product.id}`,
      );
    }

    // Validar si el precio en la base de datos es diferente al precio de Mercado Libre
    const dbPrice = product.venta_neto + product.venta_imp;
    if (dbPrice !== productDetails.price) {
      await this.googleLoggingService.log(
        'Precio diferente detectado',
        {
          productId: product.id,
          descripcion: product.descripcion,
          precioDBTotal: dbPrice,
          precioDBNeto: product.venta_neto,
          precioDBImp: product.venta_imp,
          precioML: productDetails.price,
          productDetailsFromAPI: productDetails,
        },
        'WARNING',
        'validateStockAndPrice',
        'product-sync',
      );

      differences.push({
        type: 'price',
        dbValue: dbPrice,
        mlValue: productDetails.price,
      });

      // Generar notificación
      await this.createProductNotification(
        `Precio diferente: ${product.descripcion}`,
        `El precio en la base de datos es diferente al precio de Mercado Libre. Base de datos: ${dbPrice}, Mercado Libre: ${productDetails.price}`,
        `/articulos/editar/${product.id}`,
      );
    }

    // Validar si el enlace al producto es diferente
    if (
      product.enlace_ml !== productDetails.permalink &&
      productDetails.permalink !== null &&
      productDetails.permalink !== undefined
    ) {
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
        'validateStockAndPrice',
        'product-sync',
      );

      differences.push({
        type: 'link',
        dbValue: product.enlace_ml,
        mlValue: productDetails.permalink,
      });

      // Actualizar el enlace en la base de datos
      product.enlace_ml = productDetails.permalink;
      await this.productsRepository.save(product);
    }

    return {
      hasDifferences: differences.length > 0,
      differences,
    };
  }

  /**
   * Valida que todo producto marcado como `publicado` tenga realmente una
   * publicación activa en Mercado Libre.
   *
   * La sincronización de stock recorre las publicaciones activas de ML hacia la
   * base de datos, de modo que un producto que quedó sin publicación nunca se
   * visita y su flag seguía quedando en `true`. Este método hace el recorrido
   * inverso: parte de los productos publicados en la base de datos y corrige
   * los que ya no tienen publicación activa.
   *
   * @param publicacionesActivas ids que ML reporta como publicaciones activas
   * @param variacionesPorPublicacion variaciones vigentes de cada publicación,
   *   para detectar variantes eliminadas dentro de una publicación activa
   */
  async validarPublicacionesActivas(
    publicacionesActivas: string[],
    variacionesPorPublicacion: Record<string, string[]> = {},
  ) {
    const activas = new Set(publicacionesActivas);
    const publicados = await this.productsRepository.find({
      where: { publicado: true },
    });

    let despublicados = 0;

    for (const product of publicados) {
      const motivo = this.motivoSinPublicacionActiva(
        product,
        activas,
        variacionesPorPublicacion,
      );

      if (!motivo) continue;

      await this.googleLoggingService.log(
        'Producto marcado como publicado sin publicación activa en ML',
        { productId: product.id, id_ml: product.id_ml, motivo },
        'WARNING',
        'validarPublicacionesActivas',
        'product-sync',
      );

      // Solo se corrige el flag: id_ml y enlace_ml se conservan para poder
      // identificar qué publicación se cayó y poder reactivarla
      product.publicado = false;
      await this.productsRepository.save(product);
      despublicados++;

      await this.createProductNotification(
        'Producto sin publicación activa en ML',
        `${product.descripcion} (${product.id}) estaba marcado como publicado, pero ${motivo}. Se marcó como no publicado.`,
        `/articulos/ver/${product.id}`,
      );
    }

    await this.googleLoggingService.log(
      'Validación de publicaciones activas de ML',
      { evaluados: publicados.length, despublicados },
      'INFO',
      'validarPublicacionesActivas',
      'product-sync',
    );

    return { evaluados: publicados.length, despublicados };
  }

  /**
   * Devuelve el motivo por el que el producto no tiene publicación activa,
   * o `null` si la publicación sigue vigente.
   */
  private motivoSinPublicacionActiva(
    product: Products,
    activas: Set<string>,
    variacionesPorPublicacion: Record<string, string[]>,
  ): string | null {
    if (!product.id_ml) {
      return 'no tiene asociado el identificador de ninguna publicación';
    }

    if (!activas.has(product.id_ml)) {
      return `la publicación ${product.id_ml} ya no está activa en Mercado Libre`;
    }

    // La publicación existe; verificar que la variación siga en ella
    const variaciones = variacionesPorPublicacion[product.id_ml];
    if (
      product.id_variante_ml &&
      variaciones &&
      variaciones.length > 0 &&
      !variaciones.includes(product.id_variante_ml)
    ) {
      return `la variación ${product.id_variante_ml} ya no existe en la publicación ${product.id_ml}`;
    }

    return null;
  }

  async createProductNotification(
    title: string,
    description: string,
    url?: string,
  ) {
    try {
      const notification = await this.notificationRepository.save({
        title,
        description,
        url: url || null,
        readed: false,
        createdAt: new Date(),
      });

      await this.googleLoggingService.log(
        'Notificacion creada',
        { notificationId: notification.id, title },
        'INFO',
        'createProductNotification',
        'product-sync',
      );

      return notification;
    } catch (error: any) {
      await this.googleLoggingService.log(
        'Error al crear notificacion',
        { error: error.message, title, description },
        'ERROR',
        'createProductNotification',
        'product-sync',
      );
      throw error;
    }
  }

  async syncProductBatch(products: Products[]) {
    try {
      await this.productsRepository.manager.transaction(async (manager) => {
        for (const product of products) {
          await manager.save(Products, product);
        }
      });

      await this.googleLoggingService.log(
        'Lote de productos sincronizado',
        { count: products.length },
        'INFO',
        'syncProductBatch',
        'product-sync',
      );

      return { success: true, count: products.length };
    } catch (error: any) {
      await this.googleLoggingService.log(
        'Error al sincronizar lote de productos',
        { error: error.message, count: products.length },
        'ERROR',
        'syncProductBatch',
        'product-sync',
      );
      throw error;
    }
  }

  async findProductByMLId(id: string, isVariant: boolean) {
    return await this.productsRepository.findOne({
      select: [
        'id',
        'stock',
        'venta_neto',
        'venta_imp',
        'enlace_ml',
        'descripcion',
        'cod_barras',
      ],
      where: isVariant ? { id_variante_ml: id } : { id_ml: id },
    });
  }
}
