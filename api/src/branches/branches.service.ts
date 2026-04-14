import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { search, limit = 50 } = query;
    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
    const data = await this.prisma.branch.findMany({
      where, take: Number(limit),
      include: {
        _count: { select: { userBranches: true, inventory: true, orders: true, employees: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return { data, total: data.length };
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id, deletedAt: null },
      include: { _count: { select: { userBranches: true, orders: true, employees: true } } },
    });
    if (!branch) throw new NotFoundException('Chi nhánh không tồn tại');
    return branch;
  }

  async create(dto: any) {
    return this.prisma.branch.create({ data: dto });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.branch.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Đã xóa chi nhánh' };
  }
}
