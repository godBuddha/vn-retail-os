'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Printer, RotateCcw, CheckCircle, XCircle,
  ShoppingBag, User, MapPin, CreditCard, Clock, Package,
  Loader2, AlertTriangle, Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:   { label: 'Chờ xử lý',  color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle },
  COMPLETED: { label: 'Hoàn thành',  color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  CANCELLED: { label: 'Đã hủy',      color: 'bg-slate-700 text-slate-400 border-slate-600', icon: XCircle },
  REFUNDED:  { label: 'Hoàn tiền',   color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: RotateCcw },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  PAID:    { label: 'Đã thanh toán',       color: 'text-green-400' },
  PENDING: { label: 'Chờ thanh toán',      color: 'text-yellow-400' },
  PARTIAL: { label: 'Thanh toán 1 phần',   color: 'text-orange-400' },
  FAILED:  { label: 'Thất bại',            color: 'text-red-400' },
};

const METHOD_LABELS: Record<string, string> = {
  CASH: '💵 Tiền mặt', QR_MANUAL: '🏦 Chuyển khoản',
  VNPAY: '💳 VNPay', MOMO: '📱 MoMo', BANK_TRANSFER: '🏦 Chuyển khoản',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params.id as string;

  const [showRefund, setShowRefund] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOne(id).then(r => r.data),
    enabled: !!id,
  });

  const refundMutation = useMutation({
    mutationFn: () => ordersApi.refund(id, {
      reason: refundReason,
      refundAmount: order?.total,
      items: order?.items?.map((i: any) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        orderItemId: i.id,
      })),
    }),
    onSuccess: () => {
      toast.success('Hoàn trả đơn hàng thành công');
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setShowRefund(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Lỗi hoàn trả'),
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-violet-400" />
    </div>
  );

  if (error || !order) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
      <AlertTriangle size={40} className="mb-3 text-red-400" />
      <p>Không tìm thấy đơn hàng</p>
      <Link href="/orders" className="btn-secondary mt-4"><ArrowLeft size={16} /> Quay lại</Link>
    </div>
  );

  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
  const StatusIcon = statusInfo.icon;
  const paymentInfo = PAYMENT_STATUS[order.paymentStatus] || PAYMENT_STATUS.PENDING;
  const canRefund = order.status === 'COMPLETED' && order.paymentStatus === 'PAID';
  const createdByName = order.createdBy
    ? `${order.createdBy.firstName || ''} ${order.createdBy.lastName || ''}`.trim()
    : 'Hệ thống';

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/orders" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">{order.code}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {formatDate(order.createdAt, 'HH:mm - dd/MM/yyyy')} · Bởi {createdByName}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="btn-secondary">
            <Printer size={16} /> In hoá đơn
          </button>
          {canRefund && (
            <button onClick={() => setShowRefund(true)} className="btn-danger">
              <RotateCcw size={16} /> Hoàn trả
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className={cn('flex items-center gap-3 px-5 py-3 rounded-xl border print:hidden', statusInfo.color)}>
        <StatusIcon size={18} />
        <span className="font-semibold">{statusInfo.label}</span>
        <span className="ml-auto text-sm opacity-70">• Thanh toán: <span className={paymentInfo.color}>{paymentInfo.label}</span></span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order Items */}
        <div className="lg:col-span-2 space-y-6">

          {/* Items Table */}
          <div className="card-dark overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2">
              <ShoppingBag size={18} className="text-violet-400" />
              <h2 className="font-semibold text-white">Sản phẩm ({order.items?.length || 0})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/30">
                    <th className="px-6 py-3 text-left">Sản phẩm</th>
                    <th className="px-6 py-3 text-center">SL</th>
                    <th className="px-6 py-3 text-right">Đơn giá</th>
                    <th className="px-6 py-3 text-right">Giảm</th>
                    <th className="px-6 py-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/20">
                  {order.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-800/20">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-slate-300 font-medium">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-300">
                        {formatCurrency(Number(item.salePrice))}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-red-400">
                        {Number(item.discount) > 0 ? `-${formatCurrency(Number(item.discount) * item.quantity)}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-white">
                        {formatCurrency(Number(item.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 py-4 border-t border-slate-700/30 space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Tạm tính</span>
                <span>{formatCurrency(Number(order.subtotal))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-red-400">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(Number(order.discountAmount))}</span>
                </div>
              )}
              {Number(order.taxAmount) > 0 && (
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Thuế VAT</span>
                  <span>+{formatCurrency(Number(order.taxAmount))}</span>
                </div>
              )}
              {Number(order.shippingFee) > 0 && (
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Phí vận chuyển</span>
                  <span>+{formatCurrency(Number(order.shippingFee))}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-white border-t border-slate-700 pt-2 mt-2">
                <span>TỔNG CỘNG</span>
                <span className="text-violet-400">{formatCurrency(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {/* Payments */}
          <div className="card-dark overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2">
              <CreditCard size={18} className="text-green-400" />
              <h2 className="font-semibold text-white">Thanh toán</h2>
            </div>
            <div className="divide-y divide-slate-700/20">
              {order.payments?.map((p: any) => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{METHOD_LABELS[p.method] || p.method}</p>
                    {p.transactionRef && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Ref: {p.transactionRef}</p>
                    )}
                    {p.paidAt && (
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(p.paidAt, 'HH:mm dd/MM/yyyy')}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">{formatCurrency(Number(p.amount))}</p>
                    <p className={cn('text-xs', p.status === 'PAID' ? 'text-green-400' : 'text-yellow-400')}>
                      {p.status === 'PAID' ? '✓ Đã thanh toán' : '○ Đang chờ'}
                    </p>
                  </div>
                </div>
              ))}
              {(!order.payments || order.payments.length === 0) && (
                <div className="px-6 py-4 text-sm text-slate-500">Chưa có thanh toán</div>
              )}
            </div>
            {Number(order.changeAmount) > 0 && (
              <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700/30 flex justify-between text-sm">
                <span className="text-slate-400">Tiền thối lại</span>
                <span className="font-medium text-yellow-400">{formatCurrency(Number(order.changeAmount))}</span>
              </div>
            )}
          </div>

          {/* Returns (if any) */}
          {order.returns?.length > 0 && (
            <div className="card-dark overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2">
                <RotateCcw size={18} className="text-orange-400" />
                <h2 className="font-semibold text-white">Lịch sử hoàn trả</h2>
              </div>
              {order.returns.map((r: any) => (
                <div key={r.id} className="px-6 py-4 border-b border-slate-700/20 last:border-0">
                  <div className="flex justify-between">
                    <p className="text-sm text-slate-300">Lý do: {r.reason || 'Không có lý do'}</p>
                    <p className="text-sm font-bold text-orange-400">-{formatCurrency(Number(r.refundAmount))}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{formatDate(r.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="card-dark p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Khách hàng</h3>
            </div>
            {order.customer ? (
              <div className="space-y-2">
                <p className="font-medium text-white">{order.customer.name}</p>
                {order.customer.phone && <p className="text-sm text-slate-400">📞 {order.customer.phone}</p>}
                {order.customer.email && <p className="text-sm text-slate-400">✉️ {order.customer.email}</p>}
                {order.customer.address && <p className="text-sm text-slate-400">📍 {order.customer.address}</p>}
                {order.pointsEarned > 0 && (
                  <div className="mt-3 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <p className="text-xs text-violet-400">+{order.pointsEarned} điểm tích luỹ</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Khách vãng lai</p>
            )}
          </div>

          {/* Branch */}
          <div className="card-dark p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Chi nhánh</h3>
            </div>
            <p className="text-sm font-medium text-white">{order.branch?.name || '—'}</p>
            {order.branch?.address && <p className="text-xs text-slate-400 mt-1">{order.branch.address}</p>}
          </div>

          {/* Order Info */}
          <div className="card-dark p-6">
            <div className="flex items-center gap-2 mb-4">
              <Receipt size={16} className="text-yellow-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Thông tin đơn</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Mã đơn</span>
                <span className="font-mono font-bold text-violet-400">{order.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian</span>
                <span className="text-slate-300">{formatDate(order.createdAt, 'HH:mm dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nhân viên</span>
                <span className="text-slate-300">{createdByName}</span>
              </div>
              {order.shift && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Ca làm</span>
                  <span className="text-slate-300">#{order.shift.id.slice(0, 8)}</span>
                </div>
              )}
              {order.note && (
                <div className="pt-2 border-t border-slate-700/30">
                  <p className="text-slate-400 mb-1">Ghi chú:</p>
                  <p className="text-slate-300 text-xs">{order.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Paid summary */}
          <div className="card-dark p-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Đã thanh toán</span>
                <span className="text-green-400 font-bold">{formatCurrency(Number(order.paidAmount))}</span>
              </div>
              {Number(order.changeAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Tiền thối</span>
                  <span className="text-yellow-400">{formatCurrency(Number(order.changeAmount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-700/30 pt-2 mt-2">
                <span className="text-white font-bold">Tổng cộng</span>
                <span className="text-violet-400 font-bold text-lg">{formatCurrency(Number(order.total))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefund && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <RotateCcw size={20} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Xác nhận hoàn trả</h2>
                <p className="text-sm text-slate-400">Đơn hàng {order.code}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <p className="text-sm text-orange-300">
                ⚠️ Hoàn trả sẽ khôi phục toàn bộ tồn kho và đánh dấu đơn là "Đã hoàn tiền".
                Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-1">Số tiền hoàn trả</p>
              <p className="text-2xl font-bold text-orange-400">{formatCurrency(Number(order.total))}</p>
            </div>

            <div className="mb-6">
              <label className="label-dark">Lý do hoàn trả <span className="text-red-400">*</span></label>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                className="input-dark resize-none"
                rows={3}
                placeholder="VD: Sản phẩm lỗi, khách đổi ý..."
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRefund(false)} className="btn-secondary flex-1">
                Hủy
              </button>
              <button
                onClick={() => { if (!refundReason.trim()) { toast.error('Vui lòng nhập lý do hoàn trả'); return; } refundMutation.mutate(); }}
                disabled={refundMutation.isPending}
                className="btn-danger flex-1"
              >
                {refundMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                Xác nhận hoàn trả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
