import {
  Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto, RegisterDto, ForgotPasswordDto,
  ResetPasswordDto, RefreshTokenDto, ChangePasswordDto,
} from './dto/auth.dto';
import { VerifyLogin2FADto, TurnOn2FADto } from './dto/2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: any, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  @HttpCode(HttpStatus.OK)
  generateTwoFactorAuthenticationSecret(@CurrentUser() user: any) {
    return this.authService.generateTwoFactorAuthenticationSecret(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/turn-on')
  @HttpCode(HttpStatus.OK)
  turnOnTwoFactorAuthentication(@CurrentUser() user: any, @Body() dto: TurnOn2FADto) {
    return this.authService.turnOnTwoFactorAuthentication(user.id, dto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/turn-off')
  @HttpCode(HttpStatus.OK)
  turnOffTwoFactorAuthentication(@CurrentUser() user: any, @Body() dto: TurnOn2FADto) {
    return this.authService.turnOffTwoFactorAuthentication(user.id, dto.token);
  }

  @Public()
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  verifyTwoFactorLogin(@Body() dto: VerifyLogin2FADto) {
    return this.authService.verifyTwoFactorLogin(dto);
  }
}
