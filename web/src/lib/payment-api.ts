// Frontend API additions for Phase 2
import api from './api';

export const bankAccountsApi = {
  getAll: (branchId: string) => api.get('/bank-accounts', { params: { branchId } }),
  create: (data: any) => api.post('/bank-accounts', data),
  update: (id: string, data: any) => api.put(`/bank-accounts/${id}`, data),
  uploadQr: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/bank-accounts/${id}/upload-qr`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  setDefault: (id: string) => api.post(`/bank-accounts/${id}/set-default`),
  delete: (id: string) => api.delete(`/bank-accounts/${id}`),
};

export const paymentsApi = {
  cash: (orderId: string, amountPaid: number) =>
    api.post('/payments/cash', { orderId, amountPaid }),
  getQrManual: (orderId: string, bankAccountId?: string) =>
    api.get(`/payments/qr-manual/${orderId}`, { params: { bankAccountId } }),
  confirmQr: (paymentId: string) =>
    api.post(`/payments/qr-manual/confirm/${paymentId}`),
  createVNPay: (orderId: string, returnUrl: string) =>
    api.post('/payments/vnpay/create', { orderId, returnUrl }),
  createMoMo: (orderId: string, returnUrl: string, notifyUrl: string) =>
    api.post('/payments/momo/create', { orderId, returnUrl, notifyUrl }),
  checkStatus: (paymentId: string) =>
    api.get(`/payments/status/${paymentId}`),
};

export const uploadApi = {
  upload: (file: File, type: 'qr' | 'product' = 'qr') => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/upload', fd, {
      params: { type },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const customersSearchApi = {
  search: (q: string) => api.get('/customers', { params: { search: q, limit: 10 } }),
};
