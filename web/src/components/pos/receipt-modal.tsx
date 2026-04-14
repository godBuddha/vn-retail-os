'use client';
import { useRef, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, Printer, Plus, Download, Copy, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores';
import toast from 'react-hot-toast';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import { generateThermalReceiptData, PaperSize } from '@/lib/receipt.utils';

interface ReceiptItem { name: string; quantity: number; salePrice: number; discount: number; total: number; }

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onNewOrder: () => void;
  order: {
    code: string;
    createdAt?: string;
    items: ReceiptItem[];
    subtotal: number;
    discountAmount: number;
    total: number;
    paidAmount: number;
    changeAmount: number;
    paymentMethod: string;
    pointsEarned: number;
    customerName?: string;
    cashierName?: string;
  };
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt', QR_MANUAL: 'Chuyển khoản', VNPAY: 'VNPay', MOMO: 'MoMo',
};

export default function ReceiptModal({ open, onClose, onNewOrder, order }: ReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { user, currentBranchId } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const { printReceipt } = useThermalPrinter();

  // Load receipt settings from localStorage
  const receiptSettings = (() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(`receipt-settings-${currentBranchId}`);
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  })();

  const shopName = receiptSettings?.headerLine1 || 'HỆ THỐNG QUẢN LÝ BÁN HÀNG';
  const shopAddr = receiptSettings?.headerLine2 || '';
  const shopPhone = receiptSettings?.headerLine3 || 'Tel: 0909 000 000';
  const footer1 = receiptSettings?.footerLine1 || 'Cảm ơn! Hẹn gặp lại 🙏';
  const footer2 = receiptSettings?.footerLine2 || '';
  const thermalPrinterName = receiptSettings?.printerName;
  const paperSize = receiptSettings?.paperSize || '80mm';

  const handlePrint = async () => {
    if (thermalPrinterName) {
      const data = generateThermalReceiptData(order, shopName, paperSize as PaperSize);
      const success = await printReceipt(thermalPrinterName, data);
      if (success) return; // Stop here if thermal print succeeds
    }

    const content = printRef.current?.innerHTML;
    const w = window.open('', '_blank', 'width=380,height=650');
    if (!w || !content) return;
    w.document.write(`
      <html><head><title>Hóa đơn ${order.code}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 12px; color: #000; }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .bold { font-weight: bold; }
        .total { font-size: 16px; font-weight: bold; }
      </style></head><body>${content}</body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const handleDownload = () => {
    const lines = [
      '================================',
      '   HỆ THỐNG QUẢN LÝ BÁN HÀNG',
      '================================',
      `Mã đơn: ${order.code}`,
      `Ngày: ${formatDate(order.createdAt || new Date().toISOString(), 'dd/MM/yyyy HH:mm')}`,
      order.customerName ? `Khách: ${order.customerName}` : 'Khách: Khách vãng lai',
      `Thu ngân: ${order.cashierName || `${user?.firstName} ${user?.lastName}`}`,
      '--------------------------------',
      ...order.items.map(i => `${i.name}\n  ${i.quantity} x ${formatCurrency(i.salePrice)} = ${formatCurrency(i.total)}`),
      '--------------------------------',
      `Tạm tính: ${formatCurrency(order.subtotal)}`,
      order.discountAmount > 0 ? `Giảm giá: -${formatCurrency(order.discountAmount)}` : null,
      `TỔNG CỘNG: ${formatCurrency(order.total)}`,
      `PT thanh toán: ${METHOD_LABELS[order.paymentMethod] || order.paymentMethod}`,
      order.paymentMethod === 'CASH' ? `Tiền khách: ${formatCurrency(order.paidAmount)}` : null,
      order.paymentMethod === 'CASH' ? `Tiền thừa: ${formatCurrency(order.changeAmount)}` : null,
      order.pointsEarned > 0 ? `Điểm tích: +${order.pointsEarned} điểm` : null,
      '================================',
      '   Cảm ơn! Hẹn gặp lại 🙏',
      '================================',
    ].filter(Boolean).join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hoadon_${order.code}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const text = `🧾 Hóa đơn ${order.code} | Tổng: ${formatCurrency(order.total)} | ${formatDate(order.createdAt || new Date().toISOString(), 'dd/MM/yyyy HH:mm')}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Đã copy thông tin hóa đơn!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Success banner */}
        <div className="bg-green-500/20 border-b border-green-500/30 px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-300 font-bold text-sm">Thanh toán thành công!</p>
            <p className="text-green-400/70 text-xs">{order.code}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 text-green-400/50 hover:text-green-300 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <div ref={printRef}>
            {/* Shop info */}
            <div className="text-center mb-4">
              <p className="font-bold text-white text-base">{shopName}</p>
              {shopAddr && <p className="text-slate-400 text-xs mt-0.5">{shopAddr}</p>}
              {shopPhone && <p className="text-slate-400 text-xs">{shopPhone}</p>}
              <p className="text-slate-500 text-xs mt-2">──────────────────</p>
              <p className="text-white font-bold mt-1 text-sm">HÓA ĐƠN BÁN HÀNG</p>
              <p className="text-slate-400 text-xs">{order.code}</p>
              <p className="text-slate-500 text-xs">{formatDate(order.createdAt || new Date().toISOString(), 'dd/MM/yyyy HH:mm')}</p>
            </div>

            {/* Customer & Cashier */}
            <div className="text-xs space-y-1 mb-3 bg-slate-800/50 rounded-xl p-3">
              {order.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Khách hàng</span>
                  <span className="text-slate-200 font-medium">{order.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Thu ngân</span>
                <span className="text-slate-200">{order.cashierName || `${user?.firstName} ${user?.lastName}`}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-600 my-3" />

            {/* Items */}
            <div className="space-y-2.5 mb-3">
              {order.items.map((item, i) => (
                <div key={i}>
                  <p className="text-slate-200 text-sm font-medium">{item.name}</p>
                  <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                    <span>{item.quantity} × {formatCurrency(item.salePrice)}</span>
                    <span className="text-white font-medium">{formatCurrency(item.total)}</span>
                  </div>
                  {item.discount > 0 && (
                    <p className="text-xs text-red-400 text-right">Giảm: -{formatCurrency(item.discount)}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-600 my-3" />

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Tạm tính ({order.items.length} sp)</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-red-400 text-xs">
                  <span>Giảm giá</span><span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-base border-t border-slate-600/50 pt-2 mt-2">
                <span>TỔNG CỘNG</span>
                <span className="text-violet-400">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-xs">
                <span>PT thanh toán</span>
                <span>{METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</span>
              </div>
              {order.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>Tiền khách đưa</span><span>{formatCurrency(order.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-400 text-xs font-medium">
                    <span>Tiền thừa trả khách</span><span>{formatCurrency(order.changeAmount)}</span>
                  </div>
                </>
              )}
              {order.pointsEarned > 0 && (
                <div className="flex justify-between text-yellow-400 text-xs mt-1">
                  <span>🌟 Điểm tích lũy</span><span>+{order.pointsEarned} điểm</span>
                </div>
              )}
            </div>

            <div className="text-center mt-5">
              <p className="text-slate-500 text-xs">{footer1}{footer2 ? ` · ${footer2}` : ''}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-700 space-y-2">
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-secondary flex-1 justify-center py-2.5 text-sm">
              <Printer size={15} /> In hóa đơn
            </button>
            <button onClick={handleDownload} className="btn-secondary flex-1 justify-center py-2.5 text-sm">
              <Download size={15} /> Tải .txt
            </button>
            <button
              onClick={handleCopy}
              className={`btn-secondary justify-center py-2.5 px-3 text-sm ${copied ? 'text-green-400' : ''}`}
              title="Copy thông tin"
            >
              {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <button onClick={onNewOrder} className="btn-primary w-full justify-center py-2.5 text-sm font-bold">
            <Plus size={16} /> Đơn Hàng Mới
          </button>
        </div>
      </div>
    </div>
  );
}
