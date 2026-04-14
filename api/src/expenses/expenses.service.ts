import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: any) {
    const { branchId, startDate, endDate, type, limit = 100 } = q;
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        take: Number(limit),
        include: { category: true },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, total };
  }

  async create(dto: any) {
    return this.prisma.expense.create({
      data: {
        branchId: dto.branchId,
        type: dto.type || 'EXPENSE',
        amount: dto.amount,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });
  }

  async update(id: string, dto: any) {
    return this.prisma.expense.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
