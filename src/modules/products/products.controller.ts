import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Body,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@ApiTags('Products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  // get all products
  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllProducts(@Query() t: GetProductsDto) {
    return await this.productsService.getAllProducts(t);
  }

  // set product as inactive

  @Get('inactive')
  async setInactive() {
    return await this.productsService.setInactive();
  }

  // get inventory resume

  @Get('inventory')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getInventoryResume() {
    return await this.productsService.getInventoryResume();
  }
  //create a product
  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Create product',
    type: CreateProductDto,
  })
  async createProduct(@Body() t: CreateProductDto) {
    return await this.productsService.createProduct(t);
  }

  //update a product
  @Put()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Update product',
    type: UpdateProductDto,
  })
  async updateProduct(@Body() t: UpdateProductDto) {
    return await this.productsService.updateProduct(t);
  }

  //get one product

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'id',
    description: 'Id of the product',
    example: 1,
  })
  async getOneProduct(@Param() id: any) {
    return await this.productsService.getOneProduct(id.id);
  }
}
