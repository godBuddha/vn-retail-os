import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class VnpayService {
  constructor(private config: ConfigService) {}

  private sortObject(obj: Record<string, any>): Record<string, any> {
    return Object.keys(obj)
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = obj[key];
        return acc;
      }, {});
  }

  createPaymentUrl(params: {
    orderId: string;
    amount: number;
    orderInfo: string;
    ipAddr: string;
    locale?: string;
    bankCode?: string;
  }): string {
    const tmnCode = this.config.get('VNPAY_TMN_CODE');
    const hashSecret = this.config.get('VNPAY_HASH_SECRET');
    const vnpUrl = this.config.get('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    const returnUrl = this.config.get('VNPAY_RETURN_URL', 'http://localhost:3000/payment/vnpay-return');

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createDate =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000);
    const expireDateStr =
      `${expireDate.getFullYear()}${pad(expireDate.getMonth() + 1)}${pad(expireDate.getDate())}` +
      `${pad(expireDate.getHours())}${pad(expireDate.getMinutes())}${pad(expireDate.getSeconds())}`;

    const vnpParams: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: params.orderInfo.replace(/[^a-zA-Z0-9\s]/g, ''),
      vnp_OrderType: 'other',
      vnp_Amount: params.amount * 100, // ×100 to remove decimal
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: params.ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDateStr,
    };

    if (params.bankCode) {
      vnpParams['vnp_BankCode'] = params.bankCode;
    }

    const sorted = this.sortObject(vnpParams);
    const qs = require('querystring');
    const signData = qs.stringify(sorted, { encode: false });
    const hmac = crypto.createHmac('sha512', hashSecret!);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    sorted['vnp_SecureHash'] = signed;

    return `${vnpUrl}?${qs.stringify(sorted, { encode: false })}`;
  }

  verifyIpn(query: Record<string, string>): {
    isValid: boolean;
    responseCode: string;
    orderId: string;
    amount: number;
  } {
    const hashSecret = this.config.get('VNPAY_HASH_SECRET');
    const secureHash = query['vnp_SecureHash'];
    const params = { ...query };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    const sorted = this.sortObject(params);
    const qs = require('querystring');
    const signData = qs.stringify(sorted, { encode: false });
    const hmac = crypto.createHmac('sha512', hashSecret!);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return {
      isValid: signed === secureHash,
      responseCode: query['vnp_ResponseCode'],
      orderId: query['vnp_TxnRef'],
      amount: parseInt(query['vnp_Amount']) / 100,
    };
  }

  verifyReturn(query: Record<string, string>): boolean {
    const { isValid } = this.verifyIpn(query);
    return isValid;
  }
}
