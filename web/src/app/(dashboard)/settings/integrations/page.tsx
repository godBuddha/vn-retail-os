'use client';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Webhook, Link as LinkIcon, Blocks } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores';

const DEFAULT_SETTINGS = {
  webhookUrl: '',
  webhookSecret: '',
  enableApiAccess: false,
  syncInventory: false,
};

export default function IntegrationsSettingsPage() {
  const { user, currentBranchId } = useAuthStore();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!currentBranchId) return;
    const stored = localStorage.getItem(`integration-settings-${currentBranchId}`);
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch {}
    }
  }, [currentBranchId]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!currentBranchId) return;
      localStorage.setItem(`integration-settings-${currentBranchId}`, JSON.stringify(settings));
      await new Promise(r => setTimeout(r, 800));
      return true;
    },
    onSuccess: () => toast.success('Đã lưu cấu hình Tích Hợp & API!'),
  });

  const s = (k: keyof typeof settings) => (e: any) =>
    setSettings(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Tích Hợp & API</h1>
            <p className="text-slate-400 text-sm mt-0.5">Kết nối phần mềm thứ 3 và cấu hình Webhooks</p>
          </div>
        </div>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Lưu Cấu Hình
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Webhooks Section */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Webhook size={15} className="text-cyan-400" /> Cấu Hình Webhook</h2>
          <p className="text-sm text-slate-400 mb-2">Hệ thống sẽ gửi sự kiện (Orders, Inventory) về URL này khi có thay đổi.</p>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Payload URL</label>
            <input className="input-dark text-sm" placeholder="https://your-domain.com/webhook"
              value={settings.webhookUrl} onChange={s('webhookUrl')} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Secret Token</label>
            <input type="password" className="input-dark text-sm" placeholder="Nhập secret để verify payload"
              value={settings.webhookSecret} onChange={s('webhookSecret')} />
          </div>
        </div>

        {/* API Access Section */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 space-y-6">
          <h2 className="font-semibold text-white flex items-center gap-2"><Blocks size={15} className="text-indigo-400" /> API Khách</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Cho phép truy cập API</p>
              <p className="text-xs text-slate-400">Bật/tắt việc tạo API Keys cho app ngoài</p>
            </div>
            <label className="relative inline-flex cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.enableApiAccess} onChange={s('enableApiAccess')} />
              <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-cyan-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-2">Mã Token (API Key)</h3>
            <div className="flex items-center gap-2">
              <input readOnly value={settings.enableApiAccess ? "sk_live_x89aFjk..." : "Vui lòng bật API Access"} className="input-dark text-xs font-mono text-slate-500 bg-black/20" />
              <button disabled={!settings.enableApiAccess} className="btn-secondary whitespace-nowrap text-xs py-2 px-3">Tạo Mới</button>
            </div>
          </div>
        </div>

        {/* Third party apps */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 md:col-span-2">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><LinkIcon size={15} className="text-emerald-400" /> Kết Nối Đối Tác</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 text-orange-400 rounded-lg flex items-center justify-center font-bold">Shopee</div>
                <div>
                  <p className="text-sm font-medium text-white">Shopee</p>
                  <p className="text-xs text-slate-400">Đồng bộ tồn kho</p>
                </div>
              </div>
              <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700">Kết nối</button>
            </div>
            <div className="border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center font-bold">Kiot</div>
                <div>
                  <p className="text-sm font-medium text-white">KiotViet</p>
                  <p className="text-xs text-slate-400">Chuyển đổi dữ liệu</p>
                </div>
              </div>
              <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700">Kết nối</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
