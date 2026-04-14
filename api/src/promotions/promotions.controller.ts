import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()        findAll(@Query() q: any) { return this.promotionsService.findAll(q); }

  // GET validate must come before generic :id routes
  @Get('validate/:code')
  validateGet(@Param('code') code: string, @Query('orderAmount') orderAmount: string) {
    return this.promotionsService.validate(code, Number(orderAmount) || 0);
  }

  // POST validate (legacy)
  @Post('validate') validate(@Body() body: { code: string; orderAmount: number }) {
    return this.promotionsService.validate(body.code, body.orderAmount);
  }

  @Post()       create(@Body() dto: any) { return this.promotionsService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.promotionsService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.promotionsService.remove(id); }
}
