'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Printer, Eye, Type, Hash, MapPin, Phone, Mail, FileText } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { formatCurrency } from '@/lib/utils';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

const DEFAULT_SETTINGS = {
  headerLine1: '',
  headerLine2: '',
  headerLine3: '',
  footerLine1: 'Cảm ơn quý khách!',
  footerLine2: 'Hẹn gặp lại!',
  showLogo: true,
  showBarcode: false,
  paperWidth: '80mm',
  fontSize: 'normal',
  printerName: '',
};

export default function ReceiptSettingsPage() {
  const { currentBranchId } = useAuthStore();
  const qc = useQueryClient();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [previewMode, setPreviewMode] = useState(false);
  const { isConnected, printers, connect } = useThermalPrinter();

  const { data: branch } = useQuery({
    queryKey: ['branch', currentBranchId],
    queryFn: () => api.get(`/branches/${currentBranchId}`).then(r => r.data),
    enabled: !!currentBranchId,
  });

  // Load persisted receipt settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`receipt-settings-${currentBranchId}`);
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch {}
    } else if (branch) {
      setSettings(s => ({
        ...s,
        headerLine1: branch.name || '',
        headerLine2: branch.address || '',
        headerLine3: branch.phone ? `ĐT: ${branch.phone}` : '',
      }));
    }
  }, [branch, currentBranchId]);

  const s = (k: keyof typeof settings) => (e: any) =>
    setSettings(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const saveMut = useMutation({
    mutationFn: async () => {
      localStorage.setItem(`receipt-settings-${currentBranchId}`, JSON.stringify(settings));
      return true;
    },
    onSuccess: () => toast.success('Đã lưu cài đặt hóa đơn!'),
  });

  const SAMPLE_ORDER = {
    code: 'DH250001',
    createdAt: new Date().toLocaleString('vi-VN'),
    items: [
      { name: 'Nước Suối Lavie 500ml', quantity: 2, salePrice: 8000, total: 16000 },
      { name: 'Nước Tăng Lực Sting', quantity: 1, salePrice: 10000, total: 10000 },
    ],
    subtotal: 26000,
    discount: 0,
    total: 26000,
    payment: 'Tiền mặt',
    cashGiven: 30000,
    change: 4000,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Mẫu Hóa Đơn</h1>
            <p className="text-slate-400 text-sm mt-0.5">Tùy chỉnh giao diện phiếu tính tiền</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreviewMode(v => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-600 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
            <Eye size={15} /> {previewMode ? 'Ẩn preview' : 'Xem trước'}
          </button>
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Lưu
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${previewMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Settings Form */}
        <div className="space-y-4">
          {/* Header Section */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><FileText size={15} className="text-violet-400" /> Header Hóa Đơn</h2>
            <div className="space-y-3">
              {[
                { key: 'headerLine1', label: 'Dòng 1 — Tên cửa hàng', placeholder: branch?.name || 'VN Retail Shop', icon: Hash },
                { key: 'headerLine2', label: 'Dòng 2 — Địa chỉ', placeholder: branch?.address || '123 Đường ABC', icon: MapPin },
                { key: 'headerLine3', label: 'Dòng 3 — SĐT / Website', placeholder: `ĐT: ${branch?.phone || '0901234567'}`, icon: Phone },
              ].map(({ key, label, placeholder, icon: Icon }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Icon size={10} /> {label}</label>
                  <input className="input-dark text-sm" placeholder={placeholder}
                    value={(settings as any)[key]} onChange={s(key as any)} />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Section */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Type size={15} className="text-green-400" /> Footer Hóa Đơn</h2>
            <div className="space-y-3">
              {[
                { key: 'footerLine1', label: 'Dòng 1', placeholder: 'Cảm ơn quý khách!' },
                { key: 'footerLine2', label: 'Dòng 2', placeholder: 'Hẹn gặp lại!' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                  <input className="input-dark text-sm" placeholder={placeholder}
                    value={(settings as any)[key]} onChange={s(key as any)} />
                </div>
              ))}
            </div>
          </div>

          {/* Printer Connection */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Printer size={15} className="text-violet-400" /> Kết Nối Máy In (QZ Tray)</h2>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-sm text-white">Trạng thái QZ Tray</p>
                  <p className={`text-xs ${isConnected ? 'text-green-400' : 'text-slate-400'}`}>{isConnected ? 'Đã kết nối' : 'Chưa kết nối / Tắt'}</p>
                </div>
                {!isConnected && <button onClick={connect} className="btn-secondary py-1 text-xs">Thử lại</button>}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-sm text-white">Máy in hóa đơn</p>
                  <p className="text-xs text-slate-400">Thiết bị in nhiệt</p>
                </div>
                <select className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none max-w-[200px]"
                  value={(settings as any).printerName || ''} onChange={s('printerName')}>
                  <option value="">-- Mặc định (Trình duyệt) --</option>
                  {printers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Print Options */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Printer size={15} className="text-blue-400" /> Tùy Chọn In</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Khổ giấy</p>
                  <p className="text-xs text-slate-400">Chiều rộng cuộn nhiệt</p>
                </div>
                <select className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none"
                  value={settings.paperWidth} onChange={s('paperWidth')}>
                  <option value="58mm">58mm</option>
                  <option value="80mm">80mm (mặc định)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Cỡ chữ</p>
                  <p className="text-xs text-slate-400">Font size trên phiếu in</p>
                </div>
                <select className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none"
                  value={settings.fontSize} onChange={s('fontSize')}>
                  <option value="small">Nhỏ</option>
                  <option value="normal">Bình thường</option>
                  <option value="large">Lớn</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-white">Hiển thị barcode</p>
                  <p className="text-xs text-slate-400">In mã vạch đơn hàng</p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.showBarcode} onChange={s('showBarcode')} />
                  <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-violet-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Preview */}
        {previewMode && (
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4">Xem Trước</h2>
            <div className="flex justify-center">
              <div className={`bg-white text-gray-900 rounded-lg p-4 font-mono shadow-xl ${settings.paperWidth === '58mm' ? 'w-48' : 'w-64'} ${settings.fontSize === 'small' ? 'text-[9px]' : settings.fontSize === 'large' ? 'text-xs' : 'text-[10px]'}`}>
                {/* Header */}
                <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                  {settings.headerLine1 && <p className="font-bold text-sm">{settings.headerLine1}</p>}
                  {settings.headerLine2 && <p className="text-gray-600">{settings.headerLine2}</p>}
                  {settings.headerLine3 && <p className="text-gray-600">{settings.headerLine3}</p>}
                </div>
                {/* Order info */}
                <div className="mb-2">
                  <div className="flex justify-between"><span>Hóa đơn:</span><span className="font-bold">{SAMPLE_ORDER.code}</span></div>
                  <div className="flex justify-between"><span>Thời gian:</span><span>{SAMPLE_ORDER.createdAt}</span></div>
                </div>
                {/* Items */}
                <div className="border-t border-dashed border-gray-400 pt-2 mb-2 space-y-1">
                  {SAMPLE_ORDER.items.map((item, i) => (
                    <div key={i}>
                      <p className="font-medium">{item.name}</p>
                      <div className="flex justify-between text-gray-600">
                        <span>{item.quantity} x {formatCurrency(item.salePrice)}</span>
                        <span>{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Totals */}
                <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
                  <div className="flex justify-between"><span>Tổng cộng:</span><span>{formatCurrency(SAMPLE_ORDER.total)}</span></div>
                  <div className="flex justify-between"><span>TT ({SAMPLE_ORDER.payment}):</span><span>{formatCurrency(SAMPLE_ORDER.cashGiven)}</span></div>
                  <div className="flex justify-between font-bold"><span>Thối lại:</span><span>{formatCurrency(SAMPLE_ORDER.change)}</span></div>
                </div>
                {/* Footer */}
                <div className="text-center border-t border-dashed border-gray-400 pt-2">
                  {settings.footerLine1 && <p>{settings.footerLine1}</p>}
                  {settings.footerLine2 && <p className="text-gray-500">{settings.footerLine2}</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
