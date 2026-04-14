'use client';
import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import {
  CreditCard, Store, Bell, Shield, Globe, Palette,
  Printer, Database, ChevronRight, Settings, Building2,
  Smartphone, Webhook, Moon, Languages
} from 'lucide-react';
import { getRoleLabel, getInitials } from '@/lib/utils';

type SettingsItem = {
  href: string;
  icon: React.ForwardRefExoticComponent<any>;
  title: string;
  desc: string;
  color: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
};

const SETTINGS_GROUPS: { group: string; items: SettingsItem[] }[] = [
  {
    group: 'Thanh Toán & Tài Chính',
    items: [
      {
        href: '/settings/payments',
        icon: CreditCard,
        title: 'Phương Thức Thanh Toán',
        desc: 'Cấu hình tài khoản ngân hàng, VNPay, MoMo',
        color: 'text-green-400 bg-green-500/10',
        badge: 'Bắt buộc',
        badgeColor: 'bg-amber-500/20 text-amber-400',
      },
    ],
  },
  {
    group: 'Cửa Hàng',
    items: [
      {
        href: '/settings/store',
        icon: Store,
        title: 'Thông Tin Cửa Hàng',
        desc: 'Tên, logo, địa chỉ, thông tin pháp lý',
        color: 'text-violet-400 bg-violet-500/10',
      },
      {
        href: '/settings/receipt',
        icon: Printer,
        title: 'Mẫu Hóa Đơn',
        desc: 'Tùy chỉnh header, footer, logo trên phiếu in',
        color: 'text-blue-400 bg-blue-500/10',
      },
    ],
  },
  {
    group: 'Hệ Thống',
    items: [
      {
        href: '/settings/notifications',
        icon: Bell,
        title: 'Thông Báo',
        desc: 'Cấu hình email, push notification',
        color: 'text-yellow-400 bg-yellow-500/10',
      },
      {
        href: '/settings/security',
        icon: Shield,
        title: 'Bảo Mật',
        desc: '2FA, session timeout, password policy',
        color: 'text-red-400 bg-red-500/10',
      },
      {
        href: '/settings/integrations',
        icon: Webhook,
        title: 'Tích Hợp & API',
        desc: 'Webhook, API keys, third-party integrations',
        color: 'text-cyan-400 bg-cyan-500/10',
      },
    ],
  },
  {
    group: 'Hiển Thị',
    items: [
      {
        href: '/settings/appearance',
        icon: Palette,
        title: 'Giao Diện',
        desc: 'Dark/Light mode, accent color, font size',
        color: 'text-pink-400 bg-pink-500/10',
      },
      {
        href: '/settings/language',
        icon: Languages,
        title: 'Ngôn Ngữ & Vùng',
        desc: 'Tiếng Việt, English — Múi giờ, định dạng',
        color: 'text-orange-400 bg-orange-500/10',
      },
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Cài Đặt</h1>
        <p className="text-slate-400 text-sm mt-1">Quản lý cấu hình hệ thống và tùy chọn cửa hàng</p>
      </div>

      {/* Account Info Card */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
          {getInitials(user?.firstName || '', user?.lastName || '')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-white">{user?.lastName} {user?.firstName}</p>
          <p className="text-sm text-slate-400">{user?.email}</p>
          <p className="text-xs text-violet-400 mt-0.5">{getRoleLabel(user?.role || '')}</p>
        </div>
        <Link href="/settings/profile"
          className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all flex items-center gap-2">
          Sửa Hồ Sơ <ChevronRight size={14} />
        </Link>
      </div>

      {/* Settings Groups */}
      <div className="space-y-6">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.group}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{group.group}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className={`flex items-center gap-4 bg-slate-900 border rounded-2xl p-4 transition-all group ${
                    item.disabled
                      ? 'border-slate-700/30 opacity-60 cursor-not-allowed'
                      : 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/30 cursor-pointer'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{item.title}</p>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    {!item.disabled && (
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                    )}
                  </div>
                );

                return item.disabled ? (
                  <div key={item.href}>{content}</div>
                ) : (
                  <Link key={item.href} href={item.href}>{content}</Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* System Info */}
      <div className="bg-slate-900 border border-slate-700/30 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Database size={14} /> Thông Tin Hệ Thống
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Phiên bản', value: 'v1.0.0' },
            { label: 'Build', value: '2026.04' },
            { label: 'Database', value: 'PostgreSQL' },
            { label: 'Stack', value: 'Next.js + NestJS' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/50 rounded-xl p-3 text-center">
              <p className="text-slate-500 mb-1">{label}</p>
              <p className="font-mono font-bold text-slate-300">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
