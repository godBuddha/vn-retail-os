import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { MailModule } from './mail/mail.module';
import { UploadModule } from './upload/upload.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { PaymentsModule } from './payments/payments.module';
import { CustomersModule } from './customers/customers.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PromotionsModule } from './promotions/promotions.module';
import { EmployeesModule } from './employees/employees.module';
import { BranchesModule } from './branches/branches.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ShiftsModule } from './shifts/shifts.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MailLogModule } from './mail-log/mail-log.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    UploadModule,
    BankAccountsModule,
    PaymentsModule,
    CustomersModule,
    InventoryModule,
    SuppliersModule,
    PromotionsModule,
    EmployeesModule,
    BranchesModule,
    PurchasingModule,
    ExpensesModule,
    ShiftsModule,
    SettingsModule,
    NotificationsModule,
    MailLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
