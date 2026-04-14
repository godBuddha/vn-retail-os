'use client';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, ShoppingCart, Users, Package, ArrowUpRight, ArrowDownRight,
  AlertTriangle, RefreshCw, DollarSign, Eye,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuthStore } from '@/stores';
import { useI18n } from '@/i18n';
import { ordersApi, productsApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, gradient, change, changeLabel, href }: {
  title: string; value: string; icon: any; gradient: string;
  change?: number; changeLabel?: string; href?: string;
}) {
  const isPositive = (change || 0) >= 0;
  const card = (
    <div className="card-dark hover:border-slate-600/50 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', isPositive ? 'text-green-400' : 'text-red-400')}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(change)}% {changeLabel}
            </div>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', gradient)}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span style={{ color: p.color }}>●</span>
          <span className="text-slate-300">{p.name === 'revenue' ? 'Doanh thu' : 'Đơn hàng'}:</span>
          <span className="font-bold text-white">
            {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { currentBranchId } = useAuthStore();
  const { t } = useI18n();

  const { data: summary, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ['daily-summary', currentBranchId],
    queryFn: () => ordersApi.getDailySummary(currentBranchId || '').then(r => r.data),
    enabled: !!currentBranchId,
    refetchInterval: 60000,
  });

  const { data: weeklyData, isLoading: chartLoading } = useQuery({
    queryKey: ['weekly-revenue', currentBranchId],
    queryFn: () => ordersApi.getWeeklyRevenue(currentBranchId || '').then(r => r.data),
    enabled: !!currentBranchId,
    refetchInterval: 300000,
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders', currentBranchId],
    queryFn: () => ordersApi.getAll({ branchId: currentBranchId, limit: 8, page: 1 }).then(r => r.data),
    enabled: !!currentBranchId,
    refetchInterval: 30000,
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ['low-stock', currentBranchId],
    queryFn: () => productsApi.getAll({ branchId: currentBranchId, lowStock: 'true', limit: 6 }).then(r => r.data),
    enabled: !!currentBranchId,
  });

  const totalWeekRevenue = weeklyData?.reduce((s: number, d: any) => s + d.revenue, 0) || 0;
  const prevWeekAvg = totalWeekRevenue / 7;
  const todayRevenue = summary?.revenue || 0;
  const revenueChange = prevWeekAvg > 0 ? Math.round(((todayRevenue - prevWeekAvg) / prevWeekAvg) * 100) : 0;

  const stats = [
    {
      title: t.dashboard.revenue_today,
      value: formatCurrency(todayRevenue),
      icon: DollarSign, gradient: 'gradient-purple',
      change: revenueChange, changeLabel: 'so với TB 7 ngày',
      href: '/orders',
    },
    {
      title: t.dashboard.orders_today,
      value: (summary?.orders || 0).toString(),
      icon: ShoppingCart, gradient: 'gradient-blue',
      href: '/orders',
    },
    {
      title: 'Giá Trị TB / Đơn',
      value: formatCurrency(summary?.avgOrderValue || 0),
      icon: TrendingUp, gradient: 'gradient-green',
    },
    {
      title: t.dashboard.low_stock_alert,
      value: (lowStockProducts?.total || 0).toString(),
      icon: AlertTriangle, gradient: 'gradient-orange',
      href: '/inventory',
    },
  ];

  const orders = recentOrders?.data || [];

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.dashboard.title}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => <StatCard key={i} {...stat} />)}
      </div>

      {/* Revenue Chart */}
      <div className="card-dark">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-white">Doanh Thu 7 Ngày Gần Nhất</h3>
            <p className="text-xs text-slate-400 mt-0.5">Tổng: {formatCurrency(totalWeekRevenue)}</p>
          </div>
          <Link href="/orders" className="btn-secondary text-xs px-3 py-1.5">
            <Eye size={14} /> Xem đơn hàng
          </Link>
        </div>
        {chartLoading ? (
          <div className="h-52 flex items-center justify-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData || []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#colorRevenue)"
                dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#a78bfa' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 card-dark">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">{t.dashboard.recent_orders}</h3>
            <Link href="/orders" className="text-sm text-violet-400 hover:text-violet-300">Xem tất cả →</Link>
          </div>
          {ordersLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 px-5 text-xs font-medium text-slate-400">Mã Đơn</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Khách Hàng</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Trạng Thái</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-slate-400">Tổng</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Thời Gian</th>
                    <th className="py-2 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => {
                    const statusColors: Record<string, string> = {
                      COMPLETED: 'bg-green-500/20 text-green-400',
                      PENDING: 'bg-yellow-500/20 text-yellow-400',
                      CANCELLED: 'bg-slate-700 text-slate-400',
                      REFUNDED: 'bg-orange-500/20 text-orange-400',
                    };
                    const statusLabels: Record<string, string> = {
                      COMPLETED: 'Hoàn thành', PENDING: 'Chờ xử lý',
                      CANCELLED: 'Đã hủy', REFUNDED: 'Hoàn tiền',
                    };
                    return (
                      <tr key={o.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-5 text-sm text-violet-400 font-mono font-bold">{o.code}</td>
                        <td className="py-3 px-4 text-sm text-slate-300">{o.customer?.name || 'Khách vãng lai'}</td>
                        <td className="py-3 px-4">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[o.status] || 'bg-slate-700 text-slate-400')}>
                            {statusLabels[o.status] || o.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-white">{formatCurrency(Number(o.total))}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{formatDate(o.createdAt, 'HH:mm dd/MM')}</td>
                        <td className="py-3 px-4">
                          <Link href={`/orders/${o.id}`} className="p-1.5 text-slate-500 hover:text-violet-400 rounded-lg hover:bg-violet-400/10 transition-all inline-flex">
                            <Eye size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!orders.length && (
                    <tr><td colSpan={6} className="py-10 text-center text-slate-500">{t.common.no_data}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Order count bar chart */}
          <div className="card-dark">
            <h3 className="font-semibold text-white mb-4">Số Đơn / Ngày</h3>
            {chartLoading ? (
              <div className="h-36 skeleton rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weeklyData || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                    itemStyle={{ color: '#a78bfa', fontSize: 12, fontWeight: 600 }}
                    formatter={(v: any) => [v, 'Đơn hàng']}
                  />
                  <Bar dataKey="orders" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Low stock */}
          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-400" />
                Sắp Hết Hàng
              </h3>
              <Link href="/inventory" className="text-xs text-violet-400 hover:text-violet-300">Xem tất cả →</Link>
            </div>
            <div className="space-y-2">
              {lowStockProducts?.data?.slice(0, 6).map((p: any) => {
                const stock = p.inventory?.reduce((s: number, i: any) => s + Number(i.quantity), 0) || 0;
                const isCritical = stock <= 3;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.code}</p>
                    </div>
                    <span className={cn('ml-2 text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0',
                      isCritical ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400')}>
                      {stock} {p.unit?.symbol || ''}
                    </span>
                  </div>
                );
              })}
              {!lowStockProducts?.data?.length && (
                <p className="text-center text-slate-500 py-4 text-sm">✅ Tồn kho ổn định</p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="card-dark">
            <h3 className="font-semibold text-white mb-4">Thao Tác Nhanh</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Bán Hàng', href: '/pos', icon: ShoppingCart, color: 'text-violet-400' },
                { label: 'Thêm SP', href: '/products/new', icon: Package, color: 'text-blue-400' },
                { label: 'Khách Hàng', href: '/customers', icon: Users, color: 'text-green-400' },
                { label: 'Nhập Hàng', href: '/purchasing', icon: TrendingUp, color: 'text-orange-400' },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800 transition-all group">
                  <a.icon size={22} className={cn('transition-transform group-hover:-translate-y-0.5', a.color)} />
                  <span className="text-xs text-slate-300 font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
