import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search, tier, isActive } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
    if (tier) where.tier = tier;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where, skip, take: Number(limit),
        orderBy: { totalSpent: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id, deletedAt: null },
      include: {
        orders: { take: 10, orderBy: { createdAt: 'desc' }, include: { branch: { select: { name: true } } } },
        pointTransactions: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    return customer;
  }

  async create(dto: any) {
    const code = dto.code || `KH${Date.now()}`;
    return this.prisma.customer.create({ data: { ...dto, code } });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Xóa khách hàng thành công' };
  }

  async getStats() {
    const [total, tiers, topCustomers] = await Promise.all([
      this.prisma.customer.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.customer.groupBy({ by: ['tier'], where: { deletedAt: null }, _count: true }),
      this.prisma.customer.findMany({
        where: { deletedAt: null },
        orderBy: { totalSpent: 'desc' },
        take: 5,
        select: { id: true, code: true, name: true, phone: true, tier: true, totalSpent: true, totalOrders: true, points: true },
      }),
    ]);
    return { total, tiers, topCustomers };
  }
}
