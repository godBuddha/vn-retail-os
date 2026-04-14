'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Bell, Mail, Smartphone, Archive, SendHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import api from '@/lib/api';

const DEFAULT_SETTINGS = {
  emailNewOrder: true,
  emailDailyReport: true,
  emailLowStock: true,
  pushNewOrder: false,
  pushLowStock: true,
  pushDailyReport: false,
  smsPromotions: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: 'no-reply@retail.vn',
  smtpSecure: false,
  resendApiKey: '',
};

export default function NotificationsSettingsPage() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [testEmail, setTestEmail] = useState('');

  // Fetch SMTP Settings
  const { data: smtpData, isLoading: isLoadingSmtp } = useQuery({
    queryKey: ['settings-smtp'],
    queryFn: async () => {
      const res = await api.get('/settings/smtp');
      return res.data;
    },
  });

  // Fetch Notifications Settings
  const { data: notifyData, isLoading: isLoadingNotify } = useQuery({
    queryKey: ['settings-notifications'],
    queryFn: async () => {
      const res = await api.get('/settings/notifications');
      return res.data;
    },
  });

  useEffect(() => {
    if (user?.email) setTestEmail(user.email);
    if (smtpData || notifyData) {
      setSettings(prev => ({
        ...prev,
        ...smtpData,
        ...notifyData,
      }));
    }
  }, [user, smtpData, notifyData]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const smtpPayload = {
        host: settings.smtpHost,
        port: Number(settings.smtpPort),
        user: settings.smtpUser,
        pass: settings.smtpPass,
        from: settings.smtpFrom,
        secure: settings.smtpSecure,
        resendApiKey: settings.resendApiKey,
      };
      
      const notifyPayload = {
        emailNewOrder: settings.emailNewOrder,
        emailDailyReport: settings.emailDailyReport,
        emailLowStock: settings.emailLowStock,
        pushNewOrder: settings.pushNewOrder,
        pushLowStock: settings.pushLowStock,
        pushDailyReport: settings.pushDailyReport,
        smsPromotions: settings.smsPromotions,
      };

      await Promise.all([
        api.post('/settings/smtp', smtpPayload),
        api.post('/settings/notifications', notifyPayload)
      ]);
      return true;
    },
    onSuccess: () => toast.success('Đã lưu cấu hình thành công!'),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu!'),
  });

  const testSmtpMut = useMutation({
    mutationFn: async () => {
      const res = await api.post('/settings/smtp/test', { email: testEmail });
      if (!res.data.success) throw new Error(res.data.message);
      return res.data;
    },
    onSuccess: (data) => toast.success(data.message || 'Email test đã được gửi. Vui lòng kiểm tra hộp thư!'),
    onError: (err: any) => toast.error(err.message || 'Lỗi gửi test SMTP'),
  });

  const s = (k: keyof typeof settings) => (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettings(p => ({ ...p, [k]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Thông Báo</h1>
            <p className="text-slate-400 text-sm mt-0.5">Quản lý cách hệ thống liên lạc và gửi thông báo</p>
          </div>
        </div>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Lưu Tùy Chọn
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Email Notifications */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2 pb-2 border-b border-slate-700/50"><Mail size={16} className="text-blue-400" /> Thông báo qua Email (Admin)</h2>
          {[
            { id: 'emailNewOrder', title: 'Đơn hàng mới', desc: 'Báo cáo ngay khi có khách chốt đơn lớn.' },
            { id: 'emailDailyReport', title: 'Báo cáo cuối ngày', desc: 'Gửi bảng tổng hợp kết quả ca làm việc.' },
            { id: 'emailLowStock', title: 'Cảnh báo tồn kho', desc: 'Gửi mail khi có mặt hàng dưới định mức.' },
          ].map(item => (
            <div key={item.id} className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
              <label className="relative inline-flex cursor-pointer shrink-0 mt-1">
                <input type="checkbox" className="sr-only peer" checked={(settings as any)[item.id]} onChange={s(item.id as any)} />
                <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>

        {/* Push Notifications */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2 pb-2 border-b border-slate-700/50"><Smartphone size={16} className="text-rose-400" /> Thông báo Trình duyệt / App</h2>
          {[
            { id: 'pushNewOrder', title: 'Đơn hàng Online mới', desc: 'Pop-up ngay trên góc phải màn hình POS.' },
            { id: 'pushInventoryAlert', title: 'Cảnh báo hết Hàng', desc: 'Pop-up nếu thu ngân quét mã sp đã hết.' },
          ].map(item => (
            <div key={item.id} className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
              <label className="relative inline-flex cursor-pointer shrink-0 mt-1">
                <input type="checkbox" className="sr-only peer" checked={(settings as any)[item.id] || false} onChange={s(item.id as any)} />
                <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-rose-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
          
          {/* SMS Promo Example */}
          <div className="pt-2 border-t border-slate-700/50 flex items-start justify-between opacity-60">
            <div>
              <p className="text-sm font-medium text-white flex gap-2">Gửi SMS Khuyến Mãi <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded uppercase">Add-on</span></p>
              <p className="text-xs text-slate-400 mt-1">Tính năng yêu cầu tích hợp SMS Gateway (eSMS/Twilio).</p>
            </div>
            <label className="relative inline-flex cursor-pointer shrink-0 mt-1">
              <input type="checkbox" className="sr-only peer" disabled />
              <div className="w-10 h-5 bg-slate-800 rounded-full peer after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-slate-600 after:rounded-full after:h-4 after:w-4" />
            </label>
          </div>
        </div>

        {/* Custom SMTP Configuration */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 flex-wrap gap-4">
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2"><Mail size={16} className="text-violet-400" /> Cấu Hình Máy Chủ Gửi Mail (SMTP)</h2>
              <p className="text-xs text-slate-400 mt-1">Hệ thống sẽ dùng máy chủ này thay vì mặc định để gửi mail trực tiếp tới khách hàng hoặc nhân sự.</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="email" placeholder="Email nhận test..." className="input-dark text-xs py-1.5 min-w-[200px]" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
              <button 
                onClick={() => testSmtpMut.mutate()} 
                disabled={testSmtpMut.isPending || !testEmail} 
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                {testSmtpMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
                Test
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
               <label className="text-xs text-slate-400 mb-1 block">SMTP Host</label>
               <input className="input-dark text-sm" placeholder="VD: smtp.gmail.com"
                 value={(settings as any).smtpHost} onChange={s('smtpHost')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-xs text-slate-400 mb-1 block">Port</label>
                 <select className="input-dark bg-slate-800 text-sm" value={(settings as any).smtpPort} onChange={s('smtpPort')}>
                   <option value="587">587 (TLS/STARTTLS)</option>
                   <option value="465">465 (SSL)</option>
                   <option value="25">25 (Unencrypted)</option>
                 </select>
               </div>
               <div>
                 <label className="text-xs text-slate-400 mb-1 block">Bảo mật (Secure)</label>
                 <select className="input-dark bg-slate-800 text-sm" value={(settings as any).smtpSecure ? "1" : "0"} onChange={e => setSettings(p => ({ ...p, smtpSecure: e.target.value === "1" }))}>
                   <option value="0">False (for 587/25)</option>
                   <option value="1">True (for 465)</option>
                 </select>
               </div>
            </div>
            <div>
               <label className="text-xs text-slate-400 mb-1 block">Tài khoản (Username / Email)</label>
               <input type="email" className="input-dark text-sm" placeholder="admin@domain.com"
                 value={(settings as any).smtpUser} onChange={s('smtpUser')} />
            </div>
            <div>
               <label className="text-xs text-slate-400 mb-1 block">Mật khẩu Ứng dụng (App Password)</label>
               <input type="password" className="input-dark text-sm" placeholder="••••••••••••"
                 value={(settings as any).smtpPass} onChange={s('smtpPass')} />
            </div>
            <div className="md:col-span-2">
               <label className="text-xs text-slate-400 mb-1 block">Tên/Email Người Gửi (From Address)</label>
               <input className="input-dark text-sm" placeholder="Cửa Hàng VN Retail <no-reply@domain.com>"
                 value={(settings as any).smtpFrom} onChange={s('smtpFrom')} />
            </div>
            
            <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-700/50">
               <div className="flex items-center gap-2 mb-1">
                 <label className="text-xs font-semibold text-violet-400 block">Resend API Key (Ưu tiên)</label>
                 <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-[10px] bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 px-2 py-0.5 rounded-full transition-colors leading-none inline-flex items-center">
                   Lấy API Key tại resend.com
                 </a>
               </div>
               <p className="text-[11px] text-slate-500 mb-2">Hệ thống sẽ tự động dùng Resend (nếu có nhập key hợp lệ bắt đầu bằng re_) thay thế cấu hình SMTP phía trên để tăng tốc độ và uy tín.</p>
               <input type="password" className="input-dark text-sm w-full font-mono placeholder:font-sans" placeholder="re_************************"
                 value={(settings as any).resendApiKey} onChange={s('resendApiKey')} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
