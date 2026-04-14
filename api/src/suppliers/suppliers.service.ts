import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where, skip, take: Number(limit),
        include: { _count: { select: { purchaseOrders: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id, deletedAt: null },
      include: {
        purchaseOrders: { take: 10, orderBy: { createdAt: 'desc' }, include: { branch: { select: { name: true } } } },
      },
    });
    if (!supplier) throw new NotFoundException('Nhà cung cấp không tồn tại');
    return supplier;
  }

  async create(dto: any) {
    const code = dto.code || `NCC${Date.now()}`;
    return this.prisma.supplier.create({ data: { ...dto, code } });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Xóa nhà cung cấp thành công' };
  }
}
