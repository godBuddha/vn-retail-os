'use client';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Palette, Monitor, Moon, Sun, Type } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores';

const DEFAULT_SETTINGS = {
  theme: 'dark', // light, dark, system
  accentColor: 'violet',
  fontSize: 'medium', // small, medium, large
  sidebarState: 'expanded', // expanded, collapsed
};

export default function AppearanceSettingsPage() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`appearance-settings-${user.id}`);
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch {}
    }
  }, [user?.id]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      localStorage.setItem(`appearance-settings-${user.id}`, JSON.stringify(settings));
      return true;
    },
    onSuccess: () => {
      toast.success('Đã lưu cấu hình giao diện!');
      // Apply theme changes to document
      if (settings.theme === 'light') {
         document.documentElement.classList.remove('dark');
      } else {
         document.documentElement.classList.add('dark');
      }
    },
  });

  const updateSetting = (k: keyof typeof settings, v: string) => {
    setSettings(p => ({ ...p, [k]: v }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Giao Diện</h1>
            <p className="text-slate-400 text-sm mt-0.5">Tùy chỉnh màu sắc, chủ đề hệ thống</p>
          </div>
        </div>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Lưu Tùy Chọn
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Theme Settings */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Palette size={15} className="text-pink-400" /> Chế độ hiển thị</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Sáng', icon: Sun },
              { id: 'dark', label: 'Tối', icon: Moon },
              { id: 'system', label: 'Hệ thống', icon: Monitor },
            ].map((th) => {
              const Icon = th.icon;
              const active = settings.theme === th.id;
              return (
                <button key={th.id} onClick={() => updateSetting('theme', th.id)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    active ? 'border-pink-500 bg-pink-500/10 text-pink-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}>
                  <Icon size={24} />
                  <span className="text-sm font-medium">{th.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Colors */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Màu Chủ Đạo</h2>
          <div className="flex flex-wrap gap-4">
            {[
              { id: 'violet', color: 'bg-violet-500' },
              { id: 'blue', color: 'bg-blue-500' },
              { id: 'green', color: 'bg-green-500' },
              { id: 'orange', color: 'bg-orange-500' },
              { id: 'pink', color: 'bg-pink-500' },
            ].map(c => (
              <button key={c.id} onClick={() => updateSetting('accentColor', c.id)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${c.color} ${
                  settings.accentColor === c.id ? 'ring-4 ring-slate-800 ring-offset-2 ring-offset-current' : 'opacity-70 hover:opacity-100'
                }`} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">Màu sắc các nút bấm và điểm nhấn giao diện.</p>
        </div>

        {/* Font Size Settings */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Type size={15} className="text-blue-400" /> Cỡ chữ</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'small', label: 'Nhỏ (12px)', scale: 'text-xs' },
              { id: 'medium', label: 'Vừa (14px)', scale: 'text-sm' },
              { id: 'large', label: 'Lớn (16px)', scale: 'text-base' },
            ].map((fs) => {
              const active = settings.fontSize === fs.id;
              return (
                <button key={fs.id} onClick={() => updateSetting('fontSize', fs.id)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
                    active ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}>
                  <span className={`${fs.scale} font-medium`}>{fs.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
