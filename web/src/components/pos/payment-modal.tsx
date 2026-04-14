'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle, Banknote, QrCode, CreditCard, Smartphone } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { paymentsApi } from '@/lib/payment-api';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores';
import toast from 'react-hot-toast';
import { useHotkeys } from '@/hooks/useHotkeys';

interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  salePrice: number;
  quantity: number;
  discount: number;
  total: number;
  unit?: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: { orderId: string; orderCode: string; method: string; change: number; paidAmount: number }) => void;
  cartItems: CartItem[];
  subtotal: number;
  cartDiscount: number;
  total: number;
  customerId?: string | null;
  customerName?: string | null;
  branchId: string;
  enabledMethods?: string[];
  pointsRedeemed?: number;
}

type Tab = 'CASH' | 'QR_MANUAL' | 'VNPAY' | 'MOMO';

export default function PaymentModal({
  open, onClose, onSuccess, cartItems, subtotal, cartDiscount, total,
  customerId, customerName, branchId: branchIdProp, enabledMethods = ['CASH', 'QR_MANUAL'], pointsRedeemed = 0,
}: PaymentModalProps) {
  const { user, currentBranchId } = useAuthStore();
  // Resolve branchId: from prop → store → user's first branch
  const branchId = branchIdProp || currentBranchId || (user as any)?.userBranches?.[0]?.branch?.id || user?.branches?.[0]?.id || '';
  const [tab, setTab] = useState<Tab>('CASH');
  const [cashInput, setCashInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const [orderCode, setOrderCode] = useState<string>('');
  const [qrInfo, setQrInfo] = useState<any>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const cashAmount = parseFloat(cashInput.replace(/[^0-9]/g, '')) || 0;
  const change = Math.max(0, cashAmount - total);

  // Reset khi đóng modal
  useEffect(() => {
    if (!open) {
      setCashInput('');
      setQrInfo(null);
      setPaymentId('');
      setOrderId('');
      setOrderCode('');
      clearInterval(pollRef.current as any);
    }
  }, [open]);

  // Khi chuyển sang QR tab, tạo order + lấy QR info
  useEffect(() => {
    if (tab === 'QR_MANUAL' && open && !qrInfo) {
      loadQrInfo();
    }
  }, [tab, open]);

  // --- Hotkeys ---
  useHotkeys({
    'Enter': () => {
      if (!open || loading || creatingOrder) return;
      if (tab === 'CASH') {
        if (cashAmount >= total) handleCashPay();
      } else if (tab === 'QR_MANUAL') {
        if (qrInfo && paymentId) handleConfirmQr();
      } else if (tab === 'VNPAY') {
        handleVNPay();
      }
    }
  }, { enabled: open, ignoreInputFocus: true });

  // Tạo draft order nếu chưa có
  const ensureOrder = async (method: string, amountPaid: number): Promise<string> => {
    if (orderId) return orderId;
    setCreatingOrder(true);
    try {
      const { data } = await ordersApi.create({
        branchId,
        customerId: customerId || undefined,
        items: cartItems.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        discountAmount: cartDiscount,
        pointsRedeemed,
        paymentMethod: method,
        amountPaid,
      });
      setOrderId(data.id);
      setOrderCode(data.code);
      return data.id;
    } finally {
      setCreatingOrder(false);
    }
  };

  const loadQrInfo = async () => {
    setLoadingQr(true);
    try {
      // Tạo order trước
      const oid = await ensureOrder('QR_MANUAL', total);
      const { data } = await paymentsApi.getQrManual(oid);
      setQrInfo(data);
      setPaymentId(data.paymentId);
      if (data.orderCode) setOrderCode(data.orderCode);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tải thông tin thanh toán');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleCashPay = async () => {
    if (cashAmount < total) { toast.error('Số tiền khách đưa chưa đủ'); return; }
    setLoading(true);
    try {
      const oid = await ensureOrder('CASH', cashAmount);
      await paymentsApi.cash(oid, cashAmount);
      toast.success('Thanh toán thành công! 🎉');
      onSuccess({ orderId: oid, orderCode: orderCode || oid, method: 'CASH', change, paidAmount: cashAmount });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmQr = async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      await paymentsApi.confirmQr(paymentId);
      toast.success('Đã xác nhận thanh toán chuyển khoản! ✓');
      onSuccess({ orderId, orderCode, method: 'QR_MANUAL', change: 0, paidAmount: total });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi xác nhận');
    } finally {
      setLoading(false);
    }
  };

  const handleVNPay = async () => {
    setLoading(true);
    try {
      const oid = await ensureOrder('VNPAY', total);
      const returnUrl = `${window.location.origin}/payment/vnpay-return`;
      const { data } = await paymentsApi.createVNPay(oid, returnUrl);
      window.open(data.payUrl, 'vnpay', 'width=500,height=700');
      toast('Hoàn thành thanh toán trên VNPay rồi nhấn xác nhận', { icon: 'ℹ️' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tạo thanh toán VNPay');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any; color: string }[] = [
    { id: 'CASH', label: 'Tiền Mặt', icon: Banknote, color: 'text-green-400' },
    { id: 'QR_MANUAL', label: 'QR Chuyển Khoản', icon: QrCode, color: 'text-blue-400' },
    { id: 'VNPAY', label: 'VNPay', icon: CreditCard, color: 'text-red-400' },
    { id: 'MOMO', label: 'MoMo', icon: Smartphone, color: 'text-pink-400' },
  ].filter(t => enabledMethods.includes(t.id)) as { id: Tab; label: string; icon: any; color: string }[];

  if (!open) return null;

  const isProcessing = loading || creatingOrder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isProcessing ? onClose : undefined} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Thanh Toán</h2>
            <p className="text-2xl font-bold text-violet-400 mt-0.5">{formatCurrency(total)}</p>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* Method Tabs */}
        <div className="flex border-b border-slate-700 px-2 pt-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              disabled={isProcessing}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg mr-1 transition-all disabled:opacity-50 ${
                tab === t.id
                  ? 'bg-slate-800 text-white border-b-2 border-violet-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <t.icon size={15} className={tab === t.id ? t.color : ''} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* CASH */}
          {tab === 'CASH' && (
            <div className="space-y-4">
              {/* Amount display */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Cần thanh toán</span>
                  <span className="text-sm font-bold text-violet-400">{formatCurrency(total)}</span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-white tracking-widest">
                    {cashInput ? formatCurrency(parseInt(cashInput.replace(/[^0-9]/g, '')) || 0) : '—'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Tiền khách đưa</p>
                </div>
              </div>

              {/* Change display */}
              {cashAmount > 0 && (
                <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  cashAmount >= total
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <span className={`text-sm font-medium ${cashAmount >= total ? 'text-green-400' : 'text-red-400'}`}>
                    {cashAmount >= total ? '✓ Tiền thối lại' : '✗ Còn thiếu'}
                  </span>
                  <span className={`text-xl font-bold ${cashAmount >= total ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(cashAmount >= total ? change : total - cashAmount)}
                  </span>
                </div>
              )}

              {/* Quick amount buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  total,
                  Math.ceil(total / 10000) * 10000,
                  Math.ceil(total / 50000) * 50000,
                  100000, 200000, 500000,
                ].filter((v, i, arr) => arr.indexOf(v) === i && v >= total).slice(0, 6).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setCashInput(amt.toString())}
                    className={`py-2 px-2 text-sm rounded-xl transition-all border font-medium ${
                      cashAmount === amt
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map(k => (
                  <button
                    key={k}
                    onClick={() => {
                      if (k === '⌫') {
                        setCashInput(p => p.slice(0, -1));
                      } else {
                        setCashInput(p => {
                          const next = (p + k).replace(/^0+/, '') || '0';
                          return next.length > 10 ? p : next;
                        });
                      }
                    }}
                    className={`py-3 rounded-xl text-lg font-bold transition-all border ${
                      k === '⌫'
                        ? 'bg-red-900/30 text-red-400 border-red-800/50 hover:bg-red-900/50'
                        : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700 active:scale-95'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCashPay}
                disabled={isProcessing || cashAmount < total}
                className="btn-success w-full justify-center py-3.5 text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                {creatingOrder ? 'Đang tạo đơn...' : loading ? 'Đang xử lý...' : 'Hoàn Tất Thanh Toán'}
              </button>
            </div>
          )}


          {/* QR MANUAL */}
          {tab === 'QR_MANUAL' && (
            <div className="space-y-4">
              {loadingQr || creatingOrder ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 size={32} className="animate-spin text-violet-400" />
                  <p className="text-slate-400">{creatingOrder ? 'Đang tạo đơn hàng...' : 'Đang tải thông tin...'}</p>
                </div>
              ) : qrInfo ? (
                <>
                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-1 font-semibold">{qrInfo.bankAccount.bankName}</p>
                    <p className="text-2xl font-bold text-white font-mono">{qrInfo.bankAccount.accountNumber}</p>
                    <p className="text-slate-300 text-sm">{qrInfo.bankAccount.accountName}</p>
                  </div>

                  {qrInfo.bankAccount.qrImageUrl ? (
                    <div className="flex justify-center">
                      <div className="p-2 bg-white rounded-2xl shadow-lg">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}${qrInfo.bankAccount.qrImageUrl}`}
                          alt="QR Code"
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <div className="w-48 h-48 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-600 flex items-center justify-center">
                        <div className="text-center">
                          <QrCode size={40} className="text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-500 text-xs">Chưa có ảnh QR</p>
                          <a href="/settings/payments" className="text-violet-400 text-xs hover:underline mt-1 block">Upload QR →</a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Số tiền</span>
                      <span className="text-white font-bold">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Nội dung CK</span>
                      <span className="text-violet-400 font-mono font-bold">{qrInfo.transferContent}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmQr}
                    disabled={isProcessing}
                    className="btn-success w-full justify-center py-3 text-base font-bold"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                    {loading ? 'Đang xác nhận...' : 'Khách Đã Chuyển Khoản ✓'}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <QrCode size={48} className="text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Chưa cấu hình tài khoản ngân hàng</p>
                  <a href="/settings/payments" className="text-violet-400 text-sm hover:underline mt-2 block">
                    → Đi đến Cài Đặt Thanh Toán
                  </a>
                </div>
              )}
            </div>
          )}

          {/* VNPAY */}
          {tab === 'VNPAY' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                <CreditCard size={36} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Thanh toán qua VNPay</p>
                <p className="text-slate-400 text-sm mt-1">Số tiền: <span className="text-white font-bold">{formatCurrency(total)}</span></p>
              </div>
              <p className="text-slate-500 text-xs">Cửa sổ thanh toán VNPay sẽ mở ra. Hoàn thành rồi nhấn xác nhận.</p>
              <button onClick={handleVNPay} disabled={isProcessing} className="btn-primary w-full justify-center py-3 font-bold" style={{ background: '#e63636' }}>
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : null}
                Mở Cổng Thanh Toán VNPay
              </button>
            </div>
          )}

          {/* MOMO */}
          {tab === 'MOMO' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                <Smartphone size={36} className="text-pink-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Thanh toán qua MoMo</p>
                <p className="text-slate-400 text-sm mt-1">Số tiền: <span className="text-white font-bold">{formatCurrency(total)}</span></p>
              </div>
              <p className="text-slate-500 text-xs">Quét mã QR MoMo hoặc mở app MoMo. Hệ thống tự cập nhật khi nhận tiền.</p>
              <button disabled className="btn-primary w-full justify-center py-3 font-bold opacity-60" style={{ background: '#ae2070' }}>
                <Smartphone size={20} />
                Tạo QR MoMo (Sắp ra mắt)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
