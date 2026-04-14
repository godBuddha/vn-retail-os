import {
  Controller, Post, Get, Body, Param, Query, Request, UseGuards, Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // CASH
  @Post('cash')
  @UseGuards(JwtAuthGuard)
  processCash(@Body() body: { orderId: string; amountPaid: number }) {
    return this.paymentsService.processCash(body.orderId, body.amountPaid);
  }

  // QR MANUAL - Lấy thông tin TK ngân hàng
  @Get('qr-manual/:orderId')
  @UseGuards(JwtAuthGuard)
  getQrManualInfo(
    @Param('orderId') orderId: string,
    @Query('bankAccountId') bankAccountId?: string,
  ) {
    return this.paymentsService.getQrManualInfo(orderId, bankAccountId);
  }

  // QR MANUAL - Nhân viên xác nhận đã nhận tiền
  @Post('qr-manual/confirm/:paymentId')
  @UseGuards(JwtAuthGuard)
  confirmQrPayment(@Param('paymentId') paymentId: string, @Request() req: any) {
    return this.paymentsService.confirmQrPayment(paymentId, req.user.id);
  }

  // VNPAY - Tạo URL thanh toán
  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard)
  createVNPay(@Body() body: { orderId: string; returnUrl: string }, @Req() req: any) {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    return this.paymentsService.createVNPayUrl(body.orderId, body.returnUrl, ip);
  }

  // VNPAY - Return URL (khách redirect về sau khi thanh toán)
  @Get('vnpay/return')
  @Public()
  vnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.verifyVNPayReturn(query);
  }

  // VNPAY - IPN (webhook từ VNPay server)
  @Post('vnpay/ipn')
  @Public()
  vnpayIpn(@Query() query: Record<string, string>) {
    return this.paymentsService.verifyVNPayReturn(query);
  }

  // MOMO - Tạo thanh toán
  @Post('momo/create')
  @UseGuards(JwtAuthGuard)
  createMoMo(@Body() body: { orderId: string; returnUrl: string; notifyUrl: string }) {
    return this.paymentsService.createMoMoPayment(body.orderId, body.returnUrl, body.notifyUrl);
  }

  // MOMO - IPN callback
  @Post('momo/ipn')
  @Public()
  momoIpn(@Body() body: any) {
    return this.paymentsService.verifyMoMoCallback(body);
  }

  // CHECK STATUS - Polling từ frontend
  @Get('status/:paymentId')
  @UseGuards(JwtAuthGuard)
  checkStatus(@Param('paymentId') paymentId: string) {
    return this.paymentsService.checkStatus(paymentId);
  }
}
