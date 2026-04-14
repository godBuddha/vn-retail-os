import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EmailType, EmailStatus } from '@prisma/client';

@Injectable()
export class MailLogService {
  private readonly logger = new Logger(MailLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MailService))
    private readonly mailService: MailService,
  ) {}

  async findAll(opts: {
    folder?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { folder = 'sent', type, search, page = 1, limit = 30 } = opts;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (!type || !Object.values(EmailType).includes(type as EmailType)) {
      switch (folder) {
        case 'inbox':
          where.type = EmailType.INBOUND;
          where.isDeleted = false;
          where.isSpam = false;
          break;
        case 'starred':
          where.isStarred = true;
          where.isDeleted = false;
          break;
        case 'trash':
          where.isDeleted = true;
          break;
        case 'spam':
          where.isSpam = true;
          where.isDeleted = false;
          break;
        default: // sent
          where.type = { not: EmailType.INBOUND };
          where.isDeleted = false;
          where.isSpam = false;
          break;
      }
    }

    if (type && Object.values(EmailType).includes(type as EmailType)) {
      where.type = type;
      where.isDeleted = false;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, from: true, to: true, subject: true, type: true,
          status: true, isRead: true, isStarred: true, isDeleted: true,
          isSpam: true, relatedId: true, createdAt: true, bodyHtml: true,
        },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    const dataWithPreview = data.map((item) => {
      const preview = item.bodyHtml?.replace(/<[^>]*>/g, '').slice(0, 120) || '';
      const { bodyHtml: _, ...rest } = item;
      return { ...rest, preview };
    });

    return {
      data: dataWithPreview,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async findOne(id: string) {
    const email = await this.prisma.emailLog.findUnique({ where: { id } });
    if (!email) throw new NotFoundException('Email không tồn tại');
    if (!email.isRead) {
      await this.prisma.emailLog.update({ where: { id }, data: { isRead: true } });
    }
    return email;
  }

  async getStats() {
    const [inbox, sent, starred, trash, spam, unread, orderReceipt, dailyReport, lowStock] =
      await Promise.all([
        this.prisma.emailLog.count({ where: { type: 'INBOUND', isDeleted: false, isSpam: false } }),
        this.prisma.emailLog.count({ where: { type: { not: 'INBOUND' }, isDeleted: false, isSpam: false } }),
        this.prisma.emailLog.count({ where: { isStarred: true, isDeleted: false } }),
        this.prisma.emailLog.count({ where: { isDeleted: true } }),
        this.prisma.emailLog.count({ where: { isSpam: true, isDeleted: false } }),
        this.prisma.emailLog.count({ where: { isRead: false, isDeleted: false, isSpam: false } }),
        this.prisma.emailLog.count({ where: { type: 'ORDER_RECEIPT', isDeleted: false } }),
        this.prisma.emailLog.count({ where: { type: 'DAILY_REPORT', isDeleted: false } }),
        this.prisma.emailLog.count({ where: { type: 'LOW_STOCK_ALERT', isDeleted: false } }),
      ]);
    return { inbox, sent, starred, trash, spam, unread, orderReceipt, dailyReport, lowStock };
  }

  async star(id: string) {
    const email = await this.prisma.emailLog.findUnique({ where: { id }, select: { isStarred: true } });
    if (!email) throw new NotFoundException();
    return this.prisma.emailLog.update({ where: { id }, data: { isStarred: !email.isStarred } });
  }

  async markDeleted(id: string) {
    return this.prisma.emailLog.update({ where: { id }, data: { isDeleted: true } });
  }

  async markSpam(id: string) {
    return this.prisma.emailLog.update({ where: { id }, data: { isSpam: true, isRead: true } });
  }

  async restore(id: string) {
    return this.prisma.emailLog.update({ where: { id }, data: { isDeleted: false, isSpam: false } });
  }

  /**
   * Compose and send a custom email, then log it
   */
  async compose(to: string[], subject: string, bodyHtml: string) {
    let resendId: string | undefined;
    let status: EmailStatus = EmailStatus.SENT;
    try {
      const result = await this.mailService.sendRaw({ to, subject, html: bodyHtml });
      resendId = (result as any)?.id;
    } catch (err) {
      this.logger.error('Compose email failed', err);
      status = EmailStatus.FAILED;
    }
    return this.logEmail({ to, subject, bodyHtml, type: EmailType.CUSTOM, status, resendId });
  }

  /**
   * Log a sent email to DB (called from MailService after sending)
   */
  async logEmail(data: {
    resendId?: string;
    from?: string;
    to: string[];
    subject: string;
    bodyHtml: string;
    type?: EmailType;
    status?: EmailStatus;
    relatedId?: string;
  }) {
    return this.prisma.emailLog.create({
      data: {
        resendId: data.resendId,
        from: data.from || 'system@retail.vn',
        to: data.to,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        type: data.type || EmailType.CUSTOM,
        status: data.status || EmailStatus.SENT,
        relatedId: data.relatedId,
      },
    });
  }

  /**
   * Handle Resend webhook events
   */
  async handleWebhook(payload: any) {
    const { type, data: eventData } = payload;
    if (!eventData?.email_id) return { ok: true };

    const emailLog = await this.prisma.emailLog.findFirst({
      where: { resendId: eventData.email_id },
    });
    if (!emailLog) return { ok: true };

    let status: EmailStatus | undefined;
    if (type === 'email.opened') status = EmailStatus.OPENED;
    if (type === 'email.bounced') status = EmailStatus.BOUNCED;
    if (type === 'email.delivery_delayed') status = EmailStatus.PENDING;

    if (status) {
      await this.prisma.emailLog.update({ where: { id: emailLog.id }, data: { status } });
    }
    return { ok: true };
  }
}
