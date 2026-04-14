'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, GitBranch, MapPin, Phone, Mail, Clock,
  Users, Package, CheckCircle, Loader2, X, Edit2, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function AddBranchModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', phone: '', email: '',
    openTime: '08:00', closeTime: '22:00', taxCode: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return toast.error('Nhập tên và mã chi nhánh');
    setLoading(true);
    try {
      await api.post('/branches', form);
      toast.success('Tạo chi nhánh thành công!');
      onSuccess(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo chi nhánh');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900">
          <h2 className="text-lg font-bold text-white">Thêm Chi Nhánh</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm text-slate-400 mb-1 block">Tên chi nhánh *</label>
              <input className="input-dark" placeholder="Chi Nhánh Quận 1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Mã chi nhánh *</label>
              <input className="input-dark uppercase" placeholder="CN001" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Số điện thoại</label>
              <input className="input-dark" placeholder="028 1234 5678" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-400 mb-1 block">Địa chỉ</label>
              <input className="input-dark" placeholder="123 Đường ABC, Q1" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Thành phố</label>
              <input className="input-dark" placeholder="TP.HCM" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Email</label>
              <input className="input-dark" type="email" placeholder="cn1@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Giờ mở cửa</label>
              <input className="input-dark" type="time" value={form.openTime} onChange={e => setForm(p => ({ ...p, openTime: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Giờ đóng cửa</label>
              <input className="input-dark" type="time" value={form.closeTime} onChange={e => setForm(p => ({ ...p, closeTime: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-400 mb-1 block">Mã số thuế</label>
              <input className="input-dark" placeholder="01234567890" value={form.taxCode} onChange={e => setForm(p => ({ ...p, taxCode: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Tạo Chi Nhánh
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['branches', search],
    queryFn: () => api.get('/branches', { params: { search, limit: 50 } })
      .then(r => r.data).catch(() => ({ data: [], total: 0 })),
  });

  const branches: any[] = data?.data || [];
  const total = data?.total || branches.length;

  return (
    <div className="space-y-6">
      {showAdd && <AddBranchModal onClose={() => setShowAdd(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ['branches'] })} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Chi Nhánh</h1>
          <p className="text-slate-400 text-sm mt-1">{total} chi nhánh trong hệ thống</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Thêm Chi Nhánh</button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input-dark pl-9" placeholder="Tìm tên, mã chi nhánh..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="py-20 text-center"><Loader2 size={32} className="animate-spin text-violet-400 mx-auto" /></div>
      ) : branches.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          <GitBranch size={40} className="mx-auto mb-2 opacity-30" />
          <p>Chưa có chi nhánh nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((b: any) => (
            <div key={b.id} className={cn(
              'bg-slate-900 border rounded-2xl p-5 transition-all hover:border-slate-600',
              b.isDefault ? 'border-violet-500/40' : 'border-slate-700/50'
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    b.isDefault ? 'bg-violet-500/20' : 'bg-slate-700/50')}>
                    <GitBranch size={18} className={b.isDefault ? 'text-violet-400' : 'text-slate-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{b.name}</p>
                      {b.isDefault && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                    </div>
                    <code className="text-xs text-slate-500 font-mono">{b.code}</code>
                  </div>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  b.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400')}>
                  {b.isActive ? '● Hoạt động' : '○ Tạm đóng'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {b.address && (
                  <div className="flex items-start gap-2 text-slate-400">
                    <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{b.address}{b.city ? `, ${b.city}` : ''}</span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone size={13} className="flex-shrink-0" />
                    <span className="text-xs">{b.phone}</span>
                  </div>
                )}
                {b.email && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail size={13} className="flex-shrink-0" />
                    <span className="text-xs">{b.email}</span>
                  </div>
                )}
                {(b.openTime || b.closeTime) && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={13} className="flex-shrink-0" />
                    <span className="text-xs">{b.openTime} — {b.closeTime}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                <div className="flex gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users size={11} /> {b._count?.userBranches || b.userBranches?.length || 0} nhân viên</span>
                  <span className="flex items-center gap-1"><Package size={11} /> {b._count?.inventory || b.inventory?.length || 0} SP</span>
                </div>
                <button className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all">
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
