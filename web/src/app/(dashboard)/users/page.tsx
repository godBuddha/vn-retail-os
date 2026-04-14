'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, UserCog, Shield, Mail, Phone,
  Calendar, Loader2, Edit2, Trash2, CheckCircle, X,
  ToggleLeft, ToggleRight, Key, Save, Eye, EyeOff, Lock,
} from 'lucide-react';
import { formatDate, cn, getRoleLabel, getInitials } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Constants ─────────────────────────────────────────────────────────────────
const ROLES = ['SUPER_ADMIN','BRANCH_ADMIN','MANAGER','CASHIER','WAREHOUSE','ACCOUNTANT','READONLY'];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:  'bg-red-500/20 text-red-300 border-red-500/30',
  BRANCH_ADMIN: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  MANAGER:      'bg-violet-500/20 text-violet-300 border-violet-500/30',
  CASHIER:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  WAREHOUSE:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  ACCOUNTANT:   'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  READONLY:     'bg-slate-600 text-slate-300 border-slate-500/30',
};

// ─── User Modal (Add / Edit) ──────────────────────────────────────────────────
function UserModal({ user, onClose, onSuccess }: {
  user?: any; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'CASHIER',
    password: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName) return toast.error('Nhập tên người dùng');
    if (!isEdit && !form.email) return toast.error('Nhập email');
    setLoading(true);
    try {
      if (isEdit) {
        const payload: any = { firstName: form.firstName, lastName: form.lastName, phone: form.phone, role: form.role };
        await api.patch(`/users/${user.id}`, payload);
        toast.success('Cập nhật thành công!');
      } else {
        await api.post('/users', { ...form, password: form.password || 'changeme123' });
        toast.success(`Tạo thành công! MK mặc định: ${form.password || 'changeme123'}`);
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
              <UserCog size={16} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? 'Sửa Người Dùng' : 'Thêm Người Dùng'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isEdit && (
            <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
              <Mail size={13} className="text-slate-500" />
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Họ</label>
              <input className="input-dark" placeholder="Nguyễn" value={form.lastName} onChange={f('lastName')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tên <span className="text-red-400">*</span></label>
              <input className="input-dark" placeholder="Văn A" value={form.firstName} onChange={f('firstName')} />
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Email <span className="text-red-400">*</span></label>
              <input type="email" className="input-dark" placeholder="user@company.com" value={form.email} onChange={f('email')} />
            </div>
          )}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Số điện thoại</label>
            <input className="input-dark" placeholder="0901234567" value={form.phone} onChange={f('phone')} />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Vai trò</label>
            <div className="grid grid-cols-4 gap-1.5">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))}
                  className={cn('py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center',
                    form.role === r ? ROLE_COLORS[r] : 'border-slate-600 text-slate-500 hover:bg-slate-800')}>
                  {getRoleLabel(r)}
                </button>
              ))}
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1.5">
                <Key size={12} /> Mật khẩu (để trống → changeme123)
              </label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input-dark pr-10"
                  placeholder="changeme123" value={form.password} onChange={f('password')} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 size={16} className="animate-spin" /> : isEdit ? <Save size={16} /> : <CheckCircle size={16} />}
              {isEdit ? 'Lưu Thay Đổi' : 'Tạo Người Dùng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw || newPw.length < 6) return toast.error('Mật khẩu tối thiểu 6 ký tự');
    setLoading(true);
    try {
      await api.patch(`/users/${user.id}/reset-password`, { newPassword: newPw });
      toast.success('Đổi mật khẩu thành công!');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Lock size={16} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Đặt Lại Mật Khẩu</h2>
              <p className="text-xs text-slate-400">{user.lastName} {user.firstName} · {user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleReset} className="p-5 space-y-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300">
            ⚠️ Mật khẩu sẽ được đặt lại ngay lập tức. Thông báo cho người dùng mật khẩu mới.
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Mật khẩu mới <span className="text-red-400">*</span></label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input-dark pr-10"
                placeholder="Tối thiểu 6 ký tự" value={newPw} onChange={e => setNewPw(e.target.value)} autoFocus />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
            <button type="submit" disabled={loading || newPw.length < 6}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              Đặt Lại
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [modalUser, setModalUser] = useState<any>(null);   // null=closed, {}=add, {id,...}=edit
  const [resetUser, setResetUser] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, role, page],
    queryFn: () => api.get('/users', { params: { search, role, page, limit: 20 } }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: () => toast.error('Không thể cập nhật'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { toast.success('Đã xóa người dùng'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Không thể xóa tài khoản này'),
  });

  const users = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const activeCount = users.filter((u: any) => u.isActive).length;
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  return (
    <div className="space-y-6">
      {modalUser !== null && (
        <UserModal
          user={modalUser?.id ? modalUser : undefined}
          onClose={() => setModalUser(null)}
          onSuccess={refresh}
        />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Người Dùng</h1>
          <p className="text-slate-400 text-sm mt-1">
            {total} tài khoản · <span className="text-green-400">{activeCount} đang hoạt động</span>
          </p>
        </div>
        <button onClick={() => setModalUser({})} className="btn-primary">
          <Plus size={16} /> Thêm Người Dùng
        </button>
      </div>

      {/* Role stats */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(ROLE_COLORS).map(([r, color]) => {
          const count = users.filter((u: any) => u.role === r).length;
          if (count === 0) return null;
          return (
            <button key={r} onClick={() => setRole(role === r ? '' : r)}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                role === r ? color : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500')}>
              <Shield size={11} />
              {getRoleLabel(r)}
              <span className="bg-black/20 px-1.5 py-0.5 rounded-full">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-dark pl-9" placeholder="Tìm tên, email, SĐT..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-dark w-48" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}>
          <option value="">Tất cả vai trò</option>
          {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Người Dùng</th>
                <th className="px-5 py-3">Vai Trò</th>
                <th className="px-5 py-3">Chi Nhánh</th>
                <th className="px-5 py-3">Liên Hệ</th>
                <th className="px-5 py-3">Đăng Nhập Cuối</th>
                <th className="px-5 py-3 text-center">Trạng Thái</th>
                <th className="px-5 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 size={28} className="animate-spin text-violet-400 mx-auto" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500">
                  <UserCog size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="mb-3">Không có người dùng nào</p>
                  <button onClick={() => setModalUser({})} className="btn-primary mx-auto text-sm">
                    <Plus size={14} /> Thêm ngay
                  </button>
                </td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0',
                        u.isActive ? 'bg-gradient-to-br from-violet-600/60 to-blue-600/60' : 'bg-slate-700')}>
                        {getInitials(u.firstName || '', u.lastName || '')}
                      </div>
                      <div>
                        <p className={cn('font-medium', u.isActive ? 'text-white' : 'text-slate-500')}>
                          {u.lastName} {u.firstName}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Mail size={10} /> {u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', ROLE_COLORS[u.role] || 'bg-slate-700 text-slate-300 border-slate-600')}>
                      <Shield size={10} /> {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-0.5">
                      {u.userBranches?.slice(0, 2).map((ub: any) => (
                        <span key={ub.id} className="block text-xs text-slate-400">{ub.branch?.name}</span>
                      ))}
                      {(u.userBranches?.length || 0) > 2 && (
                        <span className="text-xs text-slate-600">+{u.userBranches.length - 2} nữa</span>
                      )}
                      {(!u.userBranches || u.userBranches.length === 0) && (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {u.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} /> {u.phone}</p>}
                  </td>
                  <td className="px-5 py-4">
                    {u.lastLoginAt ? (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={10} /> {formatDate(u.lastLoginAt, 'dd/MM/yyyy HH:mm')}
                      </p>
                    ) : <span className="text-xs text-slate-600">Chưa đăng nhập</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => toggleMut.mutate({ id: u.id, isActive: !u.isActive })}
                      title={u.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      className="transition-all hover:opacity-80"
                    >
                      {u.isActive
                        ? <ToggleRight size={24} className="text-green-400" />
                        : <ToggleLeft size={24} className="text-slate-500" />}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setResetUser(u)}
                        className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all"
                        title="Đặt lại mật khẩu">
                        <Key size={14} />
                      </button>
                      <button onClick={() => setModalUser(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                        title="Sửa">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => confirm(`Xóa tài khoản "${u.email}"?\nHành động này không thể khôi phục.`) && deleteMut.mutate(u.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Xóa">
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
            <p className="text-sm text-slate-400">Trang {page}/{totalPages} — {total} người dùng</p>
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
