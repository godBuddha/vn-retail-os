import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasingService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search, status, branchId } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (search) where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where, skip, take: Number(limit),
        include: {
          supplier: { select: { id: true, name: true, code: true, phone: true } },
          branch: { select: { id: true, name: true, code: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        items: { include: { product: { select: { id: true, name: true, barcode: true } } } },
      },
    });
    if (!po) throw new NotFoundException('Phiếu nhập không tồn tại');
    return po;
  }

  async create(dto: any) {
    const { items, ...poData } = dto;
    const code = `PO${Date.now()}`;
    const subtotal = items?.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.unitCost)), 0) || 0;
    const total = subtotal + Number(poData.taxAmount || 0);

    return this.prisma.purchaseOrder.create({
      data: {
        ...poData, code, subtotal, total,
        items: items?.length ? {
          create: items.map((i: any) => ({
            productId: i.productId,
            variantId: i.variantId || null,
            quantity: Number(i.quantity),
            unitCost: Number(i.unitCost),
            total: Number(i.quantity) * Number(i.unitCost),
          })),
        } : undefined,
      },
      include: { supplier: true, branch: true, items: { include: { product: true } } },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    const data: any = { status };
    if (status === 'RECEIVED') data.receivedAt = new Date();
    return this.prisma.purchaseOrder.update({ where: { id }, data });
  }

  async receiveGoods(id: string, dto: { items?: { poItemId: string; receivedQty: number }[]; note?: string }) {
    const po = await this.findOne(id);
    if (!['CONFIRMED', 'SENT', 'PARTIAL_RECEIVED'].includes(po.status)) {
      throw new Error('Chỉ có thể nhận hàng với phiếu đã xác nhận');
    }

    // Update inventory for each item
    await this.prisma.$transaction(async (tx) => {
      for (const item of po.items as any[]) {
        const receivedQty = dto.items?.find((i: any) => i.poItemId === item.id)?.receivedQty ?? item.quantity;
        if (receivedQty <= 0) continue;

        // Upsert inventory
        const existing = await tx.inventory.findFirst({ where: { productId: item.productId, branchId: po.branchId } });
        if (existing) {
          await tx.inventory.update({
            where: { id: existing.id },
            data: { quantity: { increment: receivedQty } },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              branchId: po.branchId,
              quantity: receivedQty,
            },
          });
        }

        // Stock movement record
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            branchId: po.branchId,
            type: 'PURCHASE_IN',
            quantity: receivedQty,
            note: `Nhận hàng từ PO ${po.code}`,
            referenceId: po.id,
            referenceType: 'PurchaseOrder',
          },
        });
      }

      // Update PO status
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      });
    });

    return { message: 'Nhận hàng thành công, tồn kho đã được cập nhật' };
  }

  async remove(id: string) {
    const po = await this.findOne(id);
    if (!['DRAFT', 'CANCELLED'].includes(po.status)) {
      throw new Error('Chỉ có thể xóa phiếu ở trạng thái Nháp hoặc Đã hủy');
    }
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { message: 'Đã xóa phiếu nhập' };
  }
}

