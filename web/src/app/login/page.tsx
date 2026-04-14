'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShoppingCart, Loader2, Globe } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { useI18n } from '@/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { t, lang, setLang } = useI18n();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [twoFactorUserId, setTwoFactorUserId] = useState('');
  const [otpToken, setOtpToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      if (data.requires2FA) {
        setTwoFactorUserId(data.userId);
        setStep(2);
        setLoading(false);
        return;
      }
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(t.auth.login_success);
      // Use window.location to avoid hydration issues with Zustand persist
      setTimeout(() => { window.location.href = '/dashboard'; }, 500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t.auth.invalid_credentials);
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.verifyLogin2FA(twoFactorUserId, otpToken);
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(t.auth.login_success);
      setTimeout(() => { window.location.href = '/dashboard'; }, 500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mã xác thực không hợp lệ');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Language switcher */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <Globe size={16} className="text-slate-400" />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as 'vi' | 'en')}
          className="bg-slate-800 text-slate-300 text-sm border border-slate-700 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
        >
          <option value="vi">🇻🇳 Tiếng Việt</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-6 animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 mb-4 shadow-2xl shadow-violet-500/30 animate-pulse-glow">
            <ShoppingCart size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t.app.name}</h1>
          <p className="text-slate-400 mt-1 text-sm">{t.auth.sign_in_to_continue}</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl border border-slate-700/50">
          <h2 className="text-xl font-semibold text-white mb-6">
            {step === 1 ? t.auth.welcome_back : 'Xác nhận đăng nhập'}
          </h2>

          {step === 1 ? (
            <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t.auth.email}</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@retail.vn"
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t.auth.password}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-dark pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input type="checkbox" className="rounded accent-violet-500" />
                {t.auth.remember_me}
              </label>
              <Link href="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                {t.auth.forgot_password}?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" />{t.auth.login}...</>
              ) : (
                t.auth.login
              )}
            </button>
          </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-5">
              <p className="text-sm text-slate-400 mb-2">
                Vui lòng mở ứng dụng <span className="text-white font-medium">Google Authenticator</span> và nhập mã xác thực gồm 6 chữ số để tiếp tục.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mã xác thực (OTP)</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="input-dark text-center text-xl tracking-[0.5em] font-mono font-bold"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1 justify-center py-3"
                >
                  Trở lại
                </button>
                <button
                  type="submit"
                  disabled={loading || otpToken.length !== 6}
                  className="btn-primary flex-1 justify-center py-3 text-base font-semibold shadow-lg shadow-violet-500/25 transition-all"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'Xác nhận'}
                </button>
              </div>
            </form>
          )}

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-xs text-slate-400 font-medium mb-2">🔑 Tài khoản demo:</p>
            <div className="space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Super Admin:</span>
                <span>admin@retail.vn / Admin@2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thu Ngân:</span>
                <span>thu_ngan@retail.vn / Cashier@2024</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          © 2024 {t.app.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
