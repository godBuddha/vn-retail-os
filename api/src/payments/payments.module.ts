import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VnpayService } from './vnpay.service';
import { MomoService } from './momo.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';

@Module({
  imports: [PrismaModule, BankAccountsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, VnpayService, MomoService],
  exports: [PaymentsService, VnpayService, MomoService],
})
export class PaymentsModule {}
