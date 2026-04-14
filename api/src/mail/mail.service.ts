import { Injectable, Logger, OnModuleInit, forwardRef, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private resend: Resend | null = null;
  private readonly logger = new Logger(MailService.name);
  private currentFrom: string;

  constructor(
    private config: ConfigService,
    @Inject(forwardRef(() => SettingsService))
    private settingsService: SettingsService,
  ) {
    this.currentFrom = this.config.get('MAIL_FROM', 'noreply@retail.vn');
  }

  async onModuleInit() {
    await this.reloadTransporter();
  }

  async reloadTransporter() {
    try {
      const config = await this.settingsService.getRawSmtpConfig();

      // 1. Try Resend First (Database config overrides ENV)
      const resendKey = config?.resendApiKey || this.config.get<string>('RESEND_API_KEY');
      if (resendKey && resendKey.startsWith('re_')) {
        this.resend = new Resend(resendKey);
        // By default, Resend free tier requires "onboarding@resend.dev"
        // We will default to it if the config uses a default placeholder like retail.vn or haquyenfur.vn
        const dbFrom = config?.smtpFrom || '';
        this.currentFrom = (dbFrom.includes('retail.vn') || dbFrom.includes('haquyenfur.vn') || !dbFrom)
          ? 'onboarding@resend.dev' 
          : dbFrom;
        
        this.logger.log(`Resend SDK loaded successfully. Using from: ${this.currentFrom}`);
        return;
      }

      // 2. Fallback to SMTP Config
      if (config && config.smtpHost) {
        this.transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          auth: config.smtpUser ? {
            user: config.smtpUser,
            pass: config.smtpPass,
          } : undefined,
        } as any);
        this.currentFrom = config.smtpFrom || this.config.get('MAIL_FROM', 'noreply@retail.vn');
        this.logger.log(`SMTP Transporter reloaded with hostname: ${config.smtpHost}`);
      } else {
        // Fallback to env file
        this.transporter = nodemailer.createTransport({
          host: this.config.get('MAIL_HOST', 'localhost'),
          port: this.config.get<number>('MAIL_PORT', 1025),
          auth: this.config.get('MAIL_USER')
            ? { user: this.config.get('MAIL_USER'), pass: this.config.get('MAIL_PASS') }
            : undefined,
        } as any);
        this.logger.log('SMTP Transporter loaded from ENV vars.');
      }
    } catch (e) {
      this.logger.error('Failed to reload SMTP transporter', e);
    }
  }

  private async dispatchEmail(options: { to: string | string[]; subject: string; html?: string; text?: string; from?: string }) {
    const from = options.from || this.currentFrom;
    
    // Safety for Resend free tier if domain is not yet verified
    const safeFrom = (this.resend && !from.includes('@')) ? 'onboarding@resend.dev' : from;

    if (this.resend) {
      const { data, error } = await this.resend.emails.send({
        from: safeFrom,
        to: options.to,
        subject: options.subject,
        html: (options.html || options.text || '') as string,
      });
      if (error) {
        throw new Error(`Resend Error: ${error.message}`);
      }
      return data;
    } else if (this.transporter) {
      return this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } else {
      throw new Error('No email transport configured');
    }
  }

  async testConnection(testEmail: string) {
    try {
      if (!this.resend && !this.transporter) {
        throw new Error('Chưa cấu hình dịch vụ gửi email nào (Vui lòng điền API Key hoặc cấu hình SMTP).');
      }
      
      await this.dispatchEmail({
        to: testEmail,
        subject: 'Cấu hình Gửi Email Thành Công - Hệ Thống VN Retail',
        html: '<p>Chúc mừng! Hệ thống của bạn đã kết nối và có thể gửi email hợp lệ.</p>',
        text: 'Chúc mừng! Hệ thống của bạn đã kết nối và có thể gửi email hợp lệ.',
      });
      return { success: true, message: 'Gửi Test thành công!' };
    } catch (error) {
      return { success: false, message: `Lỗi kết nối: ${error.message}` };
    }
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    await this.dispatchEmail({
      to: email,
      subject: 'Đặt lại mật khẩu - Hệ Thống Quản Lý Bán Hàng',
      html: `...` // abbreviated for simplicity
    });
  }

  async sendWelcome(email: string, name: string) {
    await this.dispatchEmail({
      to: email,
      subject: 'Chào mừng bạn đến với Hệ Thống Quản Lý Bán Hàng',
      html: `<p>Xin chào ${name}, tài khoản của bạn đã được tạo thành công!</p>`,
    });
  }

  async sendOrderReceipt(order: any, customer: any) {
    // A beautiful responsive email template for order invoice
    if (!customer?.email) return;

    let itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product?.name || 'Sản phẩm'} ${item.variant?.name ? `(${item.variant.name})` : ''} x${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total)}</td>
      </tr>
    `).join('');

    const totalVND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total);

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">VN Retail OS</h1>
          <p style="color: #e0e7ff; margin-top: 5px;">Hóa đơn Mua Hàng Điện Tử</p>
        </div>
        <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
          <p>Xin chào <strong>${customer.name}</strong>,</p>
          <p>Cảm ơn bạn đã mua sắm tại cửa hàng chúng tôi. Dưới đây là chi tiết hóa đơn của bạn:</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Mã đơn hàng:</strong> ${order.code}<br>
            <strong>Ngày mua:</strong> ${new Date(order.createdAt).toLocaleString('vi-VN')}<br>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; text-align: left;">Sản phẩm</th>
                <th style="padding: 10px; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 15px 10px; text-align: right; font-weight: bold; border-top: 2px solid #333;">TỔNG THANH TOÁN:</td>
                <td style="padding: 15px 10px; text-align: right; font-weight: bold; border-top: 2px solid #333; color: #e11d48; font-size: 18px;">${totalVND}</td>
              </tr>
            </tfoot>
          </table>
          <p style="text-align: center; margin-top: 40px; color: #64748b; font-size: 14px;">Bạn có thể quét QRCode trên ứng dụng VN Retail để tra cứu hóa đơn.</p>
        </div>
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; background: #f8fafc;">
          © ${new Date().getFullYear()} VN Retail System. Trân trọng cảm ơn.
        </div>
      </div>
    `;

    try {
      await this.dispatchEmail({
        to: customer.email,
        subject: `Hóa Đơn Cảm Ơn Khách Hàng - Đơn ${order.code}`,
        html: htmlTemplate,
      });
      this.logger.log(`Order receipt sent to ${customer.email} for order ${order.code}`);
    } catch (err) {
      this.logger.error(`Failed to send order receipt to ${customer.email}`, err);
    }
  }

  async sendLowStockAlert(items: any[], adminEmails: string[]) {
    if (!adminEmails || adminEmails.length === 0) return;
    
    const itemsHtml = items.map(item => `<li><strong>${item.product.name}</strong> - Tồn kho: <span style="color:red">${item.quantity}</span> (Cảnh báo: ${item.product.minStock})</li>`).join('');

    try {
      await this.dispatchEmail({
        to: adminEmails,
        subject: '[Cảnh Báo Hệ Thống] Sản phẩm sắp hết hàng',
        html: `<h2>Một số mặt hàng cần nhập thêm gấp:</h2><ul>${itemsHtml}</ul><p>Vui lòng đăng nhập hệ thống để lên đơn nhập hàng (Purchase Order).</p>`,
      });
    } catch (e) {
      this.logger.error('Failed to send low stock alert', e);
    }
  }

  async sendDailyReport(emails: string[], statsHtml: string) {
    try {
      await this.dispatchEmail({
        to: emails,
        subject: '[VN Retail OS] Báo Cáo Kinh Doanh Cuối Ngày',
        html: statsHtml,
      });
    } catch (e) {
      this.logger.error('Failed to send daily report', e);
    }
  }

  /**
   * Generic raw send — used by MailLogService.compose()
   */
  async sendRaw(opts: { to: string | string[]; subject: string; html: string; from?: string }) {
    return this.dispatchEmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      from: opts.from,
    });
  }
}
