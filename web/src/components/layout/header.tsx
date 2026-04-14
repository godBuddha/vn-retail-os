'use client';
import { Bell, Globe, ChevronDown, Package, ShoppingBag, AlertTriangle, CheckCircle, X, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { useI18n } from '@/i18n';
import { getRoleLabel, formatCurrency } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export default function Header({ title }: { title?: string }) {
  const { user, currentBranchId, setCurrentBranch } = useAuthStore();
  const { t, lang, setLang } = useI18n();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  useClickOutside(notifRef, () => setNotifOpen(false));

  const branches = user?.branches || [];
  const currentBranch = branches.find(b => b.id === currentBranchId);

  // Fetch low-stock items
  const { data: lowStockData } = useQuery({
    queryKey: ['notifications-lowstock', currentBranchId],
    queryFn: () => api.get('/products', {
      params: { branchId: currentBranchId, limit: 100, isActive: true }
    }).then(r => {
      const items = r.data?.data || [];
      return items.filter((p: any) => {
        const qty = Number(p.inventory?.[0]?.quantity ?? p.stock ?? 0);
        return qty <= 5;
      }).slice(0, 10);
    }),
    enabled: !!currentBranchId,
    refetchInterval: 5 * 60 * 1000, // every 5 min
    staleTime: 3 * 60 * 1000,
  });

  // Fetch pending POs
  const { data: pendingPOData } = useQuery({
    queryKey: ['notifications-po', currentBranchId],
    queryFn: () => api.get('/purchasing', {
      params: { branchId: currentBranchId, status: 'CONFIRMED', limit: 5 }
    }).then(r => r.data?.data || []),
    enabled: !!currentBranchId,
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch In-App Notifications
  const { data: dbNotifs, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications-db'],
    queryFn: () => api.get('/notifications').then(r => r.data || []),
    refetchInterval: 60 * 1000,
  });

  const lowStock: any[] = lowStockData || [];
  const pendingPOs: any[] = pendingPOData || [];
  const systemNotifs: any[] = dbNotifs || [];
  
  const unreadSystemNotifs = systemNotifs.filter(n => !n.isRead);
  const totalAlerts = lowStock.length + pendingPOs.length + unreadSystemNotifs.length;

  const markAsReadMut = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => refetchNotifs(),
  });

  const markAllReadMut = useMutation({
    mutationFn: () => api.post(`/notifications/read-all`),
    onSuccess: () => refetchNotifs(),
  });

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-lg font-semibold text-white">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {/* Branch selector */}
        {branches.length > 1 && (
          <select
            value={currentBranchId || ''}
            onChange={(e) => setCurrentBranch(e.target.value)}
            className="bg-slate-800 text-slate-300 text-sm border border-slate-700 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        {branches.length === 1 && currentBranch && (
          <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
            <span className="text-xs">📍</span> {currentBranch.name}
          </span>
        )}

        {/* Language */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as 'vi' | 'en')}
          className="bg-slate-800 text-slate-300 text-sm border border-slate-700 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
        >
          <option value="vi">🇻🇳 VI</option>
          <option value="en">🇬🇧 EN</option>
        </select>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <Bell size={20} />
            {totalAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <p className="text-sm font-semibold text-white">Thông Báo</p>
                {totalAlerts > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full font-medium">
                    {totalAlerts} cảnh báo
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {/* Low stock section */}
                {lowStock.length > 0 && (
                  <div>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <AlertTriangle size={12} className="text-orange-400" />
                      <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
                        Sắp Hết Hàng ({lowStock.length})
                      </p>
                    </div>
                    {lowStock.map((p: any) => {
                      const qty = Number(p.inventory?.[0]?.quantity ?? p.stock ?? 0);
                      return (
                        <Link
                          key={p.id}
                          href="/inventory"
                          onClick={() => setNotifOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${qty <= 0 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {qty <= 0 ? '0' : qty}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-500">{qty <= 0 ? 'Hết hàng' : `Còn ${qty} ${p.unit || 'cái'}`}</p>
                          </div>
                          <ExternalLink size={11} className="text-slate-600 flex-shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Pending POs section */}
                {pendingPOs.length > 0 && (
                  <div className={lowStock.length > 0 ? 'border-t border-slate-700/40' : ''}>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <ShoppingBag size={12} className="text-blue-400" />
                      <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                        Đơn Nhập Chờ ({pendingPOs.length})
                      </p>
                    </div>
                    {pendingPOs.map((po: any) => (
                      <Link
                        key={po.id}
                        href="/purchasing"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Package size={14} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">{po.code}</p>
                          <p className="text-[10px] text-slate-500">{po.supplier?.name} · {formatCurrency(Number(po.total || 0))}</p>
                        </div>
                        <ExternalLink size={11} className="text-slate-600 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}

                {/* System Notifications section */}
                {systemNotifs.length > 0 && (
                  <div className={(lowStock.length > 0 || pendingPOs.length > 0) ? 'border-t border-slate-700/40' : ''}>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={12} className="text-violet-400" />
                        <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">
                          Hệ thống ({unreadSystemNotifs.length} chưa đọc)
                        </p>
                      </div>
                      {unreadSystemNotifs.length > 0 && (
                        <button onClick={() => markAllReadMut.mutate()} className="text-[10px] text-slate-400 hover:text-white transition-colors">
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                    {systemNotifs.slice(0, 10).map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markAsReadMut.mutate(n.id)}
                        className={`flex items-start gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors cursor-pointer ${n.isRead ? 'opacity-60' : ''}`}
                      >
                        <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0 bg-violet-400" style={{ opacity: n.isRead ? 0 : 1 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-200">{n.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{n.content}</p>
                          <p className="text-[9px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {totalAlerts === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <CheckCircle size={32} className="text-green-500/30" />
                    <p className="text-sm text-slate-500">Không có cảnh báo</p>
                    <p className="text-xs text-slate-600">Tồn kho ổn định 👍</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-700/50 flex divide-x divide-slate-700/50">
                <Link
                  href="/inventory"
                  onClick={() => setNotifOpen(false)}
                  className="flex-1 text-center py-2.5 text-xs text-violet-400 hover:text-violet-300 hover:bg-slate-800 transition-colors"
                >
                  Tồn kho
                </Link>
                <Link
                  href="/settings/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="flex-1 text-center py-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cài đặt
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User badge */}
        <Link href="/settings/profile" className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-white">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-slate-400">{getRoleLabel(user?.role || '')}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
