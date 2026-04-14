import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()        findAll(@Query() q: any) { return this.branchesService.findAll(q); }
  @Get(':id')   findOne(@Param('id') id: string) { return this.branchesService.findOne(id); }
  @Post()       create(@Body() dto: any) { return this.branchesService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.branchesService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.branchesService.remove(id); }
}
