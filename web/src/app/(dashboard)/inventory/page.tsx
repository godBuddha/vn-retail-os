'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Warehouse, AlertTriangle, TrendingDown,
  Package, RefreshCw, ArrowUpDown, Loader2, CheckCircle,
  History, X, ChevronRight, ArrowUp, ArrowDown, RotateCcw,
  ShoppingBag, Truck, MinusCircle, PlusCircle, Download,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Stock status helper ───────────────────────────────────────────────────────
const STOCK_STATUS = (qty: number) => {
  if (qty <= 0)  return { label: 'Hết hàng',   color: 'bg-red-500/20 text-red-400',       dot: 'bg-red-400' };
  if (qty <= 5)  return { label: 'Sắp hết',    color: 'bg-orange-500/20 text-orange-400', dot: 'bg-orange-400' };
  if (qty <= 10) return { label: 'Tồn thấp',   color: 'bg-yellow-500/20 text-yellow-400', dot: 'bg-yellow-400' };
  return         { label: 'Bình thường',       color: 'bg-green-500/20 text-green-400',   dot: 'bg-green-400' };
};

const MOVEMENT_CFG: Record<string, { label: string; icon: any; color: string }> = {
  PURCHASE_IN:    { label: 'Nhập hàng',     icon: Truck,       color: 'text-green-400' },
  SALE_OUT:       { label: 'Bán hàng',      icon: ShoppingBag, color: 'text-blue-400'  },
  ADJUSTMENT_IN:  { label: 'Điều chỉnh +',  icon: PlusCircle,  color: 'text-violet-400' },
  ADJUSTMENT_OUT: { label: 'Điều chỉnh -',  icon: MinusCircle, color: 'text-orange-400' },
  RETURN_IN:      { label: 'Hoàn trả',      icon: RotateCcw,   color: 'text-cyan-400'  },
};

// ─── Adjust Modal ──────────────────────────────────────────────────────────────
function AdjustModal({ product, branchId, onClose }: { product: any; branchId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'add' | 'subtract' | 'set'>('add');
  const [loading, setLoading] = useState(false);
  const currentQty = Number(product.inventory?.[0]?.quantity || 0);

  const preview = () => {
    const n = Number(qty);
    if (!qty || isNaN(n)) return null;
    if (type === 'add') return currentQty + n;
    if (type === 'subtract') return Math.max(0, currentQty - n);
    return n;
  };
  const previewQty = preview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || isNaN(Number(qty)) || Number(qty) < 0) return toast.error('Nhập số lượng hợp lệ');
    let newQty = currentQty;
    if (type === 'add') newQty = currentQty + Number(qty);
    else if (type === 'subtract') newQty = currentQty - Number(qty);
    else newQty = Number(qty);
    if (newQty < 0) return toast.error('Tồn kho không thể âm');
    setLoading(true);
    try {
      await api.patch(`/inventory/${product.id}/adjust`, {
        branchId, quantity: newQty, note,
        type: type === 'subtract' ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN',
      });
      toast.success('✅ Điều chỉnh tồn kho thành công!');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
    } catch {
      toast.error('Lỗi khi điều chỉnh tồn kho');
    } finally { setLoading(false); }
  };

  const st = STOCK_STATUS(currentQty);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Điều Chỉnh Tồn Kho</h2>
            <p className="text-slate-400 text-sm">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
            <div>
              <p className="text-xs text-slate-400 mb-1">Tồn kho hiện tại</p>
              <p className="text-2xl font-bold text-white">{currentQty} <span className="text-sm text-slate-400">{product.unit?.symbol}</span></p>
            </div>
            <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', st.color)}>{st.label}</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Loại điều chỉnh</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'add', label: '+ Thêm', icon: PlusCircle, active: 'border-green-500/60 text-green-400 bg-green-500/10' },
                  { key: 'subtract', label: '- Trừ', icon: MinusCircle, active: 'border-red-500/60 text-red-400 bg-red-500/10' },
                  { key: 'set', label: '= Đặt', icon: ArrowUpDown, active: 'border-blue-500/60 text-blue-400 bg-blue-500/10' },
                ].map(t => (
                  <button key={t.key} type="button" onClick={() => setType(t.key as any)}
                    className={cn('py-2.5 text-sm font-medium rounded-xl border transition-all flex flex-col items-center gap-1',
                      type === t.key ? t.active : 'border-slate-600 text-slate-400 hover:bg-slate-800')}>
                    <t.icon size={16} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Số lượng</label>
              <input type="number" min="0" step="1" className="input-dark text-xl font-bold text-center" placeholder="0"
                value={qty} onChange={e => setQty(e.target.value)} autoFocus />
              {previewQty !== null && (
                <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                  <span className="text-slate-400">{currentQty}</span>
                  <ChevronRight size={14} className="text-slate-600" />
                  <span className={cn('font-bold', previewQty === 0 ? 'text-red-400' : previewQty <= 5 ? 'text-orange-400' : 'text-green-400')}>
                    {previewQty} {product.unit?.symbol}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Lý do</label>
              <input className="input-dark" placeholder="Kiểm kê, hàng hỏng, nhập thêm..."
                value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
              <button type="submit" disabled={loading || !qty} className="btn-primary flex-1 justify-center">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Xác Nhận
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── History Drawer ────────────────────────────────────────────────────────────
function HistoryDrawer({ product, branchId, onClose }: { product: any; branchId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-movements', product.id, branchId],
    queryFn: () => api.get('/inventory/movements', { params: { branchId, productId: product.id, limit: 50 } })
      .then(r => r.data).catch(() => []),
  });
  const movements: any[] = Array.isArray(data) ? data : (data?.data || []);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <History size={16} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Lịch Sử Kho</h2>
              <p className="text-xs text-slate-400 truncate max-w-48">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <History size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chưa có lịch sử biến động</p>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((m: any) => {
                const cfg = MOVEMENT_CFG[m.type] || { label: m.type, icon: Package, color: 'text-slate-400' };
                const MIcon = cfg.icon;
                const isIn = ['PURCHASE_IN', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(m.type);
                return (
                  <div key={m.id} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/60 transition-colors border border-slate-700/20">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      isIn ? 'bg-green-500/15' : 'bg-red-500/15')}>
                      <MIcon size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{cfg.label}</span>
                        <span className={cn('text-sm font-bold', isIn ? 'text-green-400' : 'text-red-400')}>
                          {isIn ? '+' : '-'}{Math.abs(Number(m.quantity))}
                        </span>
                      </div>
                      {m.note && <p className="text-xs text-slate-400 mt-0.5 truncate">{m.note}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-600">{formatDate(m.createdAt, 'dd/MM/yy HH:mm')}</p>
                        {m.user && <p className="text-xs text-slate-600">{m.user.firstName} {m.user.lastName}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { currentBranchId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [historyProduct, setHistoryProduct] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inventory', search, filter, currentBranchId],
    queryFn: () => api.get('/products', {
      params: { search, branchId: currentBranchId, limit: 100, withInventory: true },
    }).then(r => r.data),
    enabled: !!currentBranchId,
  });

  const allProducts: any[] = data?.data || [];
  const products = allProducts.filter((p: any) => {
    const qty = Number(p.inventory?.[0]?.quantity || 0);
    if (filter === 'out') return qty <= 0;
    if (filter === 'low') return qty > 0 && qty <= 10;
    return true;
  });

  const outOfStockCount = allProducts.filter(p => Number(p.inventory?.[0]?.quantity || 0) <= 0).length;
  const lowStockCount = allProducts.filter(p => { const q = Number(p.inventory?.[0]?.quantity || 0); return q > 0 && q <= 10; }).length;
  const totalValue = allProducts.reduce((s, p) =>
    s + Number(p.inventory?.[0]?.quantity || 0) * Number(p.costPrice || p.salePrice || 0), 0);

  const exportCSV = () => {
    if (allProducts.length === 0) return toast.error('Không có dữ liệu để xuất');
    const BOM = '\uFEFF';
    const header = ['Mã SP', 'Tên Sản Phẩm', 'Danh Mục', 'Tồn Kho', 'Giá Vốn (đ)', 'Giá Bán (đ)', 'Giá Trị Tồn (đ)', 'Trạng Thái'];
    const rows = allProducts.map((p: any) => {
      const qty = Number(p.inventory?.[0]?.quantity || 0);
      const cost = Number(p.costPrice || 0);
      const sale = Number(p.salePrice || p.sellingPrice || 0);
      const st = STOCK_STATUS(qty);
      return [
        p.barcode || p.sku || '',
        p.name,
        p.category?.name || '',
        String(qty),
        cost.toFixed(0),
        sale.toFixed(0),
        (qty * cost).toFixed(0),
        st.label,
      ];
    });
    rows.push([]);
    rows.push(['TỔNG', '', '', String(allProducts.reduce((s,p) => s + Number(p.inventory?.[0]?.quantity||0),0)), '', '', totalValue.toFixed(0), '']);

    const csv = BOM + [header, ...rows]
      .map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g,'""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ton-kho_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${allProducts.length} sản phẩm`);
  };

  return (
    <div className="space-y-6">
      {adjustProduct && (
        <AdjustModal product={adjustProduct} branchId={currentBranchId || ''} onClose={() => setAdjustProduct(null)} />
      )}
      {historyProduct && (
        <HistoryDrawer product={historyProduct} branchId={currentBranchId || ''} onClose={() => setHistoryProduct(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kho Hàng</h1>
          <p className="text-slate-400 text-sm mt-1">{allProducts.length} sản phẩm · {formatCurrency(totalValue)} tồn kho</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} title="Xuất CSV"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-slate-700">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cn('border rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all',
          filter === 'out' ? 'bg-red-500/15 border-red-500/50' : 'bg-red-500/10 border-red-500/30 hover:border-red-500/50')}
          onClick={() => setFilter(filter === 'out' ? 'all' : 'out')}>
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{outOfStockCount}</p>
            <p className="text-sm text-slate-400">Hết hàng</p>
          </div>
        </div>
        <div className={cn('border rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all',
          filter === 'low' ? 'bg-orange-500/15 border-orange-500/50' : 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50')}
          onClick={() => setFilter(filter === 'low' ? 'all' : 'low')}>
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <TrendingDown size={20} className="text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">{lowStockCount}</p>
            <p className="text-sm text-slate-400">Tồn thấp (≤10)</p>
          </div>
        </div>
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Warehouse size={20} className="text-violet-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-violet-400">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-slate-400">Giá trị tồn kho</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-dark pl-9" placeholder="Tìm tên, mã, barcode sản phẩm..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
          {[{ key: 'all', label: 'Tất cả' }, { key: 'low', label: 'Tồn thấp' }, { key: 'out', label: 'Hết hàng' }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={cn('px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
                filter === f.key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Sản Phẩm</th>
                <th className="px-5 py-3">Danh Mục</th>
                <th className="px-5 py-3 text-center">Tồn Kho</th>
                <th className="px-5 py-3">Trạng Thái</th>
                <th className="px-5 py-3 text-right">Giá Nhập</th>
                <th className="px-5 py-3 text-right">Giá Bán</th>
                <th className="px-5 py-3 text-right">Giá Trị Tồn</th>
                <th className="px-5 py-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 size={28} className="animate-spin text-violet-400 mx-auto" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500">
                  <Package size={40} className="mx-auto mb-2 opacity-30" />
                  <p>Không có sản phẩm nào{filter !== 'all' && ` (${filter === 'out' ? 'hết hàng' : 'tồn thấp'})`}</p>
                </td></tr>
              ) : products.map((p: any) => {
                const qty = Number(p.inventory?.[0]?.quantity || 0);
                const status = STOCK_STATUS(qty);
                const stockValue = qty * Number(p.costPrice || p.salePrice || 0);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{p.code}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{p.category?.name || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn('text-lg font-bold', qty <= 0 ? 'text-red-400' : qty <= 10 ? 'text-orange-400' : 'text-white')}>
                        {qty}
                      </span>
                      <span className="text-slate-500 text-xs ml-1">{p.unit?.symbol}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', status.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 text-xs">
                      {p.costPrice ? formatCurrency(Number(p.costPrice)) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-violet-400 font-medium">
                      {formatCurrency(Number(p.salePrice))}
                    </td>
                    <td className="px-5 py-3 text-right text-green-400 font-medium text-xs">
                      {formatCurrency(stockValue)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setAdjustProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg transition-all">
                          <ArrowUpDown size={11} /> Sửa
                        </button>
                        <button onClick={() => setHistoryProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all"
                          title="Lịch sử biến động">
                          <History size={11} /> Log
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
