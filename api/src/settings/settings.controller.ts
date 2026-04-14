import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SaveSmtpConfigDto, SaveNotificationPrefsDto } from './dto/settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly mailService: MailService,
  ) {}

  @Get('smtp')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  async getSmtpConfig() {
    return this.settingsService.getSmtpConfig();
  }

  @Post('smtp')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  async saveSmtpConfig(@Body() dto: SaveSmtpConfigDto) {
    await this.settingsService.saveSmtpConfig(dto);
    // Reload transporter in MailService after saving
    await this.mailService.reloadTransporter();
    return { success: true };
  }

  @Post('smtp/test')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  async testSmtpConnection(@Body('email') email: string) {
    if (!email) {
      return { success: false, message: 'Vui lòng cung cấp email để test.' };
    }
    return this.mailService.testConnection(email);
  }

  @Get('notifications')
  async getMyNotificationPrefs(@Request() req: any) {
    return this.settingsService.getNotificationPrefs(req.user.id);
  }

  @Post('notifications')
  async saveMyNotificationPrefs(@Request() req: any, @Body() dto: SaveNotificationPrefsDto) {
    await this.settingsService.saveNotificationPrefs(req.user.id, dto);
    return { success: true };
  }
}
