'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores';
import {
  Play, Square, Clock, Users, DollarSign, TrendingUp,
  ChevronDown, Loader2, AlertCircle, CheckCircle2, History
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Shift {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  transferSales: number;
  openedBy: { firstName: string; lastName: string };
  closedBy?: { firstName: string; lastName: string };
  note?: string;
}

export default function ShiftPage() {
  const { currentBranchId } = useAuthStore();
  const qc = useQueryClient();
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('');
  const [note, setNote] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);

  // Current open shift
  const { data: currentShift, isLoading: shiftLoading } = useQuery<Shift | null>({
    queryKey: ['shift-current', currentBranchId],
    queryFn: () => api.get('/shifts/current', { params: { branchId: currentBranchId } })
      .then(r => r.data?.data || r.data || null).catch(() => null),
    refetchInterval: 30000,
  });

  // Shift history
  const { data: historyData } = useQuery({
    queryKey: ['shifts-history', currentBranchId],
    queryFn: () => api.get('/shifts', { params: { branchId: currentBranchId, limit: 10 } })
      .then(r => r.data),
  });

  const openShiftMut = useMutation({
    mutationFn: () => api.post('/shifts/open', {
      branchId: currentBranchId,
      openingCash: parseFloat(openingCash) || 0,
    }),
    onSuccess: () => {
      toast.success('Đã mở ca làm việc!');
      qc.invalidateQueries({ queryKey: ['shift-current'] });
      qc.invalidateQueries({ queryKey: ['shifts-history'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi mở ca'),
  });

  const closeShiftMut = useMutation({
    mutationFn: () => api.post('/shifts/close', {
      closingCash: parseFloat(closingCash) || 0,
      note: note || undefined,
    }),
    onSuccess: () => {
      toast.success('Đã đóng ca làm việc!');
      setShowCloseForm(false);
      setClosingCash('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['shift-current'] });
      qc.invalidateQueries({ queryKey: ['shifts-history'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi đóng ca'),
  });

  const shifts: Shift[] = historyData?.data || [];
  const isOpen = currentShift?.status === 'OPEN';

  // Calculate expected cash
  const expectedCash = isOpen
    ? (currentShift?.openingCash || 0) + (currentShift?.cashSales || 0)
    : 0;
  const closingNum = parseFloat(closingCash) || 0;
  const cashDiff = closingNum - expectedCash;

  if (shiftLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản Lý Ca</h1>
          <p className="text-slate-400 text-sm mt-1">Báo cáo ca làm việc và kiểm đếm tiền mặt</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isOpen ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          {isOpen ? 'Ca đang mở' : 'Không có ca'}
        </div>
      </div>

      {/* Current shift card or Open shift form */}
      {isOpen && currentShift ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shift info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-dark rounded-2xl p-5 border border-green-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">Ca đang hoạt động</h2>
                  <p className="text-slate-400 text-sm">
                    Mở lúc {formatDate(currentShift.openedAt, 'HH:mm dd/MM')} · bởi {currentShift.openedBy?.lastName}
                  </p>
                </div>
                <Clock size={24} className="text-green-400" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Tiền đầu ca', value: formatCurrency(currentShift.openingCash), icon: DollarSign, color: 'text-yellow-400' },
                  { label: 'Doanh thu', value: formatCurrency(currentShift.totalSales || 0), icon: TrendingUp, color: 'text-green-400' },
                  { label: 'Số đơn', value: String(currentShift.totalOrders || 0), icon: CheckCircle2, color: 'text-blue-400' },
                  { label: 'Tiền mặt', value: formatCurrency(currentShift.cashSales || 0), icon: DollarSign, color: 'text-violet-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-slate-500 text-xs mb-1">{stat.label}</p>
                    <p className={`font-bold text-sm ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Tiền mặt dự kiến cuối ca:</span>
                  <span className="text-white font-bold">{formatCurrency(expectedCash)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-400">CK/VNPay/MoMo:</span>
                  <span className="text-cyan-400 font-medium">{formatCurrency(currentShift.transferSales || 0)}</span>
                </div>
              </div>
            </div>

            {/* Close shift form */}
            {showCloseForm ? (
              <div className="card-dark rounded-2xl p-5 border border-red-500/20">
                <h3 className="text-white font-semibold mb-4">Đóng Ca — Kiểm Đếm Tiền Mặt</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Tiền mặt thực tế (đếm được)</label>
                    <input
                      type="number"
                      className="input-dark w-full text-lg font-mono"
                      placeholder="0"
                      value={closingCash}
                      onChange={e => setClosingCash(e.target.value)}
                    />
                  </div>

                  {closingCash && (
                    <div className={`p-3 rounded-xl flex items-center justify-between ${cashDiff >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <span className="text-sm text-slate-300">
                        {cashDiff >= 0 ? '✅ Thừa tiền' : '⚠️ Thiếu tiền'}
                      </span>
                      <span className={`font-bold text-sm ${cashDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {cashDiff >= 0 ? '+' : ''}{formatCurrency(cashDiff)}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Ghi chú (tùy chọn)</label>
                    <textarea
                      className="input-dark w-full resize-none"
                      rows={2}
                      placeholder="Ghi chú về ca làm việc..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => closeShiftMut.mutate()}
                      disabled={!closingCash || closeShiftMut.isPending}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                    >
                      {closeShiftMut.isPending ? <Loader2 size={18} className="animate-spin" /> : <Square size={18} />}
                      Xác nhận đóng ca
                    </button>
                    <button onClick={() => setShowCloseForm(false)}
                      className="px-5 py-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all">
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCloseForm(true)}
                className="w-full py-3 border-2 border-dashed border-red-500/40 text-red-400 hover:border-red-500/70 hover:bg-red-500/5 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                <Square size={18} /> Đóng Ca
              </button>
            )}
          </div>

          {/* Quick summary */}
          <div className="card-dark rounded-2xl p-5 h-fit">
            <h3 className="text-white font-semibold mb-4">Tóm tắt thanh toán</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Tiền mặt</span>
                <span className="text-green-400 font-medium">{formatCurrency(currentShift.cashSales || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Chuyển khoản</span>
                <span className="text-cyan-400 font-medium">{formatCurrency((currentShift.transferSales || 0) - (currentShift.cashSales || 0))}</span>
              </div>
              <div className="border-t border-slate-700/50 pt-3 flex justify-between text-sm font-bold">
                <span className="text-white">Tổng</span>
                <span className="text-violet-400">{formatCurrency(currentShift.totalSales || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Open shift form */
        <div className="max-w-md mx-auto">
          <div className="card-dark rounded-2xl p-6 border border-slate-700/30">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                <Play size={32} className="text-violet-400" />
              </div>
              <h2 className="text-white font-bold text-lg">Mở Ca Làm Việc</h2>
              <p className="text-slate-400 text-sm mt-1">Nhập số tiền mặt đầu ca để bắt đầu</p>
            </div>

            <div className="mb-5">
              <label className="text-sm text-slate-400 mb-1.5 block">Tiền mặt đầu ca</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₫</span>
                <input
                  type="number"
                  className="input-dark w-full pl-7 text-lg font-mono"
                  placeholder="0"
                  value={openingCash}
                  onChange={e => setOpeningCash(e.target.value)}
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[0, 200000, 500000, 1000000].map(v => (
                  <button key={v} onClick={() => setOpeningCash(String(v))}
                    className="flex-1 py-1 text-xs border border-slate-600 hover:border-violet-500 text-slate-400 hover:text-violet-400 rounded-lg transition-all">
                    {v === 0 ? 'Không có' : `${v/1000}K`}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => openShiftMut.mutate()}
              disabled={openShiftMut.isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              {openShiftMut.isPending ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              Bắt đầu ca
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {shifts.length > 0 && (
        <div className="card-dark rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
            <History size={18} className="text-slate-400" />
            <h3 className="text-white font-semibold">Lịch Sử Ca</h3>
          </div>
          <div className="divide-y divide-slate-700/30">
            {shifts.map(shift => (
              <div key={shift.id} className="px-5 py-4 flex items-center gap-4">
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${shift.status === 'OPEN' ? 'bg-green-400' : 'bg-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">
                      {formatDate(shift.openedAt, 'HH:mm dd/MM/yyyy')}
                    </p>
                    {shift.status === 'OPEN'
                      ? <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Đang mở</span>
                      : <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">Đã đóng</span>}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {shift.openedBy?.lastName} · {shift.totalOrders || 0} đơn
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-bold">{formatCurrency(shift.totalSales || 0)}</p>
                  {shift.closingCash != null && (
                    <p className="text-slate-400 text-xs">Đóng: {formatCurrency(shift.closingCash)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
