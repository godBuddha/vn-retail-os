import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BankAccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.bankAccount.findMany({
      where: { branchId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findDefault(branchId: string) {
    return this.prisma.bankAccount.findFirst({
      where: { branchId, isDefault: true, isActive: true },
    });
  }

  async create(data: {
    branchId: string;
    bankName: string;
    bankCode?: string;
    accountNumber: string;
    accountName: string;
    notes?: string;
  }) {
    // First account is default
    const count = await this.prisma.bankAccount.count({ where: { branchId: data.branchId } });
    const bankCode = data.bankCode || data.bankName.toUpperCase().replace(/\s+/g, '').substring(0, 10);
    return this.prisma.bankAccount.create({
      data: { ...data, bankCode, isDefault: count === 0 },
    });
  }


  async update(id: string, branchId: string, data: {
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    qrImageUrl?: string;
    notes?: string;
    isActive?: boolean;
  }) {
    await this.checkOwnership(id, branchId);
    return this.prisma.bankAccount.update({ where: { id }, data });
  }

  async updateQrImage(id: string, branchId: string, qrImageUrl: string) {
    await this.checkOwnership(id, branchId);
    return this.prisma.bankAccount.update({ where: { id }, data: { qrImageUrl } });
  }

  async setDefault(id: string, branchId: string) {
    await this.checkOwnership(id, branchId);
    await this.prisma.bankAccount.updateMany({
      where: { branchId },
      data: { isDefault: false },
    });
    return this.prisma.bankAccount.update({ where: { id }, data: { isDefault: true } });
  }

  async remove(id: string, branchId: string) {
    await this.checkOwnership(id, branchId);
    return this.prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
  }

  private async checkOwnership(id: string, branchId: string | null | undefined) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Tài khoản không tồn tại');
    // SUPER_ADMIN has no branchId — allow all access
    if (branchId && account.branchId !== branchId) throw new ForbiddenException('Không có quyền');
    return account;
  }

}
