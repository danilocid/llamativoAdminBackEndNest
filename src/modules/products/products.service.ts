import { InjectRepository } from '@nestjs/typeorm';
import { Products } from './entities/products.entity';
import { Repository, Brackets, Not } from 'typeorm';
import { GetProductsDto } from './dto/get.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { NotFoundException } from '@nestjs/common';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';

export class ProductsService {
  constructor(
    @InjectRepository(Products)
    private productsRepository: Repository<Products>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private notificationsService: NotificationsService,
  ) {}
  async getAllProducts(t: GetProductsDto) {
    const skippedItems = (t.page - 1) * 10;
    const sort = t.sort;
    const columnt: string = t.order;
    const stockt = t.stock === 'true';
    const active = t.active === 'true';
    const param = t.param || '';

    // Create a query builder
    const queryBuilder = this.productsRepository.createQueryBuilder('product');

    // Add stock condition if needed
    if (stockt) {
      queryBuilder.andWhere('product.stock != :stock', { stock: 0 });
    }

    // Add active condition if needed
    if (active) {
      queryBuilder.andWhere('product.activo = :active', { active: true });
    }

    // Add search parameter conditions
    if (param) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('product.descripcion LIKE :param', { param: `%${param}%` })
            .orWhere('product.cod_interno LIKE :param', { param: `%${param}%` })
            .orWhere('product.cod_barras LIKE :param', { param: `%${param}%` });
        }),
      );
    }

    // Add order condition if needed
    if (columnt) {
      const condition = columnt.includes('.');
      if (condition) {
        const [relation, column] = columnt.split('.');
        queryBuilder.orderBy(`${relation}.${column}`, sort);
      } else {
        queryBuilder.orderBy(`product.${columnt}`, sort);
      }
    }

    // Apply pagination
    if (t.all !== 'true') {
      queryBuilder.take(10).skip(skippedItems);
    }

    // Execute the query and get the results
    const [products, count] = await queryBuilder.getManyAndCount();

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Productos obtenidos.',
      data: products,
      count: count,
    };
  }

  async getOneProduct(idp: number) {
    const product = await this.productsRepository.findOne({
      where: { id: idp },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Producto obtenido.',
      data: product,
    };
  }

  async createProduct(t: CreateProductDto) {
    //check if product already exists, by cod_interno or cod_barras
    const productExists = await this.productsRepository.findOne({
      where: [{ cod_interno: t.cod_interno }, { cod_barras: t.cod_barras }],
    });
    if (productExists) {
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'Producto ya existe.',
        data: null,
      };
    }
    const product = this.productsRepository.create(t);
    product.stock = 0;
    product.activo = true;
    // if product does not have a cod_barras, set it to a number based on the id plus 5000
    // take in mind that id is not set until the product is saved
    if (!product.cod_barras) {
      product.cod_barras = '';
    }

    await this.productsRepository.save(product);
    if (!t.cod_barras) {
      const cod_barras = product.id + 50000;
      product.cod_barras = cod_barras.toString();
      await this.productsRepository.save(product);
    }
    return {
      serverResponseCode: 201,
      serverResponseMessage: 'Producto creado.',
      data: product,
    };
  }

  //update a product

  async updateProduct(t: UpdateProductDto) {
    const product = await this.productsRepository.findOne({
      where: { id: t.id },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }
    const productExists = await this.productsRepository.findOne({
      where: [{ cod_interno: t.cod_interno }, { cod_barras: t.cod_barras }],
    });
    if (productExists && productExists.id !== t.id) {
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'Producto ya existe.',
        data: null,
      };
    }
    // set updated_at to current date
    t.updatedAt = new Date();
    // set to null the enlace_ml, id_ml, id_variante_ml, id_ps and enlace_ps if are empty strings
    if (t.enlace_ml === '' || t.enlace_ml === undefined) t.enlace_ml = null;
    if (t.id_ml === '' || t.id_ml === undefined) t.id_ml = null;
    if (t.id_variante_ml === '' || t.id_variante_ml === undefined)
      t.id_variante_ml = null;
    if (t.enlace_ps === '' || t.enlace_ps === undefined) t.enlace_ps = null;
    if (t.id_ps === '' || t.id_ps === undefined) t.id_ps = null;

    await this.productsRepository.update(t.id, t);
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Producto actualizado.',
      data: null,
    };
  }

  async setInactive() {
    // get all products with stock 0 and active true
    await this.notificationsService.deleteReadedNtoifications();
    await this.createNotificationNoPublicado();
    const products = await this.productsRepository.find({
      where: { stock: 0, activo: true },
    });
    // if there are no products with stock 0 and active true, return an message
    if (products.length === 0) {
      console.warn('No hay productos inactivos.');
      return {
        serverResponseCode: 200,
        serverResponseMessage: 'No hay productos inactivos.',
        data: null,
      };
    }
    // set all products to inactive, set publicado to false and enlace_ml to null
    products.forEach((product) => {
      product.activo = false;
      product.publicado = false;
      product.enlace_ml = null;
      product.id_ml = null;
      product.id_variante_ml = null;
      product.publicado_ps = false;
      product.id_ps = null;
      product.enlace_ps = null;
    });
    await this.productsRepository.save(products);
    // create a notification for each product set to inactive
    products.forEach(async (product) => {
      const notification = new Notification();
      notification.title = 'Producto inactivo';
      notification.description = `El producto ${product.descripcion} ha sido seteado como inactivo.`;
      notification.readed = true;
      notification.readedAt = new Date();
      await this.notificationRepository.save(notification);
    });
    // return a message with the amount of products set to inactive
    console.warn(`${products.length} productos inactivos.`);
    return {
      serverResponseCode: 200,
      serverResponseMessage: `${products.length} productos inactivos.`,
      data: null,
    };
  }

  async createNotificationNoPublicado() {
    // get all products with publicado false and stock greater than 0
    // pick 1 product at random, create a notification to set it to publicado
    const products = await this.productsRepository.find({
      where: { stock: Not(0) },
    });

    if (products.length === 0) {
      console.warn('No hay productos con stock disponible.');
      return {
        serverResponseCode: 200,
        serverResponseMessage: 'No hay productos con stock disponible.',
        data: null,
      };
    }

    // Filtramos los productos con problemas y determinamos la primera propiedad faltante
    const productsWithIssues = products
      .map((product) => {
        if (!product.publicado) return { product, missingField: 'publicado' };
        if (!product.enlace_ml) return { product, missingField: 'enlace_ml' };
        if (!product.id_ml) return { product, missingField: 'id_ml' };
        if (!product.id_variante_ml)
          return { product, missingField: 'id_variante_ml' };
        if (!product.publicado_ps)
          return { product, missingField: 'publicado_ps' };
        if (!product.id_ps) return { product, missingField: 'id_ps' };
        if (!product.enlace_ps) return { product, missingField: 'enlace_ps' };
        return null;
      })
      .filter((item) => item !== null);

    if (productsWithIssues.length === 0) {
      console.warn('No hay productos con propiedades faltantes o no válidas.');
      return {
        serverResponseCode: 200,
        serverResponseMessage:
          'No hay productos con propiedades faltantes o no válidas.',
        data: null,
      };
    }

    // Seleccionamos un producto con problemas al azar
    const { product, missingField } =
      productsWithIssues[Math.floor(Math.random() * productsWithIssues.length)];

    // Crear notificación con detalle de la propiedad faltante
    const notification = new Notification();
    notification.title = 'Producto con propiedad faltante';
    notification.description = `El producto ${product.descripcion} (${product.id}) tiene la propiedad faltante o no válida: ${missingField}.`;
    notification.readed = true;
    notification.readedAt = new Date();

    await this.notificationRepository.save(notification);

    console.warn(
      'Notificación creada. Producto con propiedad faltante. ID:',
      product.id,
      'Propiedad faltante:',
      missingField,
    );

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Notificación creada.',
      data: null,
    };
  }

  // get inventory resume
  async getInventoryResume() {
    let totalUnits = 0;
    let totalCost = 0;
    let totalSale = 0;
    let totalProfit = 0;

    // get all products with stock greater than 0
    const products = await this.productsRepository.find({
      where: { stock: Not(0) },
    });

    // calculate total units, total cost, total sale and total profit
    products.forEach((product) => {
      const salePrice = product.venta_imp + product.venta_neto;
      const costPrice = product.costo_imp + product.costo_neto;
      totalUnits += product.stock;
      totalCost += product.stock * costPrice;
      totalSale += product.stock * salePrice;
      totalProfit += product.stock * (salePrice - costPrice);
    });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Resumen de inventario obtenido.',
      data: {
        totalUnits,
        totalCost,
        totalSale,
        totalProfit,
      },
    };
  }
}
