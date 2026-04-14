import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async getCurrentShift(branchId: string) {
    const shift = await (this.prisma as any).shift?.findFirst({
      where: { branchId, status: 'OPEN' },
      include: {
        openedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { openedAt: 'desc' },
    }).catch(() => null);

    if (!shift) return null;

    // Aggregate sales in this shift
    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        createdAt: { gte: shift.openedAt },
        paymentStatus: 'PAID',
      },
      include: { payments: { select: { method: true, amount: true } } },
    });

    const totalSales = orders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const totalOrders = orders.length;
    const cashSales = orders.reduce((s: number, o: any) => {
      const cashPay = o.payments.filter((p: any) => p.method === 'CASH')
        .reduce((ps: number, p: any) => ps + Number(p.amount), 0);
      return s + cashPay;
    }, 0);
    const transferSales = totalSales - cashSales;

    return { ...shift, totalSales, totalOrders, cashSales, transferSales };
  }

  async openShift(userId: string, branchId: string, openingCash: number) {
    // Check no open shift
    const existing = await (this.prisma as any).shift?.findFirst({
      where: { branchId, status: 'OPEN' },
    }).catch(() => null);

    if (existing) {
      throw new BadRequestException('Đã có ca đang mở. Vui lòng đóng ca hiện tại trước.');
    }

    const shift = await (this.prisma as any).shift?.create({
      data: {
        branchId,
        openedById: userId,
        openingCash,
        status: 'OPEN',
        openedAt: new Date(),
      },
      include: {
        openedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return shift;
  }

  async closeShift(userId: string, branchId: string, closingCash: number, note?: string) {
    const shift = await (this.prisma as any).shift?.findFirst({
      where: { branchId, status: 'OPEN' },
    }).catch(() => null);

    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca đang mở');
    }

    // Aggregate final stats
    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        createdAt: { gte: shift.openedAt },
        paymentStatus: 'PAID',
      },
      include: { payments: { select: { method: true, amount: true } } },
    });

    const totalSales = orders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const totalOrders = orders.length;
    const cashSales = orders.reduce((s: number, o: any) => {
      return s + o.payments.filter((p: any) => p.method === 'CASH')
        .reduce((ps: number, p: any) => ps + Number(p.amount), 0);
    }, 0);

    const closed = await (this.prisma as any).shift?.update({
      where: { id: shift.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: userId,
        closingCash,
        totalSales,
        totalOrders,
        cashSales,
        note,
      },
      include: {
        openedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return closed;
  }

  async getShifts(branchId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).shift?.findMany({
        where: { branchId },
        include: {
          openedBy: { select: { firstName: true, lastName: true } },
          closedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
      }).catch(() => []),
      (this.prisma as any).shift?.count({ where: { branchId } }).catch(() => 0),
    ]);
    return { data: data || [], total: total || 0 };
  }
}
