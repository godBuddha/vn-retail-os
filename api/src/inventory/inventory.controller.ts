import { Controller, Patch, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Patch(':productId/adjust')
  adjust(@Param('productId') productId: string, @Body() dto: any) {
    return this.inventoryService.adjust(productId, dto);
  }

  @Get('movements')
  getMovements(@Query('branchId') branchId: string, @Query('productId') productId?: string) {
    return this.inventoryService.getMovements(branchId, productId);
  }
}
