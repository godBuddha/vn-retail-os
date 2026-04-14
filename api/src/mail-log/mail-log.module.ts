import { Module, forwardRef } from '@nestjs/common';
import { MailLogService } from './mail-log.service';
import { MailLogController } from './mail-log.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, forwardRef(() => MailModule)],
  controllers: [MailLogController],
  providers: [MailLogService],
  exports: [MailLogService],
})
export class MailLogModule {}
