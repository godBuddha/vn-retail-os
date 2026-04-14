'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, MapPin, Phone, Mail, Globe, Building2, Save, Loader2, ArrowLeft, Edit2, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores';

export default function StoreSettingsPage() {
  const qc = useQueryClient();
  const { currentBranchId } = useAuthStore();
  const [editing, setEditing] = useState(false);

  const { data: branch, isLoading } = useQuery({
    queryKey: ['branch', currentBranchId],
    queryFn: () => api.get(`/branches/${currentBranchId}`).then(r => r.data),
    enabled: !!currentBranchId,
  });

  const [form, setForm] = useState<any>(null);
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const startEdit = () => {
    setForm({
      name: branch?.name || '',
      code: branch?.code || '',
      phone: branch?.phone || '',
      email: branch?.email || '',
      address: branch?.address || '',
      city: branch?.city || '',
      taxCode: branch?.taxCode || '',
      website: branch?.website || '',
    });
    setEditing(true);
  };

  const updateMut = useMutation({
    mutationFn: () => api.patch(`/branches/${currentBranchId}`, form),
    onSuccess: () => {
      toast.success('Cập nhật thông tin cửa hàng thành công!');
      qc.invalidateQueries({ queryKey: ['branch'] });
      setEditing(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi cập nhật'),
  });

  const fields = [
    { key: 'name', label: 'Tên cửa hàng', icon: Store, placeholder: 'VN Retail Shop' },
    { key: 'code', label: 'Mã chi nhánh', icon: Building2, placeholder: 'HN-001' },
    { key: 'phone', label: 'Số điện thoại', icon: Phone, placeholder: '024 1234 5678' },
    { key: 'email', label: 'Email', icon: Mail, placeholder: 'shop@company.com' },
    { key: 'address', label: 'Địa chỉ', icon: MapPin, placeholder: '123 Đường ABC, Phường XYZ' },
    { key: 'city', label: 'Thành phố', icon: MapPin, placeholder: 'Hà Nội' },
    { key: 'taxCode', label: 'Mã số thuế', icon: Building2, placeholder: '0123456789' },
    { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://shop.com' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Thông Tin Cửa Hàng</h1>
            <p className="text-slate-400 text-sm mt-0.5">Cập nhật thông tin chi nhánh / cửa hàng</p>
          </div>
        </div>
        {!editing && (
          <button onClick={startEdit} className="btn-primary">
            <Edit2 size={15} /> Chỉnh Sửa
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        ) : editing && form ? (
          <div className="space-y-4">
            {fields.map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key}>
                <label className="text-sm text-slate-400 mb-1 flex items-center gap-1.5">
                  <Icon size={12} /> {label}
                </label>
                <input className="input-dark" value={form[key] || ''} onChange={f(key)} placeholder={placeholder} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1 justify-center">Hủy</button>
              <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="btn-primary flex-1 justify-center">
                {updateMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Store name hero */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-700/30">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Store size={24} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{branch?.name || '—'}</h2>
                <p className="text-sm text-slate-400">Mã: <span className="font-mono">{branch?.code || '—'}</span></p>
              </div>
            </div>
            {/* Fields display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.filter(f => f.key !== 'name' && f.key !== 'code').map(({ key, label, icon: Icon }) => (
                <div key={key} className="bg-slate-800/30 rounded-xl p-3">
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Icon size={10} /> {label}</p>
                  <p className="text-sm text-slate-200">{(branch as any)?.[key] || '—'}</p>
                </div>
              ))}
            </div>
            {!branch?.name && (
              <div className="text-center py-4">
                <p className="text-slate-500 text-sm mb-3">Chưa có thông tin cửa hàng</p>
                <button onClick={startEdit} className="btn-primary mx-auto">
                  <Edit2 size={14} /> Thêm thông tin
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Receipt preview */}
      <div className="bg-slate-900 border border-slate-700/30 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <CheckCircle size={14} className="text-green-400" /> Hiển thị trên hóa đơn
        </h3>
        <div className="bg-slate-800/50 rounded-xl p-4 font-mono text-xs space-y-1 text-center text-slate-300">
          <p className="font-bold text-base text-white">{branch?.name || 'TÊN CỬA HÀNG'}</p>
          {branch?.address && <p>{branch.address}</p>}
          {branch?.city && <p>{branch.city}</p>}
          {branch?.phone && <p>ĐT: {branch.phone}</p>}
          {branch?.taxCode && <p>MST: {branch.taxCode}</p>}
        </div>
      </div>
    </div>
  );
}
