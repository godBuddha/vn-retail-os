import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()        findAll(@Query() q: any) { return this.employeesService.findAll(q); }
  @Get(':id')   findOne(@Param('id') id: string) { return this.employeesService.findOne(id); }
  @Post()       create(@Body() dto: any) { return this.employeesService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.employeesService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.employeesService.remove(id); }
}
