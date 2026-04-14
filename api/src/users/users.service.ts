import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number; limit?: number; search?: string; role?: Role; branchId?: string; isActive?: boolean;
  }) {
    const { page = 1, limit = 20, search, role, branchId, isActive } = query;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (branchId) where.userBranches = { some: { branchId } };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: limit,
        select: {
          id: true, email: true, phone: true, firstName: true, lastName: true,
          avatar: true, role: true, isActive: true, lastLoginAt: true, createdAt: true,
          userBranches: { include: { branch: { select: { id: true, name: true, code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        avatar: true, role: true, isActive: true, language: true, lastLoginAt: true, createdAt: true,
        userBranches: { include: { branch: true } },
        employee: true,
      },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  async create(dto: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã được sử dụng');
    const password = await bcrypt.hash(dto.password || 'changeme123', 12);
    const { branchIds, ...rest } = dto;
    const user = await this.prisma.user.create({
      data: {
        ...rest, password,
        userBranches: branchIds?.length
          ? { create: branchIds.map((id: string, idx: number) => ({ branchId: id, isPrimary: idx === 0 })) }
          : undefined,
      },
      include: { userBranches: { include: { branch: true } } },
    });
    const { password: _, ...safe } = user;
    return safe;
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const { branchIds, password, ...rest } = dto;
    const data: any = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 12);
    if (branchIds !== undefined) {
      await this.prisma.userBranch.deleteMany({ where: { userId: id } });
      if (branchIds.length) {
        await this.prisma.userBranch.createMany({
          data: branchIds.map((bid: string, idx: number) => ({ userId: id, branchId: bid, isPrimary: idx === 0 })),
        });
      }
    }
    const user = await this.prisma.user.update({
      where: { id }, data,
      include: { userBranches: { include: { branch: true } } },
    });
    const { password: _, ...safe } = user;
    return safe;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Xóa người dùng thành công' };
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id);
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });
    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
