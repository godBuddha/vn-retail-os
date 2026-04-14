'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Users, Star, Phone, Mail,
  Crown, Award, Gift, Loader2, X, Eye,
  Edit2, Trash2, Save, ShoppingBag, TrendingUp,
  Calendar, ChevronRight, MapPin,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIER_CFG: Record<string, { label: string; color: string; icon: any; bg: string; border: string }> = {
  NEW:      { label: 'Mới',      color: 'text-slate-400',  icon: Users,  bg: 'bg-slate-500/20', border: 'border-slate-500/30' },
  SILVER:   { label: 'Bạc',      color: 'text-slate-300',  icon: Star,   bg: 'bg-slate-400/20', border: 'border-slate-400/30' },
  GOLD:     { label: 'Vàng',     color: 'text-yellow-400', icon: Crown,  bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  PLATINUM: { label: 'Bạch Kim', color: 'text-cyan-300',   icon: Award,  bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  VIP:      { label: 'VIP',      color: 'text-purple-400', icon: Gift,   bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
};

// ─── Customer Form Modal ──────────────────────────────────────────────────────
function CustomerModal({ customer, onClose, onSuccess }: {
  customer?: any; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
    tier: customer?.tier || 'NEW',
  });
  const [loading, setLoading] = useState(false);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên khách hàng');
    setLoading(true);
    try {
      if (isEdit) {
        await api.patch(`/customers/${customer.id}`, form);
        toast.success('Cập nhật thành công!');
      } else {
        await api.post('/customers', form);
        toast.success('Thêm khách hàng thành công!');
      }
      onSuccess(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Users size={16} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Họ tên <span className="text-red-400">*</span></label>
            <input className="input-dark" placeholder="Nguyễn Văn A" value={form.name} onChange={f('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Số điện thoại</label>
              <input className="input-dark" placeholder="0901234567" value={form.phone} onChange={f('phone')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Email</label>
              <input className="input-dark" type="email" placeholder="khach@email.com" value={form.email} onChange={f('email')} />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Địa chỉ</label>
            <input className="input-dark" placeholder="123 Đường ABC, Q1, TP.HCM" value={form.address} onChange={f('address')} />
          </div>
          {isEdit && (
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Hạng thành viên</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(TIER_CFG).map(([k, v]) => {
                  const TIcon = v.icon;
                  return (
                    <button key={k} type="button" onClick={() => setForm(p => ({ ...p, tier: k }))}
                      className={cn('py-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1',
                        form.tier === k ? `${v.bg} ${v.border} ${v.color}` : 'border-slate-600 text-slate-500 hover:bg-slate-800')}>
                      <TIcon size={14} />
                      <span className="text-xs">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Ghi chú</label>
            <textarea className="input-dark resize-none h-16" placeholder="Ghi chú về khách hàng..." value={form.notes} onChange={f('notes')} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 size={16} className="animate-spin" /> : isEdit ? <Save size={16} /> : <Plus size={16} />}
              {isEdit ? 'Lưu Thay Đổi' : 'Thêm Khách Hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Customer Detail Drawer ───────────────────────────────────────────────────
function CustomerDrawer({ customer, onClose, onEdit }: { customer: any; onClose: () => void; onEdit: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['customer-detail', customer.id],
    queryFn: () => api.get(`/customers/${customer.id}`).then(r => r.data),
  });

  const t = TIER_CFG[customer.tier] || TIER_CFG.NEW;
  const TIcon = t.icon;
  const recentOrders: any[] = detail?.orders?.slice(0, 5) || [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <Edit2 size={12} /> Sửa thông tin
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={16} /></button>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0', t.bg, t.color)}>
              {customer.name[0]}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{customer.name}</p>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', t.bg, t.color, t.border)}>
                <TIcon size={10} /> {t.label}
              </span>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{customer.code}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Contact */}
          <div className="space-y-2 mb-5">
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-slate-500" />
                <span className="text-slate-300">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-slate-500" />
                <span className="text-slate-300">{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">{customer.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-slate-500" />
              <span className="text-slate-400">Tham gia {formatDate(customer.createdAt, 'dd/MM/yyyy')}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { icon: ShoppingBag, label: 'Đơn hàng', value: customer.totalOrders || 0, color: 'text-blue-400' },
              { icon: TrendingUp, label: 'Chi tiêu', value: formatCurrency(Number(customer.totalSpent || 0)), color: 'text-violet-400' },
              { icon: Star, label: 'Điểm tích', value: `⭐ ${(customer.points || 0).toLocaleString()}`, color: 'text-yellow-400' },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
                <s.icon size={16} className={cn('mx-auto mb-1', s.color)} />
                <p className={cn('text-sm font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent orders */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ShoppingBag size={14} className="text-violet-400" /> Đơn Hàng Gần Đây
            </h4>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-violet-400" /></div>
            ) : recentOrders.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">Chưa có đơn hàng nào</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/20">
                    <div>
                      <p className="text-xs font-mono text-violet-400">{o.code}</p>
                      <p className="text-xs text-slate-500">{formatDate(o.createdAt, 'dd/MM/yy HH:mm')}</p>
                    </div>
                    <span className="text-sm font-bold text-white">{formatCurrency(Number(o.total))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {customer.notes && (
            <div className="mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <p className="text-xs text-slate-400 mb-1">Ghi chú</p>
              <p className="text-sm text-slate-300">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [modalCustomer, setModalCustomer] = useState<any>(null); // null=closed
  const [viewCustomer, setViewCustomer] = useState<any>(null);
  const [editFromView, setEditFromView] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, tier, page],
    queryFn: () => api.get('/customers', { params: { search, tier, page, limit: 20 } }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: () => api.get('/customers/stats').then(r => r.data).catch(() => ({})),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => { toast.success('Đã xóa khách hàng'); qc.invalidateQueries({ queryKey: ['customers'] }); },
    onError: () => toast.error('Không thể xóa khách hàng'),
  });

  const customers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const topCustomers: any[] = stats?.topCustomers || [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['customers'] });

  return (
    <div className="space-y-6">
      {modalCustomer !== null && (
        <CustomerModal
          customer={modalCustomer?.id ? modalCustomer : undefined}
          onClose={() => { setModalCustomer(null); setEditFromView(false); }}
          onSuccess={() => { refresh(); if (editFromView) setViewCustomer(null); }}
        />
      )}
      {viewCustomer && !editFromView && (
        <CustomerDrawer
          customer={viewCustomer}
          onClose={() => setViewCustomer(null)}
          onEdit={() => { setModalCustomer(viewCustomer); setEditFromView(true); setViewCustomer(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Khách Hàng</h1>
          <p className="text-slate-400 text-sm mt-1">{total.toLocaleString()} khách hàng</p>
        </div>
        <button onClick={() => setModalCustomer({})} className="btn-primary">
          <Plus size={16} /> Thêm Khách Hàng
        </button>
      </div>

      {/* Top customers row */}
      {topCustomers.length > 0 && (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <Crown size={14} className="text-yellow-400" /> TOP KHÁCH CHI TIÊU NHIỀU NHẤT
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {topCustomers.map((c: any, i: number) => {
              const t = TIER_CFG[c.tier] || TIER_CFG.NEW;
              const TierIcon = t.icon;
              return (
                <button key={c.id} onClick={() => setViewCustomer(c)}
                  className={cn('flex-shrink-0 flex items-center gap-3 p-3 rounded-xl border min-w-52 transition-all hover:scale-105', t.bg, t.border)}>
                  <div className="relative">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold', t.bg, t.color)}>
                      {c.name[0]}
                    </div>
                    {i < 3 && (
                      <span className="absolute -top-1 -right-1 text-xs">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <p className={cn('text-xs font-medium flex items-center gap-1', t.color)}>
                      <TierIcon size={10} /> {t.label}
                    </p>
                    <p className="text-xs text-violet-400 font-bold">{formatCurrency(Number(c.totalSpent))}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-dark pl-9" placeholder="Tìm tên, SĐT, email, mã KH..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-dark w-44" value={tier} onChange={e => { setTier(e.target.value); setPage(1); }}>
          <option value="">Tất cả hạng</option>
          {Object.entries(TIER_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Khách Hàng</th>
                <th className="px-5 py-3">Liên Hệ</th>
                <th className="px-5 py-3">Hạng</th>
                <th className="px-5 py-3 text-right">Tổng Chi Tiêu</th>
                <th className="px-5 py-3 text-center">Đơn Hàng</th>
                <th className="px-5 py-3 text-center">Điểm</th>
                <th className="px-5 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <Loader2 size={28} className="animate-spin text-violet-400 mx-auto" />
                </td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500">
                  <Users size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="mb-3">Chưa có khách hàng nào</p>
                  <button onClick={() => setModalCustomer({})} className="btn-primary mx-auto text-sm">
                    <Plus size={14} /> Thêm ngay
                  </button>
                </td></tr>
              ) : customers.map((c: any) => {
                const t = TIER_CFG[c.tier] || TIER_CFG.NEW;
                const TierIcon = t.icon;
                return (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setViewCustomer(c)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0', t.bg, t.color)}>
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{c.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{c.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {c.phone && <p className="text-slate-300 flex items-center gap-1 text-xs"><Phone size={11} /> {c.phone}</p>}
                      {c.email && <p className="text-slate-400 flex items-center gap-1 text-xs mt-0.5"><Mail size={11} /> {c.email}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', t.bg, t.color, t.border)}>
                        <TierIcon size={11} /> {t.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-violet-400">{formatCurrency(Number(c.totalSpent))}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-slate-300">{c.totalOrders}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-medium">
                        ⭐ {(c.points || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewCustomer(c)}
                          className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-400/10 rounded-lg transition-all" title="Xem chi tiết">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => setModalCustomer(c)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all" title="Sửa">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => confirm(`Xóa khách hàng "${c.name}"?`) && deleteMut.mutate(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/30">
            <p className="text-sm text-slate-400">Trang {page}/{totalPages} — {total} khách</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm text-slate-300 bg-slate-800 border border-slate-600 rounded-lg disabled:opacity-40">←</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm text-slate-300 bg-slate-800 border border-slate-600 rounded-lg disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
