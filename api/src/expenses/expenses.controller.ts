import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()    findAll(@Query() q: any) { return this.expensesService.findAll(q); }
  @Post()   create(@Body() dto: any) { return this.expensesService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.expensesService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.expensesService.remove(id); }
}
