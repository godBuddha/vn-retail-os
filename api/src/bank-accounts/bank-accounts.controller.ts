import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BankAccountsService } from './bank-accounts.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  findAll(@Query('branchId') branchId: string, @Request() req: any) {
    const bid = branchId || req.user.currentBranchId;
    return this.bankAccountsService.findAll(bid);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER')
  create(@Body() body: any, @Request() req: any) {
    return this.bankAccountsService.create({
      ...body,
      branchId: body.branchId || req.user.currentBranchId,
    });
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.bankAccountsService.update(id, body.branchId || req.user.currentBranchId, body);
  }

  @Post(':id/upload-qr')
  @Roles('SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads', 'qr'),
      filename: (req, file, cb) => {
        cb(null, `qr-${Date.now()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 3 * 1024 * 1024 },
  }))
  async uploadQr(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    const qrImageUrl = `/uploads/qr/${file.filename}`;
    return this.bankAccountsService.updateQrImage(id, req.user.currentBranchId, qrImageUrl);
  }

  @Post(':id/set-default')
  @Roles('SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER')
  @HttpCode(200)
  setDefault(@Param('id') id: string, @Request() req: any) {
    return this.bankAccountsService.setDefault(id, req.user.currentBranchId);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.bankAccountsService.remove(id, req.user.currentBranchId);
  }
}
