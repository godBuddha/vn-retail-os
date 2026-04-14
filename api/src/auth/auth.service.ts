import {
  Injectable, BadRequestException, UnauthorizedException,
  NotFoundException, ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoginDto, RegisterDto, ForgotPasswordDto,
  ResetPasswordDto, ChangePasswordDto,
} from './dto/auth.dto';
import { VerifyLogin2FADto, TurnOn2FADto } from './dto/2fa.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userBranches: { include: { branch: true } } },
    });
    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (!user.isActive) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    if (user.isTwoFactorEnabled) {
      return { requires2FA: true, userId: user.id };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const { password: _, twoFactorSecret: __, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: hashed,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const { password: _, twoFactorSecret: __, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken },
      data: { isRevoked: true },
    });
    return { message: 'Đăng xuất thành công' };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });
    const tokens = await this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
    return tokens;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu sẽ được gửi.' };

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    await this.mail.sendPasswordReset(user.email, `${user.firstName} ${user.lastName}`, token);
    return { message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu sẽ được gửi.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpires: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');

    const hashed = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpires: null },
    });
    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Đổi mật khẩu thành công' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userBranches: { include: { branch: true } } },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    const { password: _, twoFactorSecret: __, ...safe } = user;
    return safe;
  }

  async generateTwoFactorAuthenticationSecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const secret = speakeasy.generateSecret({
      name: `VN Retail OS (${user.email})`,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: `VN Retail OS (${user.email})`,
      algorithm: 'sha1',
    });

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    return { qrCodeDataUrl };
  }

  async turnOnTwoFactorAuthentication(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (!user.twoFactorSecret) throw new BadRequestException('Mã bí mật chưa được tạo');

    const isCodeValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1, 
    });

    if (!isCodeValid) {
      throw new BadRequestException('Mã xác thực 2 bước không hợp lệ');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: true },
    });

    return { message: 'Xác thực 2 bước đã được kích hoạt thành công' };
  }

  async turnOffTwoFactorAuthentication(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (!user.isTwoFactorEnabled) return { message: 'Xác thực 2 bước đang tắt' };
    if (!user.twoFactorSecret) throw new BadRequestException('Mã bí mật không tồn tại');

    const isCodeValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isCodeValid) {
      throw new BadRequestException('Mã xác thực 2 bước không hợp lệ');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null },
    });

    return { message: 'Đã tắt xác thực 2 bước' };
  }

  async verifyTwoFactorLogin(dto: VerifyLogin2FADto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { userBranches: { include: { branch: true } } },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (!user.twoFactorSecret) throw new BadRequestException('Mã bí mật không tồn tại');

    const isCodeValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: dto.token,
      window: 2,
    });

    if (!isCodeValid) {
      throw new UnauthorizedException('Mã xác thực 2 bước không hợp lệ');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const { password: _, twoFactorSecret: __, ...safe } = user;
    return { user: safe, ...tokens };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
    });
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });
    return { accessToken, refreshToken };
  }
}
