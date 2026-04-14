'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard,
  Banknote, Smartphone, ArrowUpRight, ArrowDownRight,
  Calendar, Plus, X, Loader2, CheckCircle, PieChart,
  ShoppingBag, Receipt, Wallet, BarChart3, Download,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie,
} from 'recharts';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { exportFinanceToExcel } from '@/lib/exportToExcel';

// ─── Constants ────────────────────────────────────────────────────────────────
const METHOD_CFG: Record<string, { label: string; color: string }> = {
  CASH:          { label: 'Tiền Mặt',     color: '#10b981' },
  QR_MANUAL:     { label: 'Chuyển Khoản', color: '#3b82f6' },
  VNPAY:         { label: 'VNPay',         color: '#ef4444' },
  MOMO:          { label: 'MoMo',          color: '#ec4899' },
  BANK_TRANSFER: { label: 'Ngân Hàng',    color: '#8b5cf6' },
};

const EXPENSE_CATEGORIES = [
  'Thuê mặt bằng', 'Lương nhân viên', 'Điện nước', 'Marketing',
  'Vận chuyển', 'Mua hàng', 'Thiết bị', 'Khác',
];

// ─── Add Expense Modal ────────────────────────────────────────────────────────
function AddExpenseModal({ branchId, onClose, onSuccess }: {
  branchId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    type: 'EXPENSE', description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) { toast.error('Nhập đầy đủ mô tả và số tiền'); return; }
    setLoading(true);
    try {
      await api.post('/expenses', {
        branchId, type: form.type,
        description: form.category ? `[${form.category}] ${form.description}` : form.description,
        amount: Number(form.amount),
        date: form.date,
      });
      toast.success('Ghi nhận thành công!');
      onSuccess(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi ghi nhận');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Ghi Nhận Thu/Chi</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-xl">
            {[{ v: 'INCOME', label: '📈 Thu', cls: 'text-green-400' }, { v: 'EXPENSE', label: '📉 Chi', cls: 'text-red-400' }].map(t => (
              <button key={t.v} type="button" onClick={() => setForm(p => ({ ...p, type: t.v }))}
                className={cn('py-2 rounded-lg text-sm font-medium transition-all', form.type === t.v ? 'bg-slate-700 ' + t.cls : 'text-slate-400 hover:text-slate-200')}>
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Mô tả <span className="text-red-400">*</span></label>
            <input className="input-dark" placeholder="Tiền thuê mặt bằng tháng 4..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Số tiền (đ) <span className="text-red-400">*</span></label>
              <input type="number" className="input-dark" placeholder="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Ngày</label>
              <input type="date" className="input-dark" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Danh mục</label>
            <select className="input-dark" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              <option value="">-- Chọn danh mục --</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Ghi Nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-slate-400 mb-1 text-xs">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="font-bold text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Finance Page ────────────────────────────────────────────────────────
export default function FinancePage() {
  const { currentBranchId } = useAuthStore();
  const qc = useQueryClient();
  const [showAddExpense, setShowAddExpense] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString();
  const lastMonthStart = new Date(year, month - 2, 1).toISOString();
  const lastMonthEnd = new Date(year, month - 1, 0, 23, 59, 59).toISOString();

  // Revenue data
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['finance-revenue', currentBranchId, selectedMonth],
    queryFn: () => api.get('/orders', {
      params: { branchId: currentBranchId, startDate: monthStart, endDate: monthEnd, limit: 1000, status: 'COMPLETED' }
    }).then(r => {
      const orders = r.data.data || [];
      const revenue = orders.reduce((s: number, o: any) => s + Number(o.total), 0);
      const discount = orders.reduce((s: number, o: any) => s + Number(o.discountAmount || 0), 0);
      const byMethod: Record<string, { count: number; total: number }> = {};
      orders.forEach((o: any) => {
        const m = o.payments?.[0]?.method || 'CASH';
        if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
        byMethod[m].count++;
        byMethod[m].total += Number(o.total);
      });

      // Daily breakdown
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyMap: Record<number, number> = {};
      orders.forEach((o: any) => {
        const day = new Date(o.createdAt).getDate();
        dailyMap[day] = (dailyMap[day] || 0) + Number(o.total);
      });
      const daily = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        label: `${i + 1}/${month}`,
        revenue: dailyMap[i + 1] || 0,
      }));

      return { revenue, orders: orders.length, discount, avgOrderValue: orders.length ? revenue / orders.length : 0, byMethod, daily, rawOrders: orders };
    }),
    enabled: !!currentBranchId,
  });

  const { data: lastMonthData } = useQuery({
    queryKey: ['finance-last-month', currentBranchId, selectedMonth],
    queryFn: () => api.get('/orders', {
      params: { branchId: currentBranchId, startDate: lastMonthStart, endDate: lastMonthEnd, limit: 1000, status: 'COMPLETED' }
    }).then(r => {
      const orders = r.data.data || [];
      return { revenue: orders.reduce((s: number, o: any) => s + Number(o.total), 0), orders: orders.length };
    }),
    enabled: !!currentBranchId,
  });

  // Expenses
  const { data: expensesData } = useQuery({
    queryKey: ['expenses', currentBranchId, selectedMonth],
    queryFn: () => api.get('/expenses', {
      params: { branchId: currentBranchId, startDate: monthStart, endDate: monthEnd, limit: 100 }
    }).then(r => r.data).catch(() => ({ data: [] })),
    enabled: !!currentBranchId,
  });

  const expenses = expensesData?.data || [];
  const totalExpense = expenses.filter((e: any) => e.type === 'EXPENSE').reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalIncome = expenses.filter((e: any) => e.type === 'INCOME').reduce((s: number, e: any) => s + Number(e.amount), 0);
  const netProfit = (revenueData?.revenue || 0) + totalIncome - totalExpense;

  const growth = (field: 'revenue' | 'orders') => {
    const cur = field === 'revenue' ? (revenueData?.revenue || 0) : (revenueData?.orders || 0);
    const prev = field === 'revenue' ? (lastMonthData?.revenue || 0) : (lastMonthData?.orders || 0);
    return prev ? ((cur - prev) / prev * 100) : null;
  };

  const pieData = useMemo(() =>
    Object.entries(revenueData?.byMethod || {}).map(([k, v]) => ({
      name: METHOD_CFG[k]?.label || k,
      value: v.total,
      color: METHOD_CFG[k]?.color || '#64748b',
    })),
    [revenueData?.byMethod]
  );

  const monthName = new Date(year, month - 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const exportCSV = () => {
    const BOM = '\uFEFF';
    const header = ['Ngày', 'Loại', 'Danh Mục / Mô Tả', 'Số Tiền (đ)'];
    const expenseRows = expenses.map((e: any) => [
      e.date ? new Date(e.date).toLocaleDateString('vi-VN') : '',
      e.type === 'INCOME' ? 'Thu' : 'Chi',
      e.description || '',
      Number(e.amount).toFixed(0),
    ]);
    const summary = [
      [],
      ['TÓM TẮT', '', '', ''],
      ['Doanh Thu', '', '', (revenueData?.revenue || 0).toFixed(0)],
      ['Thu Khác', '', '', totalIncome.toFixed(0)],
      ['Chi Phí', '', '', totalExpense.toFixed(0)],
      ['Lợi Nhuận Ròng', '', '', netProfit.toFixed(0)],
    ];
    const SEP = '\t'; // Tab separator — works on Mac Numbers, Excel and Google Sheets natively
    const tsv = BOM + [header, ...expenseRows, ...summary]
      .map(r => r.map((c: any) => String(c ?? '').replace(/\t/g, ' ')).join(SEP))
      .join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tai-chinh_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất báo cáo tài chính ${monthName}`);
  };

  const handleExportExcel = async () => {
    try {
      const summary = {
        income: totalIncome + (revenueData?.revenue || 0),
        expense: totalExpense,
        profit: netProfit,
      };
      // Pass both manual expenses AND raw revenue orders so the Excel is never blank
      await exportFinanceToExcel(expenses, summary, selectedMonth, revenueData?.rawOrders || []);
      toast.success(`Đã xuất Excel tài chính ${monthName}`);
    } catch (error) {
      toast.error('Lỗi khi xuất định dạng Excel');
    }
  };

  return (
    <div className="space-y-6">
      {showAddExpense && (
        <AddExpenseModal branchId={currentBranchId || ''} onClose={() => setShowAddExpense(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ['expenses'] })} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tài Chính</h1>
          <p className="text-slate-400 text-sm mt-1 capitalize">{monthName} · Lợi nhuận: {formatCurrency(netProfit)}</p>
        </div>
        <div className="flex gap-2 relative group">
          <input type="month" className="input-dark px-3 py-2 text-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all">
            <Download size={15} /> CSV
          </button>
          <button onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 border border-violet-500 rounded-xl transition-all shadow-md">
            <Download size={15} /> Excel
          </button>
          <button onClick={() => setShowAddExpense(true)} className="btn-primary ml-2">
            <Plus size={16} /> Ghi Thu/Chi
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: 'Doanh Thu', value: formatCurrency(revenueData?.revenue || 0), icon: DollarSign, gradient: 'gradient-purple', g: growth('revenue') },
          { title: 'Số Đơn', value: (revenueData?.orders || 0).toLocaleString(), icon: ShoppingBag, gradient: 'gradient-blue', g: growth('orders') },
          { title: 'Lợi Nhuận Ròng', value: formatCurrency(netProfit), icon: Wallet, gradient: netProfit >= 0 ? 'gradient-green' : 'gradient-orange', g: null },
          { title: 'Chi Phí', value: formatCurrency(totalExpense), icon: TrendingDown, gradient: 'gradient-orange', g: null },
        ].map((c, i) => (
          <div key={i} className="card-dark hover:border-slate-600/50 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">{c.title}</p>
                <p className="text-2xl font-bold text-white">
                  {isLoading ? <span className="skeleton inline-block w-24 h-7 rounded" /> : c.value}
                </p>
                {c.g !== null && c.g !== undefined && (
                  <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', c.g >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {c.g >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(c.g).toFixed(1)}% so tháng trước
                  </div>
                )}
              </div>
              <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', c.gradient)}>
                <c.icon size={20} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Revenue Chart */}
      <div className="card-dark">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white">Doanh Thu Theo Ngày</h3>
          <span className="text-xs text-slate-400">{monthName}</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueData?.daily || []} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
              interval={Math.floor((revenueData?.daily?.length || 30) / 8)} />
            <YAxis tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#finGrad)"
              dot={false} activeDot={{ r: 4, fill: '#a78bfa' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payment breakdown + Expenses */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Payment methods pie */}
        <div className="card-dark">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <CreditCard size={16} className="text-violet-400" /> Phương Thức Thanh Toán
          </h3>
          {pieData.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Chưa có dữ liệu thanh toán</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <RechartsPie>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {pieData.map(item => {
                  const pct = ((item.value / (revenueData?.revenue || 1)) * 100).toFixed(1);
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-bold text-white text-xs">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 text-right">{formatCurrency(item.value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expenses list */}
        <div className="card-dark">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Receipt size={16} className="text-orange-400" /> Thu/Chi Tháng
            </h3>
            <div className="text-right">
              <p className="text-xs text-slate-400">Lợi nhuận</p>
              <p className={cn('text-sm font-bold', netProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
                {formatCurrency(netProfit)}
              </p>
            </div>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {expenses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm">Chưa ghi nhận thu/chi nào</p>
                <button onClick={() => setShowAddExpense(true)} className="btn-secondary mt-3 text-xs px-3 py-1.5">
                  <Plus size={12} /> Thêm ngay
                </button>
              </div>
            ) : expenses.slice(0, 15).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-700/20 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs',
                    e.type === 'INCOME' ? 'bg-green-500/20' : 'bg-red-500/20')}>
                    {e.type === 'INCOME' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{e.description}</p>
                    <p className="text-xs text-slate-500">{e.note} · {formatDate(e.date || e.createdAt, 'dd/MM')}</p>
                  </div>
                </div>
                <span className={cn('text-xs font-bold', e.type === 'INCOME' ? 'text-green-400' : 'text-red-400')}>
                  {e.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(e.amount))}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/30 flex justify-between text-xs">
            <span className="text-green-400">Tổng thu: {formatCurrency(totalIncome)}</span>
            <span className="text-red-400">Tổng chi: {formatCurrency(totalExpense)}</span>
          </div>
        </div>
      </div>

      {/* Month comparison */}
      <div className="card-dark">
        <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-400" /> So Sánh Tháng Trước
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { label: 'Doanh Thu', cur: revenueData?.revenue || 0, prev: lastMonthData?.revenue || 0, fmt: formatCurrency },
            { label: 'Số Đơn Hàng', cur: revenueData?.orders || 0, prev: lastMonthData?.orders || 0, fmt: (v: number) => `${v} đơn` },
          ].map(({ label, cur, prev, fmt }) => {
            const g = prev ? ((cur - prev) / prev * 100) : 0;
            const isUp = cur >= prev;
            return (
              <div key={label}>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className={cn('text-xs font-medium flex items-center gap-0.5', isUp ? 'text-green-400' : 'text-red-400')}>
                    {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(g).toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Tháng trước</p>
                    <p className="text-sm font-bold text-slate-300">{fmt(prev)}</p>
                  </div>
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-violet-400 mb-1">Tháng này</p>
                    <p className="text-sm font-bold text-white">{fmt(cur)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
