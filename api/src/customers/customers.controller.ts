import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()       findAll(@Query() q: any) { return this.customersService.findAll(q); }
  @Get('stats') getStats() { return this.customersService.getStats(); }
  @Get(':id')  findOne(@Param('id') id: string) { return this.customersService.findOne(id); }
  @Post()      create(@Body() dto: any) { return this.customersService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.customersService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.customersService.remove(id); }
}
