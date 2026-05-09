import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Body,
  Put,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { GetProductsDto } from './dto/get.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@ApiTags('Products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  // get all products
  /**
   * Obtiene todos los productos con filtros, paginación y ordenamiento.
   */
  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Página de resultados',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    example: 'ASC',
    description: 'Orden ASC/DESC',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    type: String,
    example: 'descripcion',
    description: 'Columna para ordenar',
  })
  @ApiQuery({
    name: 'stock',
    required: false,
    type: String,
    example: 'true',
    description: 'Filtrar por productos con stock',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: String,
    example: 'true',
    description: 'Filtrar por productos activos',
  })
  @ApiQuery({
    name: 'includeDeprecated',
    required: false,
    type: String,
    example: 'false',
    description: 'Incluir productos deprecados',
  })
  @ApiQuery({
    name: 'param',
    required: false,
    type: String,
    example: 'laptop',
    description: 'Búsqueda por descripción, código interno o barras',
  })
  @ApiQuery({
    name: 'all',
    required: false,
    type: String,
    example: 'false',
    description: 'Obtener todos sin paginación',
  })
  async getAllProducts(@Query() t: GetProductsDto): Promise<ResponseDto> {
    return await this.productsService.getAllProducts(t);
  }

  // set product as inactive
  /**
   * Marca como inactivos los productos con stock 0 y opcionalmente elimina notificaciones.
   */
  @Get('inactive')
  @ApiQuery({
    name: 'clearNotifications',
    description: 'Si es true, elimina todas las notificaciones',
    required: false,
    type: Boolean,
    example: false,
  })
  async setInactive(
    @Query('clearNotifications') clearNotifications?: boolean,
  ): Promise<ResponseDto> {
    return await this.productsService.setInactive(clearNotifications);
  }

  // get inventory resume

  /**
   * Obtiene un resumen del inventario (unidades, costo, venta, ganancia).
   */
  @Get('inventory')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getInventoryResume(): Promise<ResponseDto> {
    return await this.productsService.getInventoryResume();
  }
  //create a product
  /**
   * Crea un nuevo producto.
   */
  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Datos para crear producto',
    type: CreateProductDto,
    examples: {
      ejemplo: {
        summary: 'Producto básico',
        value: {
          descripcion: 'Laptop Lenovo',
          cod_interno: 'LEN123',
          cod_barras: '123456789',
          deprecado: false,
        },
      },
    },
  })
  async createProduct(@Body() t: CreateProductDto): Promise<ResponseDto> {
    return await this.productsService.createProduct(t);
  }

  //update a product
  /**
   * Actualiza un producto existente.
   */
  @Put()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Datos para actualizar producto',
    type: UpdateProductDto,
    examples: {
      ejemplo: {
        summary: 'Actualizar producto',
        value: {
          id: 1,
          descripcion: 'Laptop Lenovo X1',
          cod_interno: 'LEN123',
          cod_barras: '123456789',
          deprecado: false,
        },
      },
    },
  })
  async updateProduct(@Body() t: UpdateProductDto): Promise<ResponseDto> {
    return await this.productsService.updateProduct(t);
  }

  //get one product

  /**
   * Obtiene un producto por su id.
   */
  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'id',
    description: 'Id del producto',
    example: 1,
    type: Number,
  })
  async getOneProduct(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseDto> {
    return await this.productsService.getOneProduct(id);
  }
}
