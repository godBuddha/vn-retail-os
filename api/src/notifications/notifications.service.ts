import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly db: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    this.db = this.prisma as any;
  }

  // Báo cáo cuối ngày lúc 23:00 hàng ngày
  @Cron('0 23 * * *', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async sendDailyReportTask() {
    this.logger.log('Bắt đầu cron job: Báo cáo kinh doanh cuối ngày (23:00)');
    try {
      const prefs = await this.db.notificationPreference?.findMany({
        where: { emailDailyReport: true },
        include: { user: true },
      }) ?? [];

      if (prefs.length === 0) return;

      const emails = prefs.map((p: any) => p.user.email);
      
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const [ordersInfo, customersCount] = await Promise.all([
        this.prisma.order.aggregate({
          where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
          _count: { id: true },
          _sum: { total: true },
        }),
        this.prisma.customer.count({
          where: { createdAt: { gte: start, lte: end } }
        }),
      ]);

      const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

      const html = `
        <div style="font-family: Arial, sans-serif; p-4">
          <h2 style="color: #1e40af">Báo Cáo Hoạt Động Bán Hàng - ${start.toLocaleDateString('vi-VN')}</h2>
          <p>Kính gửi quản lý,</p>
          <p>Hệ thống xin gửi tóm tắt hoạt động bán hàng trong ngày hôm nay:</p>
          <ul>
            <li><strong>Tổng doanh thu:</strong> <span style="color:red; font-size: 18px">${formatVND(Number(ordersInfo._sum.total || 0))}</span></li>
            <li><strong>Số lượng đơn thành công:</strong> ${ordersInfo._count.id} đơn</li>
            <li><strong>Khách hàng mới:</strong> ${customersCount}</li>
          </ul>
          <hr />
          <p>Xem chi tiết tại <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Trang quản trị VN Retail OS</a>.</p>
        </div>
      `;

      await this.mailService.sendDailyReport(emails, html);
      this.logger.log(`Gửi báo cáo cuối ngày thành công tới ${emails.length} người quản lý.`);
    } catch (e) {
      this.logger.error('Lỗi cron job báo cáo cuối ngày', e);
    }
  }

  // Cảnh báo tồn kho cực thấp (mỗi giờ)
  @Cron(CronExpression.EVERY_HOUR)
  async alertLowStockTask() {
    this.logger.log('Bắt đầu cron job: Kiểm tra tồn kho hàng giờ');
    try {
      const allInventory = await this.prisma.inventory.findMany({
        include: { product: true, branch: true },
      });

      const lowStockItems = allInventory.filter(
        (inv: any) => Number(inv.quantity) <= Number(inv.product.minStock)
      );

      if (lowStockItems.length === 0) return;

      const prefs = await this.db.notificationPreference?.findMany({
        where: { emailLowStock: true },
        include: { user: true },
      }) ?? [];

      const emailsToAlert = prefs.map((p: any) => p.user.email);
      if (emailsToAlert.length > 0) {
        await this.mailService.sendLowStockAlert(lowStockItems, emailsToAlert);
        this.logger.log(`Gửi cảnh báo tồn kho thành công tới ${emailsToAlert.length} người quản lý (${lowStockItems.length} mặt hàng).`);
      }

      const pushPrefs = await this.db.notificationPreference?.findMany({
        where: { pushLowStock: true },
      }) ?? [];

      if (pushPrefs.length > 0) {
        const notis = pushPrefs.map((pref: any) => ({
          userId: pref.userId,
          type: 'LOW_STOCK',
          title: 'Cảnh Báo Hết Hàng',
          body: `Có ${lowStockItems.length} mặt hàng đang dưới định mức an toàn. Cần nhập thêm!`,
        }));
        await this.db.notification?.createMany({ data: notis });
      }

    } catch (e) {
      this.logger.error('Lỗi cron job cảnh báo tồn kho', e);
    }
  }

  async getMyNotifications(userId: string) {
    return this.db.notification?.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }) ?? [];
  }

  async getUnreadCount(userId: string) {
    return this.db.notification?.count({
      where: { userId, isRead: false },
    }) ?? 0;
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.db.notification?.update({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.db.notification?.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
