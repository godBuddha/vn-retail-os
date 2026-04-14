import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus, StockMovementType, Role } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { MailLogService } from '../mail-log/mail-log.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private mailLogService: MailLogService,
  ) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, branchId, customerId, status, startDate, endDate, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (search) where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take: Number(limit),
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        shift: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payments: true,
        returns: { include: { items: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    return order;
  }

  async create(dto: any, userId: string) {
    const { items, payments, customerId, branchId, shiftId, couponCode, pointsRedeemed, note } = dto;

    if (!branchId) throw new BadRequestException('Vui lòng chọn chi nhánh');
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new BadRequestException('Chi nhánh không tồn tại');

    // Enrich items: fetch product info if name/salePrice missing
    const enrichedItems = await Promise.all(items.map(async (item: any) => {
      if (item.salePrice !== undefined && item.name) return item;
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, salePrice: true, costPrice: true, code: true },
      });
      return {
        ...item,
        name: item.name || product?.name || 'Sản phẩm',
        sku: item.sku || product?.code || '',
        salePrice: item.salePrice ?? Number(product?.salePrice ?? 0),
        costPrice: item.costPrice ?? Number(product?.costPrice ?? 0),
      };
    }));

    // Validate inventory
    for (const item of enrichedItems) {
      const inv = await this.prisma.inventory.findFirst({
        where: { branchId, productId: item.productId, variantId: item.variantId || null },
      });
      if (!inv || inv.quantity < item.quantity) {
        throw new BadRequestException(`Sản phẩm "${item.name}" không đủ số lượng tồn kho`);
      }
    }

    const code = `DH${Date.now()}`;
    const subtotal = enrichedItems.reduce((sum: number, i: any) => sum + Number(i.salePrice) * i.quantity, 0);
    const discountAmount = Number(dto.discountAmount || 0);
    const taxAmount = Number(dto.taxAmount || 0);
    const total = subtotal - discountAmount + taxAmount;
    // Handle paymentMethod shorthand (from POS)
    const paymentMethod = dto.paymentMethod; // e.g. 'CASH'
    const amountPaid = dto.amountPaid ?? 0;
    const paidAmount = payments?.reduce((s: number, p: any) => s + p.amount, 0) || amountPaid || 0;

    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          code, branchId, customerId: customerId || null, shiftId: shiftId || null, note, couponCode,
          subtotal, discountAmount, taxAmount, total, paidAmount,
          changeAmount: Math.max(0, paidAmount - total),
          paymentStatus: paidAmount >= total ? PaymentStatus.PAID : paidAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING,
          status: OrderStatus.COMPLETED,
          createdById: userId,
          items: {
            create: enrichedItems.map((i: any) => ({
              productId: i.productId, variantId: i.variantId || null,
              name: i.name, sku: i.sku || '', quantity: i.quantity,
              costPrice: Number(i.costPrice || 0), salePrice: Number(i.salePrice),
              discount: Number(i.discount || 0),
              total: (Number(i.salePrice) - Number(i.discount || 0)) * i.quantity,
            })),
          },
          payments: payments?.length ? {
            create: payments.map((p: any) => ({
              method: p.method, amount: p.amount,
              status: PaymentStatus.PAID, paidAt: new Date(),
            })),
          } : (paymentMethod ? {
            create: [{ method: paymentMethod, amount: paidAmount, status: PaymentStatus.PAID, paidAt: new Date() }],
          } : undefined),
        },
        include: { items: true, payments: true, customer: true },
      });

      // Deduct inventory
      for (const item of enrichedItems) {
        await tx.inventory.updateMany({
          where: { branchId, productId: item.productId, variantId: item.variantId || null },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            branchId, productId: item.productId, variantId: item.variantId || null,
            type: StockMovementType.SALE_OUT, quantity: item.quantity,
            referenceId: order.id, referenceType: 'ORDER', userId,
          },
        });
      }

      // Handle customer points
      if (customerId) {
        const pointsEarned = Math.floor(total / 10000); // 1 point per 10,000 VND
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalSpent: { increment: total },
            totalOrders: { increment: 1 },
            points: { increment: pointsEarned - (pointsRedeemed || 0) },
          },
        });
        if (pointsEarned > 0) {
          await tx.pointTransaction.create({
            data: { customerId, points: pointsEarned, type: 'EARN', referenceId: order.id },
          });
        }
        if (pointsRedeemed > 0) {
          await tx.pointTransaction.create({
            data: { customerId, points: -pointsRedeemed, type: 'REDEEM', referenceId: order.id },
          });
        }
        await tx.order.update({ where: { id: order.id }, data: { pointsEarned } });
      }
      return order;
    });

    // Fire and forget: send email + log it
    const customerEmail = order.customer?.email;
    if (customerEmail) {
      this.mailService.sendOrderReceipt(order, order.customer)
        .then(() => this.mailLogService.logEmail({
          to: [customerEmail],
          subject: `Hóa Đơn Cảm Ơn Khách Hàng - Đơn ${order.code}`,
          bodyHtml: `<p>Hóa đơn đơn hàng <strong>${order.code}</strong> đã gửi thành công.</p>`,
          type: 'ORDER_RECEIPT' as any,
          status: 'SENT' as any,
          relatedId: order.id,
        }))
        .catch(err => console.error('Email send/log failed:', err));
    }

    return order;
  }

  async refund(orderId: string, dto: any, userId: string) {
    const order = await this.findOne(orderId);
    if (order.status === OrderStatus.REFUNDED) throw new BadRequestException('Đơn hàng đã được hoàn trả');

    await this.prisma.$transaction(async (tx) => {
      await tx.orderReturn.create({
        data: {
          orderId, reason: dto.reason, refundAmount: dto.refundAmount, note: dto.note,
          items: { create: dto.items || [] },
        },
      });
      await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.REFUNDED } });
      // Return to inventory
      if (dto.items) {
        for (const item of dto.items) {
          await tx.inventory.updateMany({
            where: { branchId: order.branchId, productId: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              branchId: order.branchId, productId: item.productId,
              type: StockMovementType.RETURN_IN, quantity: item.quantity,
              referenceId: orderId, referenceType: 'ORDER', userId,
            },
          });
        }
      }
    });
    return { message: 'Hoàn trả đơn hàng thành công' };
  }

  // Shift management
  async openShift(dto: { branchId: string; openingCash: number }, userId: string) {
    const existing = await this.prisma.shift.findFirst({
      where: { branchId: dto.branchId, openedById: userId, status: 'OPEN' },
    });
    if (existing) throw new BadRequestException('Ca làm việc đã được mở');
    return this.prisma.shift.create({
      data: { branchId: dto.branchId, openedById: userId, openingCash: dto.openingCash, status: 'OPEN' },
    });
  }

  async closeShift(shiftId: string, dto: { actualCash: number; note?: string }) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status !== 'OPEN') throw new NotFoundException('Ca làm việc không tồn tại hoặc đã đóng');
    const orders = await this.prisma.order.aggregate({
      where: { shiftId, status: OrderStatus.COMPLETED },
      _sum: { total: true },
    });
    return this.prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'CLOSED', closedAt: new Date(), closingCash: dto.actualCash, note: dto.note },
    });
  }

  async getDailySummary(branchId: string, date?: string) {
    const day = date ? new Date(date) : new Date();
    const start = new Date(day.setHours(0, 0, 0, 0));
    const end = new Date(day.setHours(23, 59, 59, 999));
    const [orders, revenue, topProducts] = await Promise.all([
      this.prisma.order.count({ where: { branchId, createdAt: { gte: start, lte: end }, status: OrderStatus.COMPLETED } }),
      this.prisma.order.aggregate({
        where: { branchId, createdAt: { gte: start, lte: end }, status: OrderStatus.COMPLETED },
        _sum: { total: true, discountAmount: true },
        _avg: { total: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { branchId, createdAt: { gte: start, lte: end }, status: OrderStatus.COMPLETED } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);
    return { orders, revenue: revenue._sum.total || 0, avgOrderValue: revenue._avg.total || 0, topProducts };
  }

  async getWeeklyRevenue(branchId: string, days: number = 7) {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      const [agg, count] = await Promise.all([
        this.prisma.order.aggregate({
          where: { branchId, createdAt: { gte: start, lte: end }, status: OrderStatus.COMPLETED },
          _sum: { total: true },
        }),
        this.prisma.order.count({
          where: { branchId, createdAt: { gte: start, lte: end }, status: OrderStatus.COMPLETED },
        }),
      ]);
      result.push({
        date: start.toISOString().split('T')[0],
        label: start.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' }),
        revenue: Number(agg._sum.total || 0),
        orders: count,
      });
    }
    return result;
  }

  async bulkUpdateStatus(ids: string[], status: string) {
    if (!ids || ids.length === 0) throw new BadRequestException('Không có đơn hàng nào được chọn');
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) throw new BadRequestException('Trạng thái không hợp lệ');

    const result = await this.prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status: status as any },
    });
    return { updated: result.count, message: `Đã cập nhật ${result.count} đơn hàng` };
  }
}


