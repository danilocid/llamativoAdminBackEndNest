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
      if (variation.attributes) {
        const sku = variation.attributes.find(
          (attribute) => attribute.id === 'SELLER_SKU',
        )?.value_name;

        await this.googleLoggingService.log(
          'Buscando producto por SKU',
          { sku, variationId: variation.id },
          'INFO',
          'validateAndSyncProduct',
          'product-sync',
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
    const differences = [];

    // Validar si el stock en la base de datos es diferente al stock de Mercado Libre
    if (product.stock !== productDetails.available_quantity) {
      await this.googleLoggingService.log(
        'Diferencia de stock detectada',
        {
          productId: product.id,
          dbStock: product.stock,
          mlStock: productDetails.available_quantity,
        },
        'INFO',
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
        'Diferencia de precio detectada',
        {
          productId: product.id,
          dbPrice: dbPrice,
          mlPrice: productDetails.price,
        },
        'INFO',
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
        'Diferencia de enlace detectada',
        {
          productId: product.id,
          dbLink: product.enlace_ml,
          mlLink: productDetails.permalink,
          productDetails: productDetails,
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

      // Generar notificación
      await this.createProductNotification(
        `Enlace diferente: ${product.descripcion}`,
        `El enlace al producto ${product.descripcion} en la base de datos es diferente al enlace de Mercado Libre.`,
        `/articulos/editar/${product.id}`,
      );
    }

    return {
      hasDifferences: differences.length > 0,
      differences,
    };
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
        'Notificación creada',
        { notificationId: notification.id, title },
        'INFO',
        'createProductNotification',
        'product-sync',
      );

      return notification;
    } catch (error) {
      await this.googleLoggingService.log(
        'Error al crear notificación',
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
    } catch (error) {
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
