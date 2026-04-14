'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Users, Briefcase, Phone, Mail,
  Calendar, DollarSign, Award, Loader2, X, CheckCircle,
  Clock, TrendingUp, Edit2, Trash2, Save, ToggleLeft, ToggleRight,
  UserCheck, ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE:     { label: 'Đang làm', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: UserCheck },
  INACTIVE:   { label: 'Ngưng làm', color: 'bg-slate-600 text-slate-300 border-slate-500/30', icon: Clock },
  ON_LEAVE:   { label: 'Nghỉ phép', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Calendar },
  TERMINATED: { label: 'Đã nghỉ việc', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: X },
};

const DEPARTMENTS = ['Bán hàng', 'Kho hàng', 'Kế toán', 'Quản lý', 'IT', 'Marketing', 'Nhân sự'];

// ─── Employee Modal ────────────────────────────────────────────────────────────
function EmployeeModal({ emp, branchId, onClose, onSuccess }: {
  emp?: any; branchId: string; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!emp;
  const [form, setForm] = useState({
    firstName: emp?.firstName || '',
    lastName: emp?.lastName || '',
    phone: emp?.phone || '',
    email: emp?.email || '',
    department: emp?.department || '',
    position: emp?.position || '',
    baseSalary: emp?.baseSalary || '',
    startDate: emp?.startDate ? emp.startDate.slice(0, 10) : '',
    status: emp?.status || 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName) return toast.error('Nhập tên nhân viên');
    setLoading(true);
    try {
      if (isEdit) {
        await api.patch(`/employees/${emp.id}`, {
          ...form,
          baseSalary: form.baseSalary ? Number(form.baseSalary) : 0,
          startDate: form.startDate || null,
        });
        toast.success('Cập nhật nhân viên thành công!');
      } else {
        await api.post('/employees', {
          ...form, branchId,
          baseSalary: form.baseSalary ? Number(form.baseSalary) : 0,
          startDate: form.startDate || null,
          code: `NV${Date.now()}`,
        });
        toast.success('Thêm nhân viên thành công!');
      }
      onSuccess(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Briefcase size={16} className="text-blue-400" />
            </div>
            <h2 className="text-base font-bold text-white">{isEdit ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
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
          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Số điện thoại</label>
              <input className="input-dark" placeholder="0901234567" value={form.phone} onChange={f('phone')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Email</label>
              <input type="email" className="input-dark" placeholder="nv@company.com" value={form.email} onChange={f('email')} />
            </div>
          </div>
          {/* Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Phòng ban</label>
              <select className="input-dark" value={form.department} onChange={f('department')}>
                <option value="">-- Chọn phòng ban --</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Chức vụ</label>
              <input className="input-dark" placeholder="Nhân viên" value={form.position} onChange={f('position')} />
            </div>
          </div>
          {/* Salary + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1"><DollarSign size={12} /> Lương cơ bản (đ)</label>
              <input type="number" className="input-dark" placeholder="5000000" value={form.baseSalary} onChange={f('baseSalary')} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1"><Calendar size={12} /> Ngày bắt đầu</label>
              <input type="date" className="input-dark" value={form.startDate} onChange={f('startDate')} />
            </div>
          </div>
          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Trạng thái</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setForm(p => ({ ...p, status: k }))}
                    className={cn('py-2 px-3 text-xs font-medium rounded-xl border transition-all text-left flex items-center gap-2',
                      form.status === k ? v.color : 'border-slate-600 text-slate-500 hover:bg-slate-800')}>
                    <v.icon size={12} /> {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Preview salary */}
          {form.baseSalary && (
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-sm">
              <span className="text-slate-400">Lương tháng ước tính: </span>
              <span className="text-violet-300 font-bold">{formatCurrency(Number(form.baseSalary))}</span>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 size={16} className="animate-spin" /> : isEdit ? <Save size={16} /> : <CheckCircle size={16} />}
              {isEdit ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employee Detail Drawer ────────────────────────────────────────────────────
function EmployeeDrawer({ emp, onClose, onEdit }: { emp: any; onClose: () => void; onEdit: () => void }) {
  const st = STATUS_CONFIG[emp.status] || STATUS_CONFIG.ACTIVE;
  const tenure = emp.startDate
    ? Math.floor((Date.now() - new Date(emp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700/50 p-5 flex items-center justify-between z-10">
          <h2 className="font-bold text-white">Hồ Sơ Nhân Viên</h2>
          <div className="flex gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg bg-blue-400/10 transition-colors">
              <Edit2 size={12} /> Sửa
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar + basic info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/50 to-violet-600/50 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
              {(emp.firstName || ' ')[0]}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{emp.lastName} {emp.firstName}</h3>
              <p className="text-sm text-slate-400">{emp.position || 'Nhân viên'}{emp.department ? ` · ${emp.department}` : ''}</p>
              <span className={cn('inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-medium border', st.color)}>
                <st.icon size={11} /> {st.label}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Lương cơ bản</p>
              <p className="text-base font-bold text-violet-400">{formatCurrency(Number(emp.baseSalary || 0))}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Thâm niên</p>
              <p className="text-base font-bold text-blue-400">{tenure !== null ? `${tenure} tháng` : '—'}</p>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 divide-y divide-slate-700/20">
            <div className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liên hệ</div>
            {emp.phone && (
              <div className="px-4 py-3 flex items-center gap-3">
                <Phone size={14} className="text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-300">{emp.phone}</span>
              </div>
            )}
            {emp.email && (
              <div className="px-4 py-3 flex items-center gap-3">
                <Mail size={14} className="text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-300">{emp.email}</span>
              </div>
            )}
            <div className="px-4 py-3 flex items-center gap-3">
              <Briefcase size={14} className="text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-300">Mã: <span className="font-mono">{emp.code}</span></span>
            </div>
            {emp.startDate && (
              <div className="px-4 py-3 flex items-center gap-3">
                <Calendar size={14} className="text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-300">Vào làm: {formatDate(emp.startDate, 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>

          {/* Salary breakdown */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 divide-y divide-slate-700/20">
            <div className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bảng lương ước tính</div>
            {[
              { label: 'Lương cơ bản', value: Number(emp.baseSalary || 0), color: 'text-white' },
              { label: 'Bảo hiểm XH (8%)', value: -(Number(emp.baseSalary || 0) * 0.08), color: 'text-red-400' },
              { label: 'Bảo hiểm YT (1.5%)', value: -(Number(emp.baseSalary || 0) * 0.015), color: 'text-red-400' },
              { label: 'Thực lĩnh (ước)', value: Number(emp.baseSalary || 0) * 0.905, color: 'text-green-400' },
            ].map(row => (
              <div key={row.label} className="px-4 py-2.5 flex justify-between text-sm">
                <span className="text-slate-400">{row.label}</span>
                <span className={cn('font-medium', row.color)}>{formatCurrency(Math.abs(row.value))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HRPage() {
  const { currentBranchId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modalEmp, setModalEmp] = useState<any>(null);   // null=closed, {}=add, {...}=edit
  const [detailEmp, setDetailEmp] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, status, page, currentBranchId],
    queryFn: () => api.get('/employees', {
      params: { search, status, page, limit: 20, branchId: currentBranchId }
    }).then(r => r.data).catch(() => ({ data: [], total: 0 })),
    enabled: !!currentBranchId,
    placeholderData: (prev: any) => prev,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => { toast.success('Đã xóa nhân viên'); refresh(); },
    onError: () => toast.error('Không thể xóa nhân viên'),
  });

  const employees: any[] = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const activeCount = employees.filter((e: any) => e.status === 'ACTIVE').length;
  const totalSalary = employees.filter((e: any) => e.status === 'ACTIVE')
    .reduce((s: number, e: any) => s + Number(e.baseSalary || 0), 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ['employees'] });

  return (
    <div className="space-y-6">
      {modalEmp !== null && (
        <EmployeeModal
          emp={modalEmp?.id ? modalEmp : undefined}
          branchId={currentBranchId || ''}
          onClose={() => setModalEmp(null)}
          onSuccess={() => { refresh(); if (detailEmp) setDetailEmp(null); }}
        />
      )}
      {detailEmp && (
        <EmployeeDrawer
          emp={detailEmp}
          onClose={() => setDetailEmp(null)}
          onEdit={() => { setModalEmp(detailEmp); setDetailEmp(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nhân Sự</h1>
          <p className="text-slate-400 text-sm mt-1">{total} nhân viên</p>
        </div>
        <button onClick={() => setModalEmp({})} className="btn-primary"><Plus size={16} /> Thêm Nhân Viên</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Users size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
            <p className="text-sm text-slate-400">Đang làm việc</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <DollarSign size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-violet-400">{formatCurrency(totalSalary)}</p>
            <p className="text-sm text-slate-400">Quỹ lương tháng</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <TrendingUp size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{total}</p>
            <p className="text-sm text-slate-400">Tổng nhân sự</p>
          </div>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatus('')}
          className={cn('px-3 py-1.5 text-xs font-medium rounded-xl border transition-all',
            !status ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'border-slate-600 text-slate-500 hover:bg-slate-800')}>
          Tất cả
        </button>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <button key={k} onClick={() => setStatus(status === k ? '' : k)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5',
              status === k ? v.color : 'border-slate-600 text-slate-500 hover:bg-slate-800')}>
            <v.icon size={11} /> {v.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input-dark pl-9 w-full" placeholder="Tìm tên, mã NV, SĐT..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Nhân Viên</th>
                <th className="px-5 py-3">Chức Vụ</th>
                <th className="px-5 py-3">Liên Hệ</th>
                <th className="px-5 py-3">Ngày Vào</th>
                <th className="px-5 py-3 text-right">Lương CB</th>
                <th className="px-5 py-3">Trạng Thái</th>
                <th className="px-5 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <Loader2 size={28} className="animate-spin text-violet-400 mx-auto" />
                </td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500">
                  <Briefcase size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="mb-3">Chưa có nhân viên nào</p>
                  <button onClick={() => setModalEmp({})} className="btn-primary mx-auto">
                    <Plus size={14} /> Thêm ngay
                  </button>
                </td></tr>
              ) : employees.map((emp: any) => {
                const st = STATUS_CONFIG[emp.status] || STATUS_CONFIG.ACTIVE;
                return (
                  <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setDetailEmp(emp)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600/50 to-violet-600/50 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                          {(emp.firstName || ' ')[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{emp.lastName} {emp.firstName}</p>
                          <p className="text-xs text-slate-500 font-mono">{emp.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-300 text-sm">{emp.position || '—'}</p>
                      {emp.department && <p className="text-xs text-slate-500">{emp.department}</p>}
                    </td>
                    <td className="px-5 py-4">
                      {emp.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} /> {emp.phone}</p>}
                      {emp.email && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Mail size={10} /> {emp.email}</p>}
                    </td>
                    <td className="px-5 py-4">
                      {emp.startDate ? (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(emp.startDate, 'dd/MM/yyyy')}
                        </p>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-violet-400">{formatCurrency(Number(emp.baseSalary || 0))}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', st.color)}>
                        <st.icon size={10} /> {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModalEmp(emp)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => confirm(`Xóa nhân viên "${emp.lastName} ${emp.firstName}"?`) && deleteMut.mutate(emp.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => setDetailEmp(emp)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-all">
                          <ChevronRight size={14} />
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
            <p className="text-sm text-slate-400">Trang {page}/{totalPages}</p>
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
