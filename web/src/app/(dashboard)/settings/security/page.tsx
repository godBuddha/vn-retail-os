'use client';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, ShieldCheck, KeyRound, Smartphone, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { authApi } from '@/lib/api';

const DEFAULT_SETTINGS = {
  sessionTimeout: '120', // minutes
  requirePasswordChange: false,
};

export default function SecuritySettingsPage() {
  const { user, setAuth } = useAuthStore();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  
  const [modalType, setModalType] = useState<'TURN_ON' | 'TURN_OFF' | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`security-settings-${user.id}`);
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch {}
    }
  }, [user?.id]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      localStorage.setItem(`security-settings-${user.id}`, JSON.stringify(settings));
      await new Promise(r => setTimeout(r, 600));
      return true;
    },
    onSuccess: () => toast.success('Đã lưu cấu hình Bảo Mật!'),
  });

  const s = (k: keyof typeof settings) => (e: any) =>
    setSettings(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleToggle2FA = async (e: any) => {
    e.preventDefault();
    if (user?.isTwoFactorEnabled) {
      setModalType('TURN_OFF');
      setOtpToken('');
    } else {
      setLoadingModal(true);
      setModalType('TURN_ON');
      setOtpToken('');
      setQrCodeUrl('');
      try {
        const { data } = await authApi.generate2FA();
        setQrCodeUrl(data.qrCodeDataUrl);
      } catch (err) {
        toast.error('Lỗi tạo mã QR');
        setModalType(null);
      } finally {
        setLoadingModal(false);
      }
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingModal(true);
    try {
      if (modalType === 'TURN_ON') {
        await authApi.turnOn2FA(otpToken);
        toast.success('Bật xác thực 2 bước thành công');
      } else {
        await authApi.turnOff2FA(otpToken);
        toast.success('Đã tắt xác thực 2 bước');
      }
      setModalType(null);
      const { data } = await authApi.getProfile();
      setAuth(data, localStorage.getItem('accessToken') || '', localStorage.getItem('refreshToken') || '');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mã xác thực không hợp lệ');
    } finally {
      setLoadingModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Bảo Mật</h1>
            <p className="text-slate-400 text-sm mt-0.5">Tăng cường an toàn cho hệ thống và nhân viên</p>
          </div>
        </div>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Lưu Cài Đặt
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Two-factor authentication */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white mb-2 flex items-center gap-2"><Smartphone size={15} className="text-emerald-400" /> Xác thực 2 bước (2FA)</h2>
          <p className="text-sm text-slate-400">Yêu cầu nhân viên dùng mã xác thực từ Google Authenticator hoặc OTP để đăng nhập.</p>
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Bật xác thực 2 bước</p>
              <p className="text-xs text-slate-400">Áp dụng cho mọi chi nhánh</p>
            </div>
            <label className="relative inline-flex cursor-pointer" onClick={handleToggle2FA}>
              <input type="checkbox" className="sr-only peer" checked={!!user?.isTwoFactorEnabled} readOnly />
              <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>

        {/* Password Policy */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white mb-2 flex items-center gap-2"><KeyRound size={15} className="text-amber-400" /> Mật khẩu & Chính sách</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Buộc đổi mật khẩu định kỳ</p>
                <p className="text-xs text-slate-400">Mỗi 90 ngày</p>
              </div>
              <label className="relative inline-flex cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.requirePasswordChange} onChange={s('requirePasswordChange')} />
                <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-amber-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
            <div className="pt-2 border-t border-slate-700/50">
              <label className="text-xs text-slate-400 mb-1 block">Thời gian Timeout Phiên đăng nhập (phút)</label>
              <select className="input-dark bg-slate-800" value={settings.sessionTimeout} onChange={s('sessionTimeout')}>
                <option value="30">30 Phút</option>
                <option value="60">1 Giờ</option>
                <option value="120">2 Giờ</option>
                <option value="480">8 Giờ (Kết thúc ca)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Logs Preview */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 md:col-span-2">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Activity size={15} className="text-blue-400" /> Nhật Ký Hoạt Động Gần Đây</h2>
          <div className="space-y-3">
            {[
              { action: 'Đăng nhập thành công', ip: '118.69.184.21', time: 'Vừa xong' },
              { action: 'Thay đổi cấu hình thanh toán', ip: '118.69.184.21', time: '1 tiếng trước' },
              { action: 'Mở ca làm việc (Pos)', ip: '118.69.184.21', time: '5 tiếng trước' },
            ].map((log, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-800/30 text-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} className="text-slate-500" />
                  <span className="text-slate-300">{log.action}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 sm:mt-0">
                  <span>IP: {log.ip}</span>
                  <span>{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2FA Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-[90%] max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              {modalType === 'TURN_ON' ? 'Bật Xác Thực 2 Bước' : 'Tắt Xác Thực 2 Bước'}
            </h3>
            
            {modalType === 'TURN_ON' && (
              <div className="mb-4 text-center">
                <p className="text-sm text-slate-400 mb-4">Quét mã QR bằng ứng dụng <span className="text-white font-medium">Google Authenticator</span></p>
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto rounded-xl border-4 border-white w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 mx-auto flex items-center justify-center bg-slate-800 rounded-xl"><Loader2 className="animate-spin text-slate-500" /></div>
                )}
              </div>
            )}

            <form onSubmit={handleConfirm2FA}>
              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-2">
                  {modalType === 'TURN_ON' ? 'Nhập mã OTP 6 số để xác nhận' : 'Nhập mã OTP hiện tại để huỷ bỏ'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                  className="input-dark w-full text-center tracking-[0.5em] text-xl font-mono font-bold"
                  placeholder="123456"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalType(null)} className="btn-secondary flex-1 justify-center py-2" disabled={loadingModal}>
                  Hủy
                </button>
                <button type="submit" disabled={loadingModal || otpToken.length !== 6 || (modalType === 'TURN_ON' && !qrCodeUrl)} className="btn-primary flex-1 justify-center py-2 font-semibold">
                  {loadingModal ? <Loader2 size={16} className="animate-spin" /> : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
