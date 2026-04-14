import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search, status, branchId } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where, skip, take: Number(limit),
        include: { branch: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id, deletedAt: null },
      include: { branch: true, user: { select: { id: true, email: true, role: true } } },
    });
    if (!emp) throw new NotFoundException('Nhân viên không tồn tại');
    return emp;
  }

  async create(dto: any) {
    const code = dto.code || `NV${Date.now()}`;
    return this.prisma.employee.create({ data: { ...dto, code } });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: 'TERMINATED' } });
    return { message: 'Đã xóa nhân viên' };
  }
}
