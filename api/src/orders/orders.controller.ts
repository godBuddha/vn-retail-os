import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get() findAll(@Query() q: any) { return this.ordersService.findAll(q); }
  @Get('daily-summary') summary(@Query('branchId') bid: string, @Query('date') date?: string) {
    return this.ordersService.getDailySummary(bid, date);
  }
  @Get('weekly-revenue') weeklyRevenue(@Query('branchId') bid: string, @Query('days') days?: string) {
    return this.ordersService.getWeeklyRevenue(bid, Number(days) || 7);
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.ordersService.findOne(id); }
  @Post() create(@Body() dto: any, @CurrentUser() user: any) { return this.ordersService.create(dto, user.id); }
  @Post(':id/refund') refund(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.ordersService.refund(id, dto, user.id);
  }
  @Post('shifts/open') openShift(@Body() dto: any, @CurrentUser() user: any) {
    return this.ordersService.openShift(dto, user.id);
  }
  @Post('shifts/:id/close') closeShift(@Param('id') id: string, @Body() dto: any) {
    return this.ordersService.closeShift(id, dto);
  }
  @Patch('bulk-status') bulkUpdateStatus(@Body() body: { ids: string[]; status: string }) {
    return this.ordersService.bulkUpdateStatus(body.ids, body.status);
  }
}
