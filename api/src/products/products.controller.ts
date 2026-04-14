import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get() findAll(@Query() q: any) { return this.productsService.findAll(q); }
  @Get('categories') getCategories() { return this.productsService.getCategories(); }
  @Get('units') getUnits() { return this.productsService.getUnits(); }
  @Get('barcode/:barcode') searchBarcode(@Param('barcode') b: string, @Query('branchId') bid?: string) {
    return this.productsService.searchByBarcode(b, bid);
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.productsService.findOne(id); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN, Role.MANAGER)
  create(@Body() dto: any) { return this.productsService.create(dto); }

  @Post('bulk-import')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  bulkImport(@Body() body: { products: any[] }) { return this.productsService.bulkImport(body.products); }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  createCategory(@Body() dto: any) { return this.productsService.createCategory(dto); }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: any) { return this.productsService.update(id, dto); }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  remove(@Param('id') id: string) { return this.productsService.remove(id); }
}
