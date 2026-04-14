import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('purchasing')
@UseGuards(JwtAuthGuard)
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  @Get()           findAll(@Query() q: any) { return this.purchasingService.findAll(q); }
  @Get(':id')      findOne(@Param('id') id: string) { return this.purchasingService.findOne(id); }
  @Post()          create(@Body() dto: any) { return this.purchasingService.create(dto); }
  @Post(':id/receive') receiveGoods(@Param('id') id: string, @Body() dto: any) {
    return this.purchasingService.receiveGoods(id, dto);
  }
  @Patch(':id/status') updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.purchasingService.updateStatus(id, body.status);
  }
  @Delete(':id')   remove(@Param('id') id: string) { return this.purchasingService.remove(id); }
}
