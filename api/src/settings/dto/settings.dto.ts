import { IsString, IsInt, IsBoolean, IsOptional, IsEmail } from 'class-validator';

export class SaveSmtpConfigDto {
  @IsString()
  @IsOptional()
  host?: string;

  @IsInt()
  @IsOptional()
  port?: number;

  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  @IsOptional()
  pass?: string;

  @IsString()
  @IsOptional()
  from?: string;

  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @IsString()
  @IsOptional()
  resendApiKey?: string;
}

export class SaveNotificationPrefsDto {
  @IsBoolean()
  @IsOptional()
  emailNewOrder?: boolean;

  @IsBoolean()
  @IsOptional()
  emailDailyReport?: boolean;

  @IsBoolean()
  @IsOptional()
  emailLowStock?: boolean;

  @IsBoolean()
  @IsOptional()
  pushNewOrder?: boolean;

  @IsBoolean()
  @IsOptional()
  pushLowStock?: boolean;

  @IsBoolean()
  @IsOptional()
  pushDailyReport?: boolean;

  @IsBoolean()
  @IsOptional()
  smsPromotions?: boolean;
}
