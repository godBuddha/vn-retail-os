'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Loader2, ShoppingBag, Calendar, CheckSquare, Square } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import toast from 'react-hot-toast';
import Link from 'next/link';
import api from '@/lib/api';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-500/20 text-yellow-400' },
  CONFIRMED: { label: 'Xác nhận', color: 'bg-blue-500/20 text-blue-400' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-500/20 text-green-400' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-slate-700 text-slate-400' },
  REFUNDED: { label: 'Hoàn tiền', color: 'bg-orange-500/20 text-orange-400' },
};

const PAYMENT_MAP: Record<string, { label: string; color: string }> = {
  PAID: { label: 'Đã thanh toán', color: 'text-green-400' },
  PENDING: { label: 'Chờ thanh toán', color: 'text-yellow-400' },
  PARTIAL: { label: 'Thanh toán 1 phần', color: 'text-orange-400' },
  FAILED: { label: 'Thất bại', color: 'text-red-400' },
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt', QR_MANUAL: 'Chuyển khoản',
  VNPAY: 'VNPay', MOMO: 'MoMo', BANK_TRANSFER: 'Chuyển khoản',
};

export default function OrdersPage() {
  const { currentBranchId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');

  const setDateRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
    setPage(1);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', search, status, paymentStatus, dateFrom, dateTo, page, currentBranchId],
    queryFn: () => api.get('/orders', {
      params: { search, status, paymentStatus, dateFrom, dateTo, page, limit: 20, branchId: currentBranchId },
    }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const bulkUpdateMut = useMutation({
    mutationFn: (newStatus: string) => api.patch('/orders/bulk-status', { ids: selected, status: newStatus }),
    onSuccess: () => {
      toast.success(`Đã cập nhật ${selected.length} đơn hàng`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => toast.error('Lỗi cập nhật trạng thái'),
  });

  const orders = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const allSelected = orders.length > 0 && orders.every((o: any) => selected.includes(o.id));
  const toggleAll = () => setSelected(allSelected ? [] : orders.map((o: any) => o.id));
  const toggleOne = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Đơn Hàng</h1>
          <p className="text-slate-400 text-sm mt-1">{total} đơn hàng</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <span className="text-sm">↺</span>
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="card-dark p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm mã đơn, tên khách hàng..."
              className="input-dark pl-10"
            />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-dark min-w-40">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value); setPage(1); }} className="input-dark min-w-40">
            <option value="">Thanh toán</option>
            {Object.entries(PAYMENT_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-slate-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-dark text-sm" />
          <span className="text-slate-400">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-dark text-sm" />
          {[['Hôm nay', 1], ['7 ngày', 7], ['30 ngày', 30]].map(([label, days]) => (
            <button key={label} onClick={() => setDateRange(Number(days))}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-600 hover:border-violet-500 text-slate-400 hover:text-violet-400 transition-all">
              {label}
            </button>
          ))}
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1">✕ Xóa
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="card-dark p-3 flex items-center gap-3 border border-violet-500/30">
          <span className="text-sm text-slate-300">Đã chọn <strong className="text-white">{selected.length}</strong> đơn</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="input-dark text-sm py-1.5">
            <option value="">Cập nhật trạng thái...</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => bulkStatus && bulkUpdateMut.mutate(bulkStatus)}
            disabled={!bulkStatus || bulkUpdateMut.isPending}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-all disabled:opacity-50">
            Áp dụng
          </button>
          <button onClick={() => setSelected([])} className="text-slate-400 hover:text-white text-sm px-2">Bỏ chọn</button>
        </div>
      )}

      {/* Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="flex items-center justify-center">
                    {allSelected
                      ? <CheckSquare size={16} className="text-violet-400" />
                      : <Square size={16} className="text-slate-500" />}
                  </button>
                </th>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Thanh toán</th>
                <th className="px-6 py-3">Phương thức</th>
                <th className="px-6 py-3 text-right">Tổng tiền</th>
                <th className="px-6 py-3">Thời gian</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <Loader2 size={28} className="animate-spin text-violet-400 mx-auto" />
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">
                  <ShoppingBag size={40} className="mx-auto mb-2 opacity-30" />
                  <p>Chưa có đơn hàng nào</p>
                </td></tr>
              ) : orders.map((o: any) => {
                const st = STATUS_MAP[o.status] || STATUS_MAP.PENDING;
                const pt = PAYMENT_MAP[o.paymentStatus] || PAYMENT_MAP.PENDING;
                const method = o.payments?.[0]?.method;
                return (
                  <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <button onClick={() => toggleOne(o.id)} className="flex items-center justify-center">
                        {selected.includes(o.id)
                          ? <CheckSquare size={16} className="text-violet-400" />
                          : <Square size={16} className="text-slate-500" />}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-mono font-bold text-violet-400">{o.code}</p>
                      <p className="text-xs text-slate-500">{o.items?.length || 0} sản phẩm</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white">{o.customer?.name || 'Khách vãng lai'}</p>
                      {o.customer?.phone && <p className="text-xs text-slate-400">{o.customer.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', st.color)}>{st.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('text-xs font-medium', pt.color)}>{pt.label}</span>
                      {o.paymentStatus === 'PENDING' && method === 'QR_MANUAL' && (
                        <span className="ml-2 text-xs bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">Chờ confirm</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400">{METHOD_LABELS[method] || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-white">{formatCurrency(Number(o.total))}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-400">{formatDate(o.createdAt, 'HH:mm dd/MM')}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/orders/${o.id}`} className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-400/10 rounded-lg transition-all inline-flex">
                        <Eye size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/30">
            <p className="text-sm text-slate-400">Hiển thị {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} / {total}</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50">←</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
