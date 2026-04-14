'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Truck, Phone, Mail, Building2,
  DollarSign, Package, Edit2, Trash2, Loader2, X, CheckCircle, Save,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Shared Modal ──────────────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose, onSuccess }: {
  supplier?: any; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name: supplier?.name || '',
    contactName: supplier?.contactName || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    taxCode: supplier?.taxCode || '',
    bankAccount: supplier?.bankAccount || '',
    bankName: supplier?.bankName || '',
    notes: supplier?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên nhà cung cấp');
    setLoading(true);
    try {
      if (isEdit) {
        await api.patch(`/suppliers/${supplier.id}`, form);
        toast.success('Cập nhật thành công!');
      } else {
        await api.post('/suppliers', form);
        toast.success('Thêm nhà cung cấp thành công!');
      }
      onSuccess(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Truck size={16} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? 'Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm text-slate-400 mb-1 block">Tên nhà cung cấp <span className="text-red-400">*</span></label>
              <input className="input-dark" placeholder="Công Ty TNHH ABC" value={form.name} onChange={f('name')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Người liên hệ</label>
              <input className="input-dark" placeholder="Nguyễn Văn A" value={form.contactName} onChange={f('contactName')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Số điện thoại</label>
              <input className="input-dark" placeholder="0901234567" value={form.phone} onChange={f('phone')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Email</label>
              <input className="input-dark" type="email" placeholder="contact@abc.com" value={form.email} onChange={f('email')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Mã số thuế</label>
              <input className="input-dark" placeholder="0123456789" value={form.taxCode} onChange={f('taxCode')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Số tài khoản</label>
              <input className="input-dark" placeholder="123456789012" value={form.bankAccount} onChange={f('bankAccount')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Ngân hàng</label>
              <input className="input-dark" placeholder="Vietcombank" value={form.bankName} onChange={f('bankName')} />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-400 mb-1 block">Địa chỉ</label>
              <input className="input-dark" placeholder="123 Đường ABC, Q1, TP.HCM" value={form.address} onChange={f('address')} />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-400 mb-1 block">Ghi chú</label>
              <textarea className="input-dark resize-none h-16" value={form.notes} onChange={f('notes')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 size={16} className="animate-spin" /> : isEdit ? <Save size={16} /> : <CheckCircle size={16} />}
              {isEdit ? 'Lưu Thay Đổi' : 'Thêm Nhà Cung Cấp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalSupplier, setModalSupplier] = useState<any | null>(null); // null=closed, {}=add, {id,...}=edit

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, page],
    queryFn: () => api.get('/suppliers', { params: { search, page, limit: 20 } }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { toast.success('Đã xóa nhà cung cấp'); qc.invalidateQueries({ queryKey: ['suppliers'] }); },
    onError: () => toast.error('Không thể xóa — còn đơn nhập liên kết'),
  });

  const suppliers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const refresh = () => qc.invalidateQueries({ queryKey: ['suppliers'] });

  return (
    <div className="space-y-6">
      {modalSupplier !== null && (
        <SupplierModal
          supplier={modalSupplier?.id ? modalSupplier : undefined}
          onClose={() => setModalSupplier(null)}
          onSuccess={refresh}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nhà Cung Cấp</h1>
          <p className="text-slate-400 text-sm mt-1">{total} nhà cung cấp</p>
        </div>
        <button onClick={() => setModalSupplier({})} className="btn-primary">
          <Plus size={16} /> Thêm Nhà CC
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input-dark pl-9" placeholder="Tìm tên, mã, SĐT, email..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Nhà Cung Cấp</th>
                <th className="px-5 py-3">Liên Hệ</th>
                <th className="px-5 py-3">Ngân Hàng</th>
                <th className="px-5 py-3 text-center">Đơn Nhập</th>
                <th className="px-5 py-3 text-right">Công Nợ</th>
                <th className="px-5 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center"><Loader2 size={28} className="animate-spin text-violet-400 mx-auto" /></td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-500">
                  <Truck size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="mb-3">Chưa có nhà cung cấp nào</p>
                  <button onClick={() => setModalSupplier({})} className="btn-primary mx-auto text-sm">
                    <Plus size={14} /> Thêm ngay
                  </button>
                </td></tr>
              ) : suppliers.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                        <Building2 size={15} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{s.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{s.code}</p>
                        {s.taxCode && <p className="text-xs text-slate-600">MST: {s.taxCode}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {s.contactName && <p className="text-slate-300 text-sm">{s.contactName}</p>}
                    {s.phone && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Phone size={11} /> {s.phone}</p>}
                    {s.email && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Mail size={11} /> {s.email}</p>}
                    {s.address && <p className="text-xs text-slate-600 mt-0.5 truncate max-w-40">{s.address}</p>}
                  </td>
                  <td className="px-5 py-4">
                    {s.bankAccount ? (
                      <div>
                        <p className="text-xs text-slate-300">{s.bankName || '—'}</p>
                        <p className="text-xs text-slate-500 font-mono">{s.bankAccount}</p>
                      </div>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-slate-300 text-sm">
                      <Package size={13} className="text-slate-500" /> {s._count?.purchaseOrders || 0}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={cn('font-bold text-sm', Number(s.debtBalance) > 0 ? 'text-red-400' : 'text-slate-500')}>
                      {Number(s.debtBalance) > 0 ? formatCurrency(Number(s.debtBalance)) : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModalSupplier(s)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                        title="Sửa"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => confirm(`Xóa "${s.name}"?`) && deleteMut.mutate(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/30">
            <p className="text-sm text-slate-400">Trang {page}/{totalPages} — {total} NCC</p>
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
