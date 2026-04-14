'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Search, Percent, DollarSign, Gift,
  Calendar, Users, ToggleLeft, ToggleRight, Loader2, X, CheckCircle, Trash2
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const PROMO_TYPE: Record<string, { label: string; color: string; icon: any }> = {
  PERCENTAGE:  { label: 'Giảm %',      color: 'bg-blue-500/20 text-blue-400',    icon: Percent },
  FIXED:       { label: 'Giảm tiền',   color: 'bg-green-500/20 text-green-400',  icon: DollarSign },
  BUY_X_GET_Y: { label: 'Mua X tặng Y', color: 'bg-orange-500/20 text-orange-400', icon: Gift },
  FREE_SHIP:   { label: 'Free ship',   color: 'bg-cyan-500/20 text-cyan-400',    icon: Gift },
};

function AddPromoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', code: '', type: 'PERCENTAGE', value: '', minOrderAmount: '',
    maxDiscount: '', usageLimit: '', startAt: '', endAt: '', description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) return toast.error('Nhập tên và giá trị khuyến mãi');
    setLoading(true);
    try {
      await api.post('/promotions', {
        ...form, value: Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        startAt: form.startAt || null, endAt: form.endAt || null,
      });
      toast.success('Tạo khuyến mãi thành công!');
      onSuccess(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo khuyến mãi');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900">
          <h2 className="text-lg font-bold text-white">Tạo Khuyến Mãi</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Tên khuyến mãi *</label>
            <input className="input-dark" placeholder="Giảm 20% cuối tuần" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Mã giảm giá</label>
              <input className="input-dark uppercase" placeholder="SUMMER20" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Loại</label>
              <select className="input-dark" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {Object.entries(PROMO_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Giá trị {form.type === 'PERCENTAGE' ? '(%)' : '(đ)'} *
              </label>
              <input type="number" className="input-dark" placeholder={form.type === 'PERCENTAGE' ? '20' : '50000'} value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Đơn tối thiểu (đ)</label>
              <input type="number" className="input-dark" placeholder="100000" value={form.minOrderAmount} onChange={e => setForm(p => ({ ...p, minOrderAmount: e.target.value }))} />
            </div>
            {form.type === 'PERCENTAGE' && (
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Giảm tối đa (đ)</label>
                <input type="number" className="input-dark" placeholder="200000" value={form.maxDiscount} onChange={e => setForm(p => ({ ...p, maxDiscount: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Giới hạn dùng</label>
              <input type="number" className="input-dark" placeholder="1000" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Từ ngày</label>
              <input type="datetime-local" className="input-dark" value={form.startAt} onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Đến ngày</label>
              <input type="datetime-local" className="input-dark" value={form.endAt} onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Mô tả</label>
            <textarea className="input-dark resize-none h-16" placeholder="Mô tả chi tiết khuyến mãi..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Tạo Khuyến Mãi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['promotions', search, activeOnly],
    queryFn: () => api.get('/promotions', { params: { search, isActive: activeOnly || undefined, limit: 50 } })
      .then(r => r.data).catch(() => ({ data: [], total: 0 })),
    placeholderData: (prev: any) => prev,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/promotions/${id}`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotions'] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/${id}`),
    onSuccess: () => { toast.success('Đã xóa khuyến mãi'); qc.invalidateQueries({ queryKey: ['promotions'] }); },
    onError: () => toast.error('Không thể xóa'),
  });

  const promotions: any[] = data?.data || [];
  const total = data?.total || 0;
  const activeCount = promotions.filter(p => p.isActive).length;

  const now = new Date();
  const isExpired = (p: any) => p.endAt && new Date(p.endAt) < now;
  const isUpcoming = (p: any) => p.startAt && new Date(p.startAt) > now;

  return (
    <div className="space-y-6">
      {showAdd && <AddPromoModal onClose={() => setShowAdd(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ['promotions'] })} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Khuyến Mãi</h1>
          <p className="text-slate-400 text-sm mt-1">{total} chương trình — {activeCount} đang chạy</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Tạo Khuyến Mãi</button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-dark pl-9" placeholder="Tìm tên, mã khuyến mãi..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setActiveOnly(v => !v)}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all',
            activeOnly ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white')}>
          {activeOnly ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {activeOnly ? 'Đang chạy' : 'Tất cả'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center"><Loader2 size={28} className="animate-spin text-violet-400 mx-auto" /></div>
        ) : promotions.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-500">
            <Tag size={40} className="mx-auto mb-2 opacity-30" />
            <p>Chưa có chương trình khuyến mãi</p>
          </div>
        ) : promotions.map((p: any) => {
          const pt = PROMO_TYPE[p.type] || PROMO_TYPE.PERCENTAGE;
          const PtIcon = pt.icon;
          const expired = isExpired(p);
          const upcoming = isUpcoming(p);
          return (
            <div key={p.id} className={cn('bg-slate-900 border rounded-2xl p-5 transition-all',
              p.isActive && !expired ? 'border-violet-500/30 hover:border-violet-500/50' : 'border-slate-700/50 opacity-70')}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', pt.color)}>
                    <PtIcon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{p.name}</p>
                    {p.code && (
                      <code className="text-xs bg-slate-800 px-2 py-0.5 rounded font-mono text-violet-300">{p.code}</code>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}
                    className="transition-all" title={p.isActive ? 'Tạm dừng' : 'Kích hoạt'}>
                    {p.isActive
                      ? <ToggleRight size={24} className="text-green-400" />
                      : <ToggleLeft size={24} className="text-slate-500" />}
                  </button>
                  <button onClick={() => confirm(`Xóa khuyến mãi "${p.name}"?`) && deleteMut.mutate(p.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Giá trị giảm</span>
                  <span className="font-bold text-white text-lg">
                    {p.type === 'PERCENTAGE' ? `${p.value}%` : formatCurrency(Number(p.value))}
                  </span>
                </div>
                {p.minOrderAmount && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Đơn tối thiểu</span>
                    <span className="text-slate-300 text-xs">{formatCurrency(Number(p.minOrderAmount))}</span>
                  </div>
                )}
                {p.usageLimit && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs flex items-center gap-1"><Users size={10} /> Đã dùng</span>
                    <span className="text-slate-300 text-xs">{p.usageCount}/{p.usageLimit}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/50">
                {expired ? (
                  <span className="text-xs text-red-400 flex items-center gap-1"><Calendar size={11} /> Đã hết hạn</span>
                ) : upcoming ? (
                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                    <Calendar size={11} /> Bắt đầu {formatDate(p.startAt, 'dd/MM/yyyy')}
                  </span>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400')}>
                      {p.isActive ? '● Đang chạy' : '○ Tạm dừng'}
                    </span>
                    {p.endAt && (
                      <span className="text-xs text-slate-500">HSD: {formatDate(p.endAt, 'dd/MM/yyyy')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
