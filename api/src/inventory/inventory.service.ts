import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async adjust(productId: string, dto: {
    branchId: string;
    quantity: number;
    note?: string;
    type?: string;
  }) {
    const { branchId, quantity, note, type = 'ADJUSTMENT_IN' } = dto;

    // Find existing inventory record (variantId = null)
    const existing = await this.prisma.inventory.findFirst({
      where: { branchId, productId, variantId: null },
    });

    let inv: any;
    if (existing) {
      inv = await this.prisma.inventory.update({
        where: { id: existing.id },
        data: { quantity },
      });
    } else {
      inv = await this.prisma.inventory.create({
        data: { branchId, productId, quantity },
      });
    }

    // Log movement
    try {
      await this.prisma.stockMovement.create({
        data: {
          branchId,
          productId,
          type: type as any,
          quantity: Math.abs(quantity - (existing ? Number(existing.quantity) : 0)) || quantity,
          note,
          referenceType: 'ADJUSTMENT',
        },
      });
    } catch (_) {
      // Movement log failure shouldn't break the adjustment
    }

    return { success: true, inventory: inv };
  }

  async getMovements(branchId: string, productId?: string) {
    return this.prisma.stockMovement.findMany({
      where: {
        branchId,
        ...(productId && { productId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
