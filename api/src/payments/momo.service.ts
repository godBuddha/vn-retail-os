import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MomoService {
  constructor(private config: ConfigService) {}

  private createSignature(rawData: string, secretKey: string): string {
    return crypto.createHmac('sha256', secretKey).update(rawData).digest('hex');
  }

  async createPayment(params: {
    orderId: string;
    amount: number;
    orderInfo: string;
    requestId?: string;
  }): Promise<{
    payUrl: string;
    deeplink: string;
    qrCodeUrl: string;
    orderId: string;
    requestId: string;
  }> {
    const partnerCode = this.config.get('MOMO_PARTNER_CODE', 'MOMO');
    const accessKey = this.config.get('MOMO_ACCESS_KEY', '');
    const secretKey = this.config.get('MOMO_SECRET_KEY', '');
    const apiUrl = this.config.get('MOMO_API_URL', 'https://test-payment.momo.vn');
    const redirectUrl = this.config.get('MOMO_RETURN_URL', 'http://localhost:3000/payment/momo-return');
    const ipnUrl = this.config.get('MOMO_IPN_URL', 'http://localhost:3001/api/v1/payments/momo/ipn');

    const requestId = params.requestId || `${partnerCode}${Date.now()}`;
    const orderId = params.orderId;
    const requestType = 'payWithMethod';
    const extraData = '';
    const autoCapture = true;
    const lang = 'vi';

    const rawSignature =
      `accessKey=${accessKey}&amount=${params.amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${params.orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;

    const signature = this.createSignature(rawSignature, secretKey);

    const body = {
      partnerCode,
      requestId,
      amount: params.amount,
      orderId,
      orderInfo: params.orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      signature,
    };

    const res = await fetch(`${apiUrl}/v2/gateway/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`MoMo API error: ${res.status}`);
    }

    const response = await res.json();

    return {
      payUrl: response.payUrl,
      deeplink: response.deeplink,
      qrCodeUrl: response.qrCodeUrl,
      orderId: response.orderId,
      requestId: response.requestId,
    };
  }

  verifyIpn(body: Record<string, any>): boolean {
    const secretKey = this.config.get('MOMO_SECRET_KEY', '');
    const { signature, ...rest } = body;

    // MoMo IPN verification: check signature field against reconstructed raw data
    const rawSignature =
      `accessKey=${this.config.get('MOMO_ACCESS_KEY')}&amount=${rest.amount}` +
      `&extraData=${rest.extraData || ''}&message=${rest.message}&orderId=${rest.orderId}` +
      `&orderInfo=${rest.orderInfo}&orderType=${rest.orderType}&partnerCode=${rest.partnerCode}` +
      `&payType=${rest.payType}&requestId=${rest.requestId}&responseTime=${rest.responseTime}` +
      `&resultCode=${rest.resultCode}&transId=${rest.transId}`;

    const expected = this.createSignature(rawSignature, secretKey);
    return expected === signature;
  }
}
