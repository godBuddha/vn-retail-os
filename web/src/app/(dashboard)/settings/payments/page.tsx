'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Star, QrCode, Building2, CreditCard, Edit2, Check } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
  qrImageUrl?: string;
  branchId: string;
}

const BANK_LOGOS: Record<string, string> = {
  VIETCOMBANK: '#007B40', TECHCOMBANK: '#E31837', MBBANK: '#003087',
  VPBANK: '#006F51', BIDV: '#00539F', AGRIBANK: '#D22B2B',
  TPBANK: '#612583', ACBANK: '#00539B', SACOMBANK: '#0066B3',
  HDBANK: '#005DAA', SHINHANBANK: '#005DAA', OCBBANK: '#F26522',
};

export default function PaymentsSettingsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ bankName: '', accountNumber: '', accountName: '', isDefault: false });

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const r = await api.get('/bank-accounts');
      return r.data?.data || r.data || [];
    },
  });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api.post('/bank-accounts', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); toast.success('Đã thêm tài khoản!'); setShowForm(false); resetForm(); },
    onError: () => toast.error('Lỗi thêm tài khoản'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: typeof form }) => api.patch(`/bank-accounts/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); toast.success('Đã cập nhật!'); setEditId(null); setShowForm(false); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/bank-accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); toast.success('Đã xóa tài khoản'); },
    onError: () => toast.error('Không thể xóa tài khoản mặc định'),
  });

  const defaultMut = useMutation({
    mutationFn: (id: string) => api.post(`/bank-accounts/${id}/set-default`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); toast.success('Đã đặt mặc định'); },
  });

  const resetForm = () => setForm({ bankName: '', accountNumber: '', accountName: '', isDefault: false });

  const handleEdit = (acc: BankAccount) => {
    setForm({ bankName: acc.bankName, accountNumber: acc.accountNumber, accountName: acc.accountName, isDefault: acc.isDefault });
    setEditId(acc.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.bankName || !form.accountNumber || !form.accountName) return toast.error('Vui lòng điền đầy đủ');
    if (editId) updateMut.mutate({ id: editId, body: form });
    else createMut.mutate(form);
  };

  const bankColor = (name: string) => BANK_LOGOS[name.toUpperCase().replace(/\s/g, '')] || '#6366F1';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Thanh Toán & Ngân Hàng</h1>
          <p className="text-slate-400 text-sm">Quản lý tài khoản ngân hàng và phương thức thanh toán</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); resetForm(); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all">
          <Plus size={16} /> Thêm tài khoản
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-dark rounded-2xl p-5 mb-6 border border-violet-500/30">
          <h3 className="text-white font-semibold mb-4">{editId ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản ngân hàng mới'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tên ngân hàng *</label>
              <input className="input-dark w-full" placeholder="VD: Vietcombank, Techcombank..."
                value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Số tài khoản *</label>
              <input className="input-dark w-full" placeholder="1234567890"
                value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tên chủ tài khoản *</label>
              <input className="input-dark w-full" placeholder="NGUYEN VAN A"
                value={form.accountName} onChange={e => setForm(p => ({ ...p, accountName: e.target.value.toUpperCase() }))} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="isDefault" checked={form.isDefault}
                onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                className="w-4 h-4 accent-violet-500" />
              <label htmlFor="isDefault" className="text-sm text-slate-300">Đặt làm tài khoản mặc định</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
              {editId ? 'Cập nhật' : 'Thêm mới'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); resetForm(); }}
              className="px-5 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl text-sm transition-all">
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Account list */}
      {isLoading ? (
        <div className="text-slate-400 text-center py-12">Đang tải...</div>
      ) : accounts.length === 0 ? (
        <div className="card-dark rounded-2xl p-12 text-center">
          <CreditCard size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Chưa có tài khoản ngân hàng nào</p>
          <p className="text-slate-500 text-sm mt-1">Thêm tài khoản để nhận thanh toán chuyển khoản</p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <div key={acc.id} className={`card-dark rounded-2xl p-5 flex items-center gap-4 transition-all ${acc.isDefault ? 'border border-violet-500/40' : 'border border-slate-700/30'}`}>
              {/* Bank icon */}
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                style={{ backgroundColor: bankColor(acc.bankName) }}>
                {acc.bankName.slice(0, 3).toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">{acc.bankName}</p>
                  {acc.isDefault && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full border border-violet-500/30">
                      <Star size={10} fill="currentColor" /> Mặc định
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-sm font-mono">{acc.accountNumber}</p>
                <p className="text-slate-400 text-xs">{acc.accountName}</p>
              </div>
              {/* QR */}
              {acc.qrImageUrl && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
                  <img src={acc.qrImageUrl} alt="QR" className="w-full h-full object-cover" />
                </div>
              )}
              {/* Actions */}
              <div className="flex items-center gap-2">
                {!acc.isDefault && (
                  <button onClick={() => defaultMut.mutate(acc.id)} title="Đặt mặc định"
                    className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-900/20 rounded-lg transition-all">
                    <Star size={16} />
                  </button>
                )}
                <button onClick={() => handleEdit(acc)} title="Chỉnh sửa"
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => { if (confirm('Xóa tài khoản này?')) deleteMut.mutate(acc.id); }}
                  title="Xóa" className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VNPay / MoMo info section */}
      <div className="mt-8">
        <h2 className="text-white font-semibold mb-4">Cổng thanh toán Online</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-dark rounded-2xl p-5 border border-slate-700/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#005bac] flex items-center justify-center text-white text-xs font-bold">VN</div>
              <div>
                <p className="text-white font-semibold">VNPay</p>
                <p className="text-slate-400 text-xs">Thẻ ATM, VISA, QR Code</p>
              </div>
              <span className="ml-auto px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">Sandbox</span>
            </div>
            <p className="text-slate-500 text-xs">Cấu hình: <span className="text-slate-300 font-mono">VNPAY_TMN_CODE, VNPAY_HASH_SECRET</span> trong <span className="text-slate-300">.env</span></p>
            <p className="text-slate-500 text-xs mt-1">Đăng ký merchant: <a href="https://sandbox.vnpayment.vn/devreg/" target="_blank" className="text-violet-400 underline">sandbox.vnpayment.vn</a></p>
          </div>
          <div className="card-dark rounded-2xl p-5 border border-slate-700/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#ae2070] flex items-center justify-center text-white text-xs font-bold">Mo</div>
              <div>
                <p className="text-white font-semibold">MoMo</p>
                <p className="text-slate-400 text-xs">Ví điện tử MoMo</p>
              </div>
              <span className="ml-auto px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">Sandbox</span>
            </div>
            <p className="text-slate-500 text-xs">Cấu hình: <span className="text-slate-300 font-mono">MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY</span></p>
            <p className="text-slate-500 text-xs mt-1">Đăng ký: <a href="https://business.momo.vn" target="_blank" className="text-violet-400 underline">business.momo.vn</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
