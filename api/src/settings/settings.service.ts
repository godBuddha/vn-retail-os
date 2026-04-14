import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SaveSmtpConfigDto, SaveNotificationPrefsDto } from './dto/settings.dto';
import * as crypto from 'crypto';

@Injectable()
export class SettingsService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const secret = this.configService.get('ENCRYPTION_KEY') || 'default-secret-key-must-be-32-chars!';
    this.key = crypto.scryptSync(secret, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    if (!ivHex || !encryptedHex) return text; // Not encrypted or old format
    
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return ''; // Decryption failed
    }
  }

  async getSmtpConfig() {
    const settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'singleton' }
    });

    if (!settings) {
      return {
        host: '',
        port: 587,
        user: '',
        pass: '',
        from: '',
        secure: false,
      };
    }

    return {
      host: settings.smtpHost,
      port: settings.smtpPort,
      user: settings.smtpUser,
      pass: settings.smtpPass ? '********' : '', // Never return actual password
      from: settings.smtpFrom,
      secure: settings.smtpSecure,
      resendApiKey: settings.resendApiKey ? '********' : '',
    };
  }

  async getRawSmtpConfig() {
    // Used internally by MailService
    const settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'singleton' }
    });

    if (!settings) return null;

    return {
      ...settings,
      smtpPass: settings.smtpPass ? this.decrypt(settings.smtpPass) : null,
      resendApiKey: settings.resendApiKey ? this.decrypt(settings.resendApiKey) : null,
    };
  }

  async saveSmtpConfig(dto: SaveSmtpConfigDto) {
    const data: any = {
      smtpHost: dto.host,
      smtpPort: dto.port,
      smtpUser: dto.user,
      smtpFrom: dto.from,
      smtpSecure: dto.secure,
    };

    if (dto.pass && dto.pass !== '********') {
      data.smtpPass = this.encrypt(dto.pass);
    }
    
    if (dto.resendApiKey && dto.resendApiKey !== '********') {
      data.resendApiKey = this.encrypt(dto.resendApiKey);
    }

    await this.prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: {
        id: 'singleton',
        ...data,
      },
    });
  }

  async getNotificationPrefs(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }
    
    return prefs;
  }

  async saveNotificationPrefs(userId: string, dto: SaveNotificationPrefsDto) {
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });
  }
}
