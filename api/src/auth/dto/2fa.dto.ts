import { IsString, IsNotEmpty, Length } from 'class-validator';

export class TurnOn2FADto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string;
}

export class VerifyLogin2FADto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string;
}
