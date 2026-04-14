'use client';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Globe, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores';

const DEFAULT_SETTINGS = {
  language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  currency: 'VND',
  dateFormat: 'DD/MM/YYYY',
};

export default function LanguageSettingsPage() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`language-settings-${user.id}`);
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch {}
    }
  }, [user?.id]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      localStorage.setItem(`language-settings-${user.id}`, JSON.stringify(settings));
      // Simulate language change delay
      await new Promise(r => setTimeout(r, 600));
      return true;
    },
    onSuccess: () => {
      toast.success('Đã lưu cài đặt Ngôn Ngữ & Vùng!');
      if (settings.language !== 'vi') {
        toast('Phiên bản tiếng Anh đang trong giai đoạn thử nghiệm (Beta).', { icon: '⚠️' });
      }
    },
  });

  const s = (k: keyof typeof settings) => (e: any) =>
    setSettings(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Ngôn Ngữ & Vùng</h1>
            <p className="text-slate-400 text-sm mt-0.5">Tùy chỉnh ngôn ngữ hiển thị và định dạng thời gian</p>
          </div>
        </div>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Lưu Cài Đặt
        </button>
      </div>

      <div className="space-y-6">
        {/* Language Section */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Globe size={15} className="text-orange-400" /> Ngôn Ngữ Hiển Thị</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`border rounded-xl p-4 cursor-pointer flex items-center justify-between transition-colors ${
              settings.language === 'vi' ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 hover:border-slate-600'
            }`}>
              <div className="flex gap-3 items-center">
                <span className="text-2xl">🇻🇳</span>
                <div>
                  <p className="font-medium text-white">Tiếng Việt</p>
                  <p className="text-xs text-slate-400">Vietnamese (Mặc định)</p>
                </div>
              </div>
              <input type="radio" value="vi" checked={settings.language === 'vi'} onChange={s('language')} className="hidden" />
              {settings.language === 'vi' && <div className="w-4 h-4 rounded-full border-4 border-orange-500 bg-slate-900" />}
            </label>
            <label className={`border rounded-xl p-4 cursor-pointer flex items-center justify-between transition-colors ${
              settings.language === 'en' ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 hover:border-slate-600'
            }`}>
              <div className="flex gap-3 items-center">
                <span className="text-2xl">🇬🇧</span>
                <div>
                  <p className="font-medium text-white">English</p>
                  <p className="text-xs text-slate-400">Tiếng Anh (Beta)</p>
                </div>
              </div>
              <input type="radio" value="en" checked={settings.language === 'en'} onChange={s('language')} className="hidden" />
              {settings.language === 'en' && <div className="w-4 h-4 rounded-full border-4 border-orange-500 bg-slate-900" />}
            </label>
          </div>
        </div>

        {/* Region & Time */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Clock size={15} className="text-blue-400" /> Ngày Giờ & Tiền Tệ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
               <label className="text-sm text-slate-400 mb-1 block">Múi giờ</label>
               <select className="input-dark bg-slate-800" value={settings.timezone} onChange={s('timezone')}>
                 <option value="Asia/Ho_Chi_Minh">(GMT+07:00) Indochina Time - Hồ Chí Minh</option>
                 <option value="Asia/Bangkok">(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                 <option value="Asia/Singapore">(GMT+08:00) Singapore, Kuala Lumpur</option>
               </select>
            </div>
            <div>
               <label className="text-sm text-slate-400 mb-1 block">Đồng tiền mặc định</label>
               <select className="input-dark bg-slate-800" value={settings.currency} onChange={s('currency')}>
                 <option value="VND">VND (₫) - Đồng Việt Nam</option>
                 <option value="USD">USD ($) - US Dollar</option>
               </select>
            </div>
            <div>
               <label className="text-sm text-slate-400 mb-1 block">Định dạng ngày</label>
               <select className="input-dark bg-slate-800" value={settings.dateFormat} onChange={s('dateFormat')}>
                 <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                 <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                 <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
               </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
