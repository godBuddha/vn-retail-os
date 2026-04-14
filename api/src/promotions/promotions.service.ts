import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { search, isActive, limit = 50 } = query;
    const where: any = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const data = await this.prisma.promotion.findMany({
      where, take: Number(limit), orderBy: { createdAt: 'desc' },
    });
    return { data, total: data.length };
  }


  async create(dto: any) {
    // Map frontend field names to schema field names
    const { startDate, endDate, startAt, endAt, ...rest } = dto;
    return this.prisma.promotion.create({
      data: {
        ...rest,
        startAt: startAt || (startDate ? new Date(startDate) : undefined),
        endAt: endAt || (endDate ? new Date(endDate) : undefined),
      },
    });
  }


  async update(id: string, dto: any) {
    return this.prisma.promotion.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.promotion.delete({ where: { id } });
    return { message: 'Đã xóa khuyến mãi' };
  }

  async validate(code: string, orderAmount: number) {
    const promo = await this.prisma.promotion.findUnique({ where: { code } });
    if (!promo || !promo.isActive) throw new NotFoundException('Mã khuyến mãi không hợp lệ');
    const now = new Date();
    if (promo.startAt && promo.startAt > now) throw new NotFoundException('Khuyến mãi chưa bắt đầu');
    if (promo.endAt && promo.endAt < now) throw new NotFoundException('Khuyến mãi đã hết hạn');
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) throw new NotFoundException('Khuyến mãi đã hết lượt dùng');
    if (promo.minOrderAmount && orderAmount < Number(promo.minOrderAmount)) {
      throw new NotFoundException(`Đơn hàng tối thiểu ${promo.minOrderAmount}đ`);
    }
    let discount = 0;
    if (promo.type === 'PERCENTAGE') {
      discount = orderAmount * (Number(promo.value) / 100);
      if (promo.maxDiscount) discount = Math.min(discount, Number(promo.maxDiscount));
    } else if ((promo.type as string) === 'FIXED_AMOUNT' || (promo.type as string) === 'FIXED') {
      discount = Number(promo.value);
    }
    return {
      id: promo.id,
      code: promo.code,
      name: promo.name,
      type: promo.type,
      value: Number(promo.value),
      maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
      minOrderAmount: promo.minOrderAmount ? Number(promo.minOrderAmount) : null,
      discount,
    };
  }
}
