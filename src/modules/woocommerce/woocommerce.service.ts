import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { ListWoocommerceProductsDto } from './dto/list-woocommerce-products.dto';
import { Products } from '../products/entities/products.entity';
import { MercadoLibreAuthService } from '../mercado-libre/mercado-libre-auth.service';
import { MercadoLibreService } from '../mercado-libre/mercado-libre.service';
import { Notification } from '../notifications/entities/notification.entity';

@Injectable()
export class WoocommerceService {
  private readonly logger = new Logger(WoocommerceService.name);
  private readonly baseUrl: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly mlSellerId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly mercadoLibreAuthService: MercadoLibreAuthService,
    private readonly mercadoLibreService: MercadoLibreService,
    @InjectRepository(Products)
    private readonly productsRepo: Repository<Products>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {
    this.baseUrl = this.configService.get<string>('WOO_BASE_URL');
    this.consumerKey = this.configService.get<string>('WOO_CONSUMER_KEY');
    this.consumerSecret = this.configService.get<string>('WOO_CONSUMER_SECRET');
    this.mlSellerId =
      this.configService.get<string>('ML_SELLER_ID') ?? '169479376';
  }

  async listProducts(t: ListWoocommerceProductsDto) {
    this.logger.log(
      `Consultando productos WooCommerce | page=${t.page} per_page=${t.per_page} status=${t.status ?? 'any'} search=${t.search ?? ''}`,
    );
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/wp-json/wc/v3/products`, {
          params: {
            consumer_key: this.consumerKey,
            consumer_secret: this.consumerSecret,
            page: t.page,
            per_page: t.per_page,
            ...(t.search && { search: t.search }),
            ...(t.status && { status: t.status }),
          },
        }),
      );

      const wooProducts = (response.data as any[]).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        permalink: p.permalink,
        type: p.type,
        status: p.status,
        description: p.description,
        short_description: p.short_description,
        sku: p.sku,
        price: p.price,
        regular_price: p.regular_price,
        sale_price: p.sale_price,
        on_sale: p.on_sale,
        purchasable: p.purchasable,
        manage_stock: p.manage_stock,
        stock_quantity: p.stock_quantity,
        stock_status: p.stock_status,
        weight: p.weight,
        dimensions: p.dimensions,
        categories: p.categories,
        tags: p.tags,
        images: p.images,
        attributes: p.attributes,
        variations: p.variations,
      }));

      this.logger.log(`WooCommerce devolvió ${wooProducts.length} productos`);

      // Buscar productos en BD por SKU (cod_interno o cod_barras)
      const skus = wooProducts.map((p) => p.sku).filter(Boolean);
      this.logger.log(`SKUs a buscar en BD: [${skus.join(', ')}]`);
      const dbProducts = skus.length
        ? await this.productsRepo
            .createQueryBuilder('p')
            .where(
              'TRIM(p.cod_interno) IN (:...skus) OR TRIM(p.cod_barras) IN (:...skus)',
              { skus },
            )
            .getMany()
        : [];

      this.logger.log(
        `Productos encontrados en BD: ${dbProducts.length} de ${skus.length} SKUs`,
      );

      // Mapear por cod_interno y cod_barras para cubrir ambos casos
      const dbMap = new Map<string, Products>();
      for (const p of dbProducts) {
        dbMap.set(p.cod_interno.trim(), p);
        dbMap.set(p.cod_barras.trim(), p);
      }

      const mlProductsBySku = new Map<string, any | null>();
      const getMlProductBySku = async (sku?: string) => {
        const cleanSku = sku?.trim();
        if (!cleanSku) return null;
        if (mlProductsBySku.has(cleanSku)) {
          return mlProductsBySku.get(cleanSku) ?? null;
        }
        const mlProduct = await this.findMercadoLibreProductBySku(cleanSku);
        mlProductsBySku.set(cleanSku, mlProduct);
        return mlProduct;
      };

      const products = await Promise.all(
        wooProducts.map(async (woo) => {
          const mlProduct = await getMlProductBySku(woo.sku);
          const titleMatch = mlProduct
            ? this.compareProductTitles(woo.name, mlProduct.title)
            : null;
          const mlSync = {
            found_in_ml: Boolean(mlProduct),
            ml_id: mlProduct?.id ?? null,
            ml_title: mlProduct?.title ?? null,
            title_match: titleMatch,
            ml_permalink: mlProduct?.permalink ?? null,
          };

          if (mlProduct && titleMatch === false) {
            this.logger.warn(
              `Título desincronizado con MercadoLibre | SKU=${woo.sku} woo="${woo.name}" ml="${mlProduct.title}"`,
            );
          }

          const db = dbMap.get(woo.sku?.trim());
          if (!db) {
            this.logger.warn(
              `SKU "${woo.sku}" (${woo.name}) no encontrado en BD`,
            );
            return {
              ...woo,
              sync: { found_in_db: false, mercado_libre: mlSync },
            };
          }

          const wooPrice = Math.round(parseFloat(woo.price));
          const dbPrice = db.venta_imp + db.venta_neto;
          const priceMatch = wooPrice === dbPrice;
          const stockMatch = woo.manage_stock
            ? (woo.stock_quantity ?? 0) === db.stock
            : null;

          if (!priceMatch)
            this.logger.warn(
              `Precio desincronizado | SKU=${woo.sku} woo=$${wooPrice} db=$${dbPrice}`,
            );
          if (stockMatch === false)
            this.logger.warn(
              `Stock desincronizado  | SKU=${woo.sku} woo=${woo.stock_quantity} db=${db.stock}`,
            );

          return {
            ...woo,
            sync: {
              found_in_db: true,
              db_id: db.id,
              price_match: priceMatch,
              woo_price: wooPrice,
              db_price: dbPrice,
              stock_match: stockMatch,
              woo_stock: woo.manage_stock
                ? woo.stock_quantity
                : 'no gestionado',
              db_stock: db.stock,
              permalink: woo.permalink,
              mercado_libre: mlSync,
              _dbRef: db,
            },
          };
        }),
      );

      // Actualizar en WooCommerce los productos con precio o stock desincronizado
      const updatePromises = products
        .filter((p) => p.sync.found_in_db)
        .filter(
          (p) => p.sync.price_match === false || p.sync.stock_match === false,
        )
        .map(async (p) => {
          const body: Record<string, any> = {};
          if (!p.sync.price_match) {
            body.regular_price = String(p.sync.db_price);
          }
          if (p.sync.stock_match === false) {
            body.manage_stock = true;
            body.stock_quantity = (p.sync as any)._dbRef.stock;
          }
          this.logger.log(
            `Actualizando producto id=${p.id} SKU=${(p as any).sku} | cambios: ${JSON.stringify(body)}`,
          );
          try {
            await firstValueFrom(
              this.httpService.post(
                `${this.baseUrl}/wp-json/wc/v3/products/${p.id}`,
                body,
                {
                  params: {
                    consumer_key: this.consumerKey,
                    consumer_secret: this.consumerSecret,
                  },
                  headers: {
                    'X-HTTP-Method-Override': 'PUT',
                  },
                },
              ),
            );
            this.logger.log(`Producto id=${p.id} actualizado correctamente`);
            if (p.sync.price_match === false) {
              await this.createActionNotification(
                'Producto actualizado en WooCommerce',
                `Se actualizó el precio del producto ${(p as any).name} (SKU ${(p as any).sku}) en WooCommerce.`,
                `/articulos/ver/${(p.sync as any)._dbRef.id}`,
              );
            }
            if (p.sync.stock_match === false) {
              await this.createActionNotification(
                'Stock actualizado en WooCommerce',
                `Se actualizó el stock del producto ${(p as any).name} (SKU ${(p as any).sku}) en WooCommerce.`,
                `/articulos/ver/${(p.sync as any)._dbRef.id}`,
              );
            }
            p.sync['updated'] = true;
          } catch (err: any) {
            const status = err?.response?.status;
            const responseBody = err?.response?.data;
            this.logger.error(
              `Error actualizando producto id=${p.id} | status=${status} | body=${JSON.stringify(responseBody)} | message=${err instanceof Error ? err.message : String(err)}`,
            );
            p.sync['updated'] = false;
          }
          delete (p.sync as any)._dbRef;
        });

      await Promise.all(updatePromises);

      // Limpiar _dbRef de productos sin actualización
      products.forEach((p) => delete (p.sync as any)?._dbRef);

      const updated = products.filter((p) => p.sync['updated'] === true).length;
      const outOfSync = products.filter(
        (p) =>
          p.sync.found_in_db &&
          (p.sync.price_match === false || p.sync.stock_match === false),
      ).length;
      this.logger.log(
        `Sincronización completada | total=${products.length} desincronizados=${outOfSync} actualizados=${updated}`,
      );

      return {
        data: products,
        total: response.headers['x-wp-total'],
        totalPages: response.headers['x-wp-totalpages'],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en listProducts: ${message}`);
      throw new InternalServerErrorException(
        `Error al obtener productos de WooCommerce: ${message}`,
      );
    }
  }

  private async findMercadoLibreProductBySku(sku: string) {
    try {
      const token = await this.mercadoLibreAuthService.getAuthToken();
      const response = await firstValueFrom(
        this.httpService.get(
          `https://api.mercadolibre.com/users/${this.mlSellerId}/items/search`,
          {
            params: {
              status: 'active',
              seller_sku: sku,
              limit: 1,
            },
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            validateStatus: () => true,
          },
        ),
      );

      if (response.status >= 400) {
        this.logger.warn(
          `MercadoLibre respondió status=${response.status} buscando SKU=${sku}`,
        );
        this.logger.debug(`Response data: ${JSON.stringify(response.data)}`);
        return null;
      }

      const itemId = response.data?.results?.[0];
      if (!itemId) {
        return null;
      }

      const detailResponse = await firstValueFrom(
        this.httpService.get(`https://api.mercadolibre.com/items/${itemId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }),
      );

      if (detailResponse.status >= 400) {
        this.logger.warn(
          `MercadoLibre respondió status=${detailResponse.status} al obtener detalle id=${itemId}`,
        );
        this.logger.debug(
          `Response data: ${JSON.stringify(detailResponse.data)}`,
        );
        return null;
      }

      return detailResponse.data ?? null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Error buscando SKU=${sku} en MercadoLibre: ${message}`);
      return null;
    }
  }

  async syncPublishedProductFromMercadoLibre() {
    return this.syncAllPublishedMlProductsInWoo();
  }

  async syncForNotifications() {
    let processedPages = 0;
    let totalPages = 1;
    const perPage = 100;

    do {
      const response = await this.listProducts({
        page: processedPages + 1,
        per_page: perPage,
        status: 'any',
      });
      processedPages += 1;
      totalPages = Number(response.totalPages ?? 1) || 1;
    } while (processedPages < totalPages);

    const createdFromMl = await this.syncPublishedProductFromMercadoLibre();

    return {
      processedPages,
      createdFromMl,
    };
  }

  /**
   * Sincroniza todos los productos publicados de MercadoLibre en WooCommerce
   */
  private async syncAllPublishedMlProductsInWoo() {
    try {
      const mlListResponse =
        await this.mercadoLibreService.getProductListFromML();
      const publishedItemIds = (mlListResponse.data?.results ?? []) as string[];
      const results: any[] = [];

      for (const itemId of publishedItemIds) {
        const productDetailsResponse =
          await this.mercadoLibreService.getProductDetailsFromMl(itemId);
        const mlProduct = productDetailsResponse?.data;
        if (!mlProduct) continue;

        const candidate =
          this.extractWooCreationCandidateFromMlProduct(mlProduct);
        if (!candidate) continue;

        const dbProduct = await this.findDbProductBySku(candidate.sku);
        if (!dbProduct) continue;

        const existingWooProduct = await this.findWooProductBySku(
          candidate.sku,
        );
        if (existingWooProduct) {
          await this.updateWooLinkInDb(dbProduct, existingWooProduct);
          results.push({
            created: false,
            reason: 'already_exists',
            sku: candidate.sku,
            db_id: dbProduct.id,
            woo_id: existingWooProduct.id,
            woo_permalink: existingWooProduct.permalink ?? null,
            ml_id: mlProduct.id,
            ml_title: candidate.title,
          });
          continue;
        }

        const createdWooProduct = await this.createWooProductFromMl(
          candidate,
          dbProduct,
        );
        if (!createdWooProduct) continue;

        await this.updateWooLinkInDb(dbProduct, createdWooProduct);
        results.push({
          created: true,
          sku: candidate.sku,
          db_id: dbProduct.id,
          woo_id: createdWooProduct.id,
          woo_permalink: createdWooProduct.permalink ?? null,
          ml_id: mlProduct.id,
          ml_title: candidate.title,
        });
      }

      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudo sincronizar todos los productos publicados de MercadoLibre en WooCommerce: ${message}`,
      );
      return null;
    }
  }

  private extractWooCreationCandidateFromMlProduct(mlProduct: any) {
    if (
      Array.isArray(mlProduct.variations) &&
      mlProduct.variations.length > 0
    ) {
      for (const variation of mlProduct.variations) {
        const sku = variation?.attributes?.find(
          (attribute: any) => attribute.id === 'SELLER_SKU',
        )?.value_name;
        if (!sku) {
          continue;
        }

        const suffix = (variation.attribute_combinations ?? [])
          .map((attribute: any) => attribute.value_name)
          .filter(Boolean)
          .join(' ');

        return {
          sku,
          title: suffix ? `${mlProduct.title} ${suffix}` : mlProduct.title,
          stock:
            variation.available_quantity ?? mlProduct.available_quantity ?? 0,
          description: mlProduct.description ?? mlProduct.plain_text ?? null,
          ml_permalink: mlProduct.permalink ?? null,
          images: mlProduct.pictures ?? [],
        };
      }
    }

    const sku = mlProduct.attributes?.find(
      (attribute: any) => attribute.id === 'SELLER_SKU',
    )?.value_name;
    if (!sku) {
      return null;
    }

    return {
      sku,
      title: mlProduct.title,
      stock: mlProduct.available_quantity ?? 0,
      description: mlProduct.description ?? mlProduct.plain_text ?? null,
      ml_permalink: mlProduct.permalink ?? null,
      images: mlProduct.pictures ?? [],
    };
  }

  private async findDbProductBySku(sku: string) {
    return this.productsRepo
      .createQueryBuilder('p')
      .where('TRIM(p.cod_interno) = :sku OR TRIM(p.cod_barras) = :sku', { sku })
      .getOne();
  }

  private async findWooProductBySku(sku: string) {
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/wp-json/wc/v3/products`, {
        params: {
          consumer_key: this.consumerKey,
          consumer_secret: this.consumerSecret,
          sku,
          per_page: 1,
        },
      }),
    );

    return (response.data as any[])?.[0] ?? null;
  }

  private async createWooProductFromMl(candidate: any, dbProduct: Products) {
    const categories = await this.resolveWooCategoriesByTitle(candidate.title);
    const description = this.buildWooDescription(
      candidate.description,
      dbProduct,
    );
    const body = {
      name: candidate.title,
      type: 'simple',
      status: 'publish',
      description,
      short_description: dbProduct.descripcion,
      sku: candidate.sku,
      regular_price: String(dbProduct.venta_neto + dbProduct.venta_imp),
      manage_stock: true,
      stock_quantity: dbProduct.stock,
      stock_status: dbProduct.stock > 0 ? 'instock' : 'outofstock',
      ...(categories.length > 0 && { categories }),
      images: (candidate.images ?? []).slice(0, 8).map((image: any) => ({
        src: image.secure_url ?? image.url,
      })),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/wp-json/wc/v3/products`, body, {
          params: {
            consumer_key: this.consumerKey,
            consumer_secret: this.consumerSecret,
          },
        }),
      );

      this.logger.log(
        `Producto creado en WooCommerce | SKU=${candidate.sku} id=${response.data?.id}`,
      );

      await this.createActionNotification(
        'Producto creado en WooCommerce',
        `Se creó el producto ${candidate.title} (SKU ${candidate.sku}) en WooCommerce.`,
        response.data?.permalink ?? `/articulos/ver/${dbProduct.id}`,
      );

      return response.data ?? null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudo crear producto en WooCommerce | SKU=${candidate.sku} error=${message}`,
      );
      return null;
    }
  }

  private buildWooDescription(
    mlDescription: string | null,
    dbProduct: Products,
  ) {
    const cleanMlDescription = (mlDescription ?? '').trim();
    if (cleanMlDescription.length > 0) {
      return cleanMlDescription;
    }

    return dbProduct.descripcion;
  }

  private async resolveWooCategoriesByTitle(title?: string) {
    const normalizedTitle = this.normalizeTitle(title);
    const categoryNames: string[] = [];

    if (normalizedTitle.includes('delantal')) {
      categoryNames.push('Delantales');
    }
    if (normalizedTitle.includes('jardinera')) {
      categoryNames.push('Jardineras');
    }

    if (categoryNames.length === 0) {
      return [];
    }

    const categories = await Promise.all(
      categoryNames.map((categoryName) =>
        this.findWooCategoryByName(categoryName),
      ),
    );

    return categories.filter(Boolean).map((category) => ({ id: category.id }));
  }

  private async findWooCategoryByName(name: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/wp-json/wc/v3/products/categories`,
          {
            params: {
              consumer_key: this.consumerKey,
              consumer_secret: this.consumerSecret,
              search: name,
              per_page: 100,
            },
          },
        ),
      );

      const categories = (response.data as any[]) ?? [];
      const normalizedName = this.normalizeTitle(name);
      const existingCategory =
        categories.find(
          (category) => this.normalizeTitle(category.name) === normalizedName,
        ) ?? null;

      if (existingCategory) {
        return existingCategory;
      }

      const createResponse = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/wp-json/wc/v3/products/categories`,
          { name },
          {
            params: {
              consumer_key: this.consumerKey,
              consumer_secret: this.consumerSecret,
            },
          },
        ),
      );

      this.logger.log(
        `Categoría creada en WooCommerce | name=${name} id=${createResponse.data?.id}`,
      );

      return createResponse.data ?? null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudo resolver categoría WooCommerce "${name}": ${message}`,
      );
      return null;
    }
  }

  private async updateWooLinkInDb(dbProduct: Products, wooProduct: any) {
    const nextId = wooProduct?.id ? String(wooProduct.id) : null;
    const nextLink = wooProduct?.permalink ?? null;

    if (
      dbProduct.publicado_ps === true &&
      dbProduct.id_ps === nextId &&
      dbProduct.enlace_ps === nextLink
    ) {
      return;
    }

    dbProduct.publicado_ps = true;
    dbProduct.id_ps = nextId;
    dbProduct.enlace_ps = nextLink;
    await this.productsRepo.save(dbProduct);
  }

  private async createActionNotification(
    title: string,
    description: string,
    url?: string,
  ) {
    await this.notificationRepo.save({
      title,
      description,
      url,
      readed: false,
    });
  }

  private compareProductTitles(wooTitle?: string, mlTitle?: string): boolean {
    const normalizedWoo = this.normalizeTitle(wooTitle);
    const normalizedMl = this.normalizeTitle(mlTitle);
    return normalizedWoo.length > 0 && normalizedWoo === normalizedMl;
  }

  private normalizeTitle(title?: string): string {
    return (title ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}
