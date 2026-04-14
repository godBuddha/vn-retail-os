'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse, ClipboardList,
  Users, Truck, ShoppingBag, UserCog, DollarSign, BarChart2,
  Tag, Settings, GitBranch, ChevronLeft, ChevronRight, LogOut,
  Bell, Building2, Clock, QrCode, FileUp, Mail,
} from 'lucide-react';
import { useAuthStore } from '@/stores';
import { useI18n } from '@/i18n';
import { authApi } from '@/lib/api';
import { cn, getInitials, getRoleLabel } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, href: '/dashboard', roles: [] },
  { key: 'pos', icon: ShoppingCart, href: '/pos', roles: [], highlight: true },
  { key: 'orders', icon: ClipboardList, href: '/orders', roles: [] },
  { key: 'shifts', icon: Clock, href: '/shifts', roles: [] },
  { name: 'Sản Phẩm & Kho', type: 'divider' },
  { key: 'products', icon: Package, href: '/products', roles: [] },
  { key: 'barcode', icon: QrCode, href: '/products/barcode', roles: [] },
  { key: 'import', icon: FileUp, href: '/products/import', roles: [] },
  { key: 'inventory', icon: Warehouse, href: '/inventory', roles: [] },
  { name: 'Khách Hàng & Đối Tác', type: 'divider' },
  { key: 'customers', icon: Users, href: '/customers', roles: [] },
  { key: 'suppliers', icon: Truck, href: '/suppliers', roles: [] },
  { name: 'Vận Hành', type: 'divider' },
  { key: 'purchasing', icon: ShoppingBag, href: '/purchasing', roles: [] },
  { key: 'promotions', icon: Tag, href: '/promotions', roles: [] },
  { key: 'finance', icon: DollarSign, href: '/finance', roles: ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { key: 'reports', icon: BarChart2, href: '/reports', roles: [] },
  { key: 'mail', icon: Mail, href: '/mail', roles: [] },
  { name: 'Quản Trị', type: 'divider' },
  { key: 'users', icon: UserCog, href: '/users', roles: ['SUPER_ADMIN', 'BRANCH_ADMIN'] },
  { key: 'hr', icon: Building2, href: '/hr', roles: ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER'] },
  { key: 'branches', icon: GitBranch, href: '/branches', roles: ['SUPER_ADMIN'] },
  { key: 'settings', icon: Settings, href: '/settings', roles: [] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, currentBranchId } = useAuthStore();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.style.setProperty('--sidebar-width', next ? '64px' : '256px');
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch {}
    }
    logout();
    toast.success(t.auth.logout_success);
    router.push('/login');
  };

  const getNavLabel = (key: string) => {
    const labels: Record<string, string> = {
      dashboard: t.nav.dashboard, pos: t.nav.pos, orders: t.nav.orders,
      products: t.nav.products, inventory: t.nav.inventory,
      customers: t.nav.customers, suppliers: t.nav.suppliers,
      purchasing: t.nav.purchasing, promotions: t.nav.promotions,
      finance: t.nav.finance, users: t.nav.users, hr: t.nav.hr,
      branches: t.nav.branches, reports: t.nav.reports, settings: t.nav.settings,
      shifts: 'Quản Lý Ca', barcode: 'In Nhãn Barcode', import: 'Import SP',
      mail: 'Mail Center',
    };
    return labels[key] || key;
  };

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-slate-900 border-r border-slate-700/50 fixed left-0 top-0 z-40',
      'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 min-h-[65px]">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={16} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">Quản Lý</p>
              <p className="text-[10px] text-slate-400 truncate">Bán Hàng</p>
            </div>
          </div>
        )}
        <button
          onClick={() => toggleCollapsed()}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item, i) => {
          if ('type' in item && item.type === 'divider') {
            if (collapsed) return null;
            return <p key={i} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 pt-4 pb-1">{item.name}</p>;
          }
          const Icon = item.icon!;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!));
          return (
            <Link
              key={item.href}
              href={item.href!}
              title={collapsed ? getNavLabel(item.key!) : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
                item.highlight && !isActive && 'bg-violet-600/10 text-violet-400 border border-violet-500/20',
              )}
            >
              <Icon size={18} className={cn('flex-shrink-0', isActive && 'text-violet-400')} />
              {!collapsed && <span className="text-sm font-medium truncate">{getNavLabel(item.key!)}</span>}
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-500 rounded-r-full" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-700/50 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {getInitials(user?.firstName || '', user?.lastName || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{getRoleLabel(user?.role || '')}</p>
            </div>
            <button onClick={handleLogout} title="Đăng xuất" className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-full flex justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-all">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
