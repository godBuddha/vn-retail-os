'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { getInitials, getRoleLabel } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const updateMut = useMutation({
    mutationFn: () => api.patch(`/users/${user?.id}`, form),
    onSuccess: (res) => {
      toast.success('Cập nhật hồ sơ thành công!');
      updateUser(res.data);
    },
    onError: () => toast.error('Cập nhật thất bại'),
  });

  const pwMut = useMutation({
    mutationFn: () => {
      if (pwForm.newPassword !== pwForm.confirm) throw new Error('Mật khẩu không khớp');
      if (pwForm.newPassword.length < 6) throw new Error('Tối thiểu 6 ký tự');
      return api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
    },
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: (err: any) => toast.error(err.message || err.response?.data?.message || 'Lỗi'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Hồ Sơ Cá Nhân</h1>
          <p className="text-slate-400 text-sm mt-0.5">Cập nhật thông tin tài khoản của bạn</p>
        </div>
      </div>

      {/* Avatar + basic */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-700/30">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {getInitials(user?.firstName || '', user?.lastName || '')}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{user?.lastName} {user?.firstName}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">
              {getRoleLabel(user?.role || '')}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Họ</label>
              <input className="input-dark" value={form.lastName} onChange={f('lastName')} placeholder="Nguyễn" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tên</label>
              <input className="input-dark" value={form.firstName} onChange={f('firstName')} placeholder="Văn A" />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 flex items-center gap-1.5"><Mail size={12} /> Email (không thể thay đổi)</label>
            <input className="input-dark opacity-50 cursor-not-allowed" value={user?.email || ''} readOnly />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 flex items-center gap-1.5"><Phone size={12} /> Số điện thoại</label>
            <input className="input-dark" value={form.phone} onChange={f('phone')} placeholder="0901234567" />
          </div>
          <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
            className="btn-primary w-full justify-center">
            {updateMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Lưu Thay Đổi
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-5 flex items-center gap-2"><Lock size={16} className="text-yellow-400" /> Đổi Mật Khẩu</h2>
        <div className="space-y-4">
          {[
            { key: 'currentPassword', label: 'Mật khẩu hiện tại' },
            { key: 'newPassword', label: 'Mật khẩu mới (tối thiểu 6 ký tự)' },
            { key: 'confirm', label: 'Xác nhận mật khẩu mới' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm text-slate-400 mb-1 block">{label}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input-dark pr-10"
                  value={(pwForm as any)[key]}
                  onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))} />
                {key === 'newPassword' && (
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {pwForm.newPassword && pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
            <p className="text-xs text-red-400">Mật khẩu không khớp</p>
          )}
          <button onClick={() => pwMut.mutate()} disabled={pwMut.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirm}
            className="w-full py-2.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {pwMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Đổi Mật Khẩu
          </button>
        </div>
      </div>
    </div>
  );
}
