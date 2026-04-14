import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private bankAccountsService: BankAccountsService,
  ) {}

  // ─── TIỀN MẶT ────────────────────────────────────────────────────────────────
  async processCash(orderId: string, amountPaid: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    
    // Idempotent: nếu đã thanh toán rồi thì return success
    if (order.paymentStatus === 'PAID') {
      return { success: true, change: Math.max(0, amountPaid - Number(order.total)), alreadyPaid: true };
    }
    
    if (amountPaid < Number(order.total)) {
      throw new BadRequestException('Số tiền khách đưa không đủ');
    }
    const change = amountPaid - Number(order.total);
    const existingPayment = await this.prisma.orderPayment.findFirst({
      where: { orderId, method: 'CASH' },
    });
    const payment = existingPayment || await this.prisma.orderPayment.create({
      data: {
        orderId,
        method: 'CASH',
        amount: order.total,
        status: 'PAID',
        paidAt: new Date(),
        metadata: { amountPaid, change },
      },
    });
    await this.markOrderPaid(orderId, Number(order.total), change);
    return { payment, change, success: true };
  }

  // ─── QR THỦ CÔNG ─────────────────────────────────────────────────────────────
  async getQrManualInfo(orderId: string, bankAccountId?: string) {
    const order = await this.getOrder(orderId);
    let bankAccount: any;
    if (bankAccountId) {
      bankAccount = await this.prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    } else {
      bankAccount = await this.bankAccountsService.findDefault(order.branchId);
    }
    if (!bankAccount) {
      throw new NotFoundException('Chưa cấu hình tài khoản ngân hàng. Vui lòng vào Cài Đặt > Thanh Toán.');
    }

    // Tạo payment record pending
    const ref = `DH${order.code}`;
    const existingPending = await this.prisma.orderPayment.findFirst({
      where: { orderId, method: 'QR_MANUAL', status: 'PENDING' },
    });

    const payment = existingPending || await this.prisma.orderPayment.create({
      data: {
        orderId,
        method: 'QR_MANUAL',
        amount: order.total,
        status: 'PENDING',
        bankAccountId: bankAccount.id,
        transactionRef: ref,
        gatewayStatus: 'PENDING',
      },
    });

    return {
      paymentId: payment.id,
      amount: Number(order.total),
      bankAccount: {
        bankName: bankAccount.bankName,
        bankCode: bankAccount.bankCode,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        qrImageUrl: bankAccount.qrImageUrl,
      },
      transferContent: ref,
      orderCode: order.code,
    };
  }

  async confirmQrPayment(paymentId: string, confirmedById: string) {
    const payment = await this.prisma.orderPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
    if (payment.status === 'PAID') throw new BadRequestException('Giao dịch đã được xác nhận');

    await this.prisma.orderPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        confirmedAt: new Date(),
        confirmedById,
        gatewayStatus: 'SUCCESS',
      },
    });
    await this.markOrderPaid(payment.orderId, Number(payment.amount), 0);
    return { success: true, message: 'Đã xác nhận thanh toán' };
  }

  // ─── VNPAY ───────────────────────────────────────────────────────────────────
  async createVNPayUrl(orderId: string, returnUrl: string, ipAddr: string) {
    const order = await this.getOrder(orderId);
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secretKey = process.env.VNPAY_HASH_SECRET;
    if (!tmnCode || !secretKey) {
      throw new BadRequestException('VNPay chưa được cấu hình');
    }
    const amount = Math.round(Number(order.total) * 100).toString();
    const txnRef = `${order.code}-${Date.now()}`;
    const createDate = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: amount,
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddr,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${order.code}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: txnRef,
    };

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    params['vnp_SecureHash'] = signed;

    const queryString = new URLSearchParams(params).toString();
    const payUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${queryString}`;

    await this.prisma.orderPayment.create({
      data: {
        orderId,
        method: 'VNPAY',
        amount: order.total,
        status: 'PENDING',
        transactionId: txnRef,
        gatewayStatus: 'PENDING',
      },
    });

    return { payUrl, txnRef };
  }

  async verifyVNPayReturn(query: Record<string, string>) {
    const secretKey = process.env.VNPAY_HASH_SECRET;
    const secureHash = query['vnp_SecureHash'];
    delete query['vnp_SecureHash'];
    delete query['vnp_SecureHashType'];

    const sortedKeys = Object.keys(query).sort();
    const signData = sortedKeys.map(k => `${k}=${query[k]}`).join('&');
    const hmac = crypto.createHmac('sha512', secretKey!);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (signed !== secureHash) {
      return { success: false, message: 'Chữ ký không hợp lệ' };
    }

    const responseCode = query['vnp_ResponseCode'];
    const txnRef = query['vnp_TxnRef'];
    const success = responseCode === '00';

    const payment = await this.prisma.orderPayment.findFirst({
      where: { transactionId: txnRef },
    });
    if (payment) {
      await this.prisma.orderPayment.update({
        where: { id: payment.id },
        data: {
          status: success ? 'PAID' : 'FAILED',
          paidAt: success ? new Date() : null,
          gatewayStatus: success ? 'SUCCESS' : 'FAILED',
          gatewayResponse: query,
        },
      });
      if (success) await this.markOrderPaid(payment.orderId, Number(payment.amount), 0);
    }
    return { success, responseCode, txnRef };
  }

  // ─── MOMO ────────────────────────────────────────────────────────────────────
  async createMoMoPayment(orderId: string, returnUrl: string, notifyUrl: string) {
    const order = await this.getOrder(orderId);
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    if (!partnerCode || !accessKey || !secretKey) {
      throw new BadRequestException('MoMo chưa được cấu hình');
    }

    const requestId = `${orderId}-${Date.now()}`;
    const amount = Math.round(Number(order.total)).toString();
    const orderInfo = `Thanh toan don hang ${order.code}`;
    const redirectUrl = returnUrl;
    const ipnUrl = notifyUrl;
    const requestType = 'payWithMethod';
    const extraData = '';

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${requestId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const payload = {
      partnerCode, accessKey, requestId, amount, orderId: requestId,
      orderInfo, redirectUrl, ipnUrl, extraData, requestType, signature,
      lang: 'vi',
    };

    const axios = require('axios');
    const response = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', payload);

    await this.prisma.orderPayment.create({
      data: {
        orderId,
        method: 'MOMO',
        amount: order.total,
        status: 'PENDING',
        transactionId: requestId,
        gatewayStatus: 'PENDING',
      },
    });

    return {
      payUrl: response.data.payUrl,
      qrCodeUrl: response.data.qrCodeUrl,
      deeplink: response.data.deeplink,
      requestId,
    };
  }

  async verifyMoMoCallback(body: any) {
    const secretKey = process.env.MOMO_SECRET_KEY;
    const { partnerCode, accessKey, requestId, orderId, amount, orderInfo,
      orderType, transId, message, localMessage, responseTime,
      errorCode, payType, extraData, signature } = body;

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${errorCode}&transId=${transId}`;
    const expectedSig = crypto.createHmac('sha256', secretKey!).update(rawSignature).digest('hex');

    const success = signature === expectedSig && errorCode === 0;
    const payment = await this.prisma.orderPayment.findFirst({ where: { transactionId: requestId } });

    if (payment) {
      await this.prisma.orderPayment.update({
        where: { id: payment.id },
        data: {
          status: success ? 'PAID' : 'FAILED',
          paidAt: success ? new Date() : null,
          gatewayStatus: success ? 'SUCCESS' : 'FAILED',
          gatewayResponse: body,
        },
      });
      if (success) await this.markOrderPaid(payment.orderId, Number(payment.amount), 0);
    }
    return { success };
  }

  // ─── CHECK PAYMENT STATUS ────────────────────────────────────────────────────
  async checkStatus(paymentId: string) {
    const payment = await this.prisma.orderPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
    return { status: payment.status, gatewayStatus: payment.gatewayStatus, paidAt: payment.paidAt };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  private async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Đơn hàng đã được thanh toán');
    return order;
  }

  private async markOrderPaid(orderId: string, paidAmount: number, changeAmount: number) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        paidAmount,
        changeAmount,
      },
    });
  }
}
