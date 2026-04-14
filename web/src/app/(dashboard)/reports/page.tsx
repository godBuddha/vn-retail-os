'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, DollarSign, ShoppingBag, Users,
  Banknote, QrCode, CreditCard, Smartphone,
  Calendar, Download, RefreshCw, ArrowUp, ArrowDown,
  FileText, ChevronDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { exportRevenueToExcel } from '@/lib/exportToExcel';

const fetchReport = async (params: any) => {
  const { data } = await api.get('/orders', {
    params: { ...params, limit: 1000, status: 'COMPLETED' },
  });
  return data;
};

const PAYMENT_METHODS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CASH:      { label: 'Tiền Mặt',       icon: Banknote,    color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' },
  QR_MANUAL: { label: 'QR Chuyển Khoản', icon: QrCode,      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  VNPAY:     { label: 'VNPay',           icon: CreditCard,  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
  MOMO:      { label: 'MoMo',            icon: Smartphone,  color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/30' },
  OTHER:     { label: 'Khác',            icon: DollarSign,  color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/30' },
};

function StatCard({ title, value, sub, icon: Icon, trend, color = 'violet' }: any) {
  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm font-medium">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}-500/10 border border-${color}-500/20`}>
          <Icon size={18} className={`text-${color}-400`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && (
        <div className="flex items-center gap-1.5 text-xs">
          {trend === 'up' && <ArrowUp size={12} className="text-green-400" />}
          {trend === 'down' && <ArrowDown size={12} className="text-red-400" />}
          <span className="text-slate-500">{sub}</span>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { currentBranchId } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 8) + '01';

  const [range, setRange] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    if (range === 'today') {
      return { start: today, end: today };
    } else if (range === 'week') {
      const d = new Date(now);
      d.setDate(now.getDate() - 6);
      return { start: d.toISOString().split('T')[0], end: today };
    } else if (range === 'month') {
      return { start: firstOfMonth, end: today };
    }
    return { start: startDate, end: endDate };
  };

  const { start, end } = getDateRange();

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['reports-orders', start, end, currentBranchId],
    queryFn: () => fetchReport({
      branchId: currentBranchId,
      startDate: start + 'T00:00:00',
      endDate: end + 'T23:59:59',
    }),
  });

  const orders: any[] = ordersData?.data || [];

  // Aggregate stats
  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const totalDiscount = orders.reduce((s: number, o: any) => s + Number(o.discountAmount || 0), 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const uniqueCustomers = new Set(orders.filter(o => o.customerId).map(o => o.customerId)).size;

  // By payment method
  const byMethod: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o: any) => {
    const method = o.payments?.[0]?.method || o.paymentMethod || 'OTHER';
    if (!byMethod[method]) byMethod[method] = { count: 0, revenue: 0 };
    byMethod[method].count++;
    byMethod[method].revenue += Number(o.total || 0);
  });

  // By day (for mini chart)
  const byDay: Record<string, number> = {};
  orders.forEach((o: any) => {
    const day = o.createdAt?.slice(0, 10);
    if (day) byDay[day] = (byDay[day] || 0) + Number(o.total || 0);
  });
  const dayEntries = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
  const maxDayRevenue = Math.max(...dayEntries.map(([, v]) => v), 1);

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach((o: any) => {
    (o.items || []).forEach((item: any) => {
      const id = item.productId;
      if (!productMap[id]) productMap[id] = { name: item.name || item.product?.name || 'N/A', qty: 0, revenue: 0 };
      productMap[id].qty += Number(item.quantity || 0);
      productMap[id].revenue += Number(item.total || 0);
    });
  });
  const topProducts = Object.entries(productMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 8);

  // ── Exports ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (orders.length === 0) return toast.error('Không có dữ liệu để xuất');
    const BOM = '\uFEFF';
    const SEP = '\t'; // Tab separator — works on Mac Numbers, Excel, Google Sheets without import wizard
    const header = ['Mã Đơn', 'Thời Gian', 'Khách Hàng', 'PT Thanh Toán', 'Tổng Tiền (đ)', 'Giảm Giá (đ)', 'Tiền Thực Thu (đ)'];
    const rows = orders.map((o: any) => [
      o.code,
      o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
      o.customer?.name || 'Khách vãng lai',
      PAYMENT_METHODS[o.payments?.[0]?.method || o.paymentMethod || 'OTHER']?.label || 'Khác',
      Number(o.total || 0).toFixed(0),
      Number(o.discountAmount || 0).toFixed(0),
      (Number(o.total || 0) - Number(o.discountAmount || 0)).toFixed(0),
    ]);
    // Summary rows
    rows.push([]);
    rows.push(['TỔNG KẾT', '', '', '', totalRevenue.toFixed(0), totalDiscount.toFixed(0), '']);
    rows.push(['Số đơn hàng', String(totalOrders)]);
    rows.push(['TB/đơn', '', '', '', avgOrder.toFixed(0)]);

    const tsv = BOM + [header, ...rows]
      .map(r => r.map((c: any) => String(c ?? '').replace(/\t/g, ' ')).join(SEP))
      .join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-doanh-thu_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${orders.length} đơn hàng`);
    setShowExportMenu(false);
  };

  const exportTopProductsCSV = () => {
    if (topProducts.length === 0) return toast.error('Không có dữ liệu');
    const BOM = '\uFEFF';
    const SEP = '\t';
    const header = ['#', 'Sản Phẩm', 'Số Lượng Bán', 'Doanh Thu (đ)', '% Doanh Thu'];
    const rows = topProducts.map(([, p], idx) => [
      String(idx + 1), p.name, String(p.qty),
      p.revenue.toFixed(0),
      totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(2) : '0',
    ]);
    const tsv = BOM + [header, ...rows]
      .map(r => r.map((c: any) => String(c ?? '').replace(/\t/g, ' ')).join(SEP))
      .join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top-san-pham_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const printReport = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const rows = orders.slice(0, 50).map((o: any) => {
      const m = PAYMENT_METHODS[o.payments?.[0]?.method || o.paymentMethod || 'OTHER'] || PAYMENT_METHODS.OTHER;
      return `<tr>
        <td>${o.code}</td>
        <td>${o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : ''}</td>
        <td>${o.customer?.name || 'Khách vãng lai'}</td>
        <td>${m.label}</td>
        <td style="text-align:right;font-weight:bold">${Number(o.total).toLocaleString('vi-VN')}đ</td>
      </tr>`;
    }).join('');
    w.document.write(`<html><head><title>Báo Cáo ${start} → ${end}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#222}
      h1{font-size:18px;margin-bottom:4px} .sub{font-size:11px;color:#666;margin-bottom:16px}
      .stats{display:flex;gap:24px;margin-bottom:20px;padding:12px;background:#f5f5f5;border-radius:8px}
      .stat p{margin:0;font-size:11px;color:#666} .stat h2{margin:4px 0 0;font-size:20px;font-weight:bold}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#6d28d9;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
      td{padding:7px 10px;border-bottom:1px solid #eee;font-size:11px}
      tr:nth-child(even) td{background:#fafafa}
      .footer{margin-top:20px;font-size:10px;color:#999;text-align:center}
    </style></head><body>
    <h1>Báo Cáo Doanh Thu</h1>
    <div class="sub">Từ ${start} đến ${end}</div>
    <div class="stats">
      <div class="stat"><p>Tổng Doanh Thu</p><h2>${formatCurrency(totalRevenue)}</h2></div>
      <div class="stat"><p>Số Đơn</p><h2>${totalOrders}</h2></div>
      <div class="stat"><p>TB/Đơn</p><h2>${formatCurrency(avgOrder)}</h2></div>
      <div class="stat"><p>Giảm Giá</p><h2>${formatCurrency(totalDiscount)}</h2></div>
    </div>
    <table><thead><tr><th>Mã Đơn</th><th>Thời Gian</th><th>Khách Hàng</th><th>PT Thanh Toán</th><th>Tổng Tiền</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer">In lúc: ${new Date().toLocaleString('vi-VN')} · Hiển thị ${Math.min(50, orders.length)}/${orders.length} đơn</div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
    setShowExportMenu(false);
  };

  const handleExportExcel = async () => {
    try {
      await exportRevenueToExcel(orders, `${start}_den_${end}`);
      setShowExportMenu(false);
      toast.success('Đã xuất Excel báo cáo doanh thu');
    } catch (err) {
      toast.error('Lỗi khi xuất định dạng Excel');
    }
  };

  const ranges = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'week', label: '7 ngày' },
    { key: 'month', label: 'Tháng này' },
    { key: 'custom', label: 'Tùy chọn' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Báo Cáo Doanh Thu</h1>
          <p className="text-slate-400 text-sm mt-1">Thống kê chi tiết · {start} → {end}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-slate-700">
            <RefreshCw size={16} />
          </button>
          {/* Export dropdown */}
          <div className="relative">
            <button onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all">
              <Download size={15} /> Xuất <ChevronDown size={13} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                <button onClick={handleExportExcel}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors">
                  <Download size={14} className="text-violet-400" /> Xuất Excel (.xlsx)
                </button>
                <button onClick={exportCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700/50">
                  <Download size={14} className="text-green-400" /> Xuất CSV — Đơn hàng
                </button>
                <button onClick={exportTopProductsCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700/50">
                  <Download size={14} className="text-blue-400" /> Xuất CSV — Top sản phẩm
                </button>
                <button onClick={printReport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-t border-slate-700/50">
                  <FileText size={14} className="text-violet-400" /> In báo cáo (PDF)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date range selector */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
          {ranges.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key as any)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                range === r.key ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-xl px-3 py-1.5 w-40 focus:outline-none focus:border-violet-500" />
            <span className="text-slate-500 text-sm">→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-xl px-3 py-1.5 w-40 focus:outline-none focus:border-violet-500" />
          </div>
        )}
        <span className="text-xs text-slate-500 ml-auto">
          {start} → {end}
        </span>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Doanh Thu" value={formatCurrency(totalRevenue)} icon={TrendingUp}
            sub={`${totalOrders} đơn hàng`} trend="up" color="violet" />
          <StatCard title="Đơn Hàng" value={totalOrders.toLocaleString()} icon={ShoppingBag}
            sub={`TB: ${formatCurrency(avgOrder)}/đơn`} color="blue" />
          <StatCard title="Giảm Giá" value={formatCurrency(totalDiscount)} icon={DollarSign}
            sub={`${totalRevenue > 0 ? ((totalDiscount / (totalRevenue + totalDiscount)) * 100).toFixed(1) : 0}% tổng DT`} color="orange" />
          <StatCard title="Khách Hàng" value={uniqueCustomers} icon={Users}
            sub={`${totalOrders - uniqueCustomers} khách vãng lai`} color="green" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment method breakdown */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-violet-400" />
            Theo Phương Thức Thanh Toán
          </h3>
          <div className="space-y-3">
            {Object.entries(byMethod).length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">Không có dữ liệu</p>
            ) : Object.entries(byMethod)
                .sort(([, a], [, b]) => b.revenue - a.revenue)
                .map(([method, stats]) => {
                  const m = PAYMENT_METHODS[method] || PAYMENT_METHODS.OTHER;
                  const Icon = m.icon;
                  const pct = totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={method} className={`p-3 rounded-xl border ${m.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon size={15} className={m.color} />
                          <span className="text-sm font-medium text-slate-200">{m.label}</span>
                        </div>
                        <span className="text-xs text-slate-400">{stats.count} đơn</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full mr-3">
                          <div
                            className={`h-full rounded-full ${m.color.replace('text-', 'bg-')}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${m.color}`}>{formatCurrency(stats.revenue)}</span>
                      </div>
                      <div className="text-right text-xs text-slate-500 mt-0.5">{pct.toFixed(1)}%</div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Daily revenue chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-violet-400" />
            Doanh Thu Theo Ngày
          </h3>
          {dayEntries.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              Không có dữ liệu trong khoảng thời gian này
            </div>
          ) : (
            <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
              {dayEntries.map(([day, revenue]) => {
                const height = Math.max(4, (revenue / maxDayRevenue) * 160);
                return (
                  <div key={day} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: '36px' }}>
                    <div className="text-xs text-slate-400 font-medium" style={{ fontSize: '9px' }}>
                      {formatCurrency(revenue).replace('₫', '').replace(',000', 'K')}
                    </div>
                    <div
                      className="w-6 rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-400 hover:opacity-80 transition-all cursor-default"
                      style={{ height: `${height}px` }}
                      title={`${day}: ${formatCurrency(revenue)}`}
                    />
                    <div className="text-slate-500" style={{ fontSize: '9px', transform: 'rotate(-30deg)', transformOrigin: 'top' }}>
                      {day.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top products */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <ShoppingBag size={16} className="text-violet-400" />
          Top Sản Phẩm Bán Chạy
        </h3>
        {topProducts.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">Không có dữ liệu</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-2.5 px-3 text-slate-400 font-medium">#</th>
                  <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Sản Phẩm</th>
                  <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Đã Bán</th>
                  <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Doanh Thu</th>
                  <th className="text-right py-2.5 px-3 text-slate-400 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map(([id, p], idx) => {
                  const pct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
                  return (
                    <tr key={id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                          idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-slate-800 text-slate-500'
                        }`}>{idx + 1}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium">{p.name}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{p.qty.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-violet-400">{formatCurrency(p.revenue)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-slate-400 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent orders table */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-violet-400" />
          Đơn Hàng Gần Đây
          <span className="ml-auto text-xs text-slate-500 font-normal">Hiển thị {Math.min(10, orders.length)} / {orders.length} đơn</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Mã Đơn</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Thời Gian</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">Khách</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium">PT Thanh Toán</th>
                <th className="text-right py-2.5 px-3 text-slate-400 font-medium">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order: any) => {
                const method = order.payments?.[0]?.method || order.paymentMethod || 'OTHER';
                const m = PAYMENT_METHODS[method] || PAYMENT_METHODS.OTHER;
                const Icon = m.icon;
                return (
                  <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-xs">{order.code}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-xs">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{order.customer?.name || 'Khách vãng lai'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${m.bg} ${m.color}`}>
                        <Icon size={10} /> {m.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-violet-400">{formatCurrency(Number(order.total))}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Không có đơn hàng trong khoảng thời gian này</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
