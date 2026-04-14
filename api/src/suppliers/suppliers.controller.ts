import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()       findAll(@Query() q: any) { return this.suppliersService.findAll(q); }
  @Get(':id')  findOne(@Param('id') id: string) { return this.suppliersService.findOne(id); }
  @Post()      create(@Body() dto: any) { return this.suppliersService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.suppliersService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.suppliersService.remove(id); }
}
