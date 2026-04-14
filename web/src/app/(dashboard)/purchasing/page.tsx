'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, ShoppingBag, Truck, Building2, CheckCircle,
  Clock, XCircle, FileText, Loader2, Package, X, Trash2,
  PackageCheck, ChevronDown, AlertTriangle, Download,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Constants ───────────────────────────────────────────────────────────────
const PO_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:            { label: 'Nháp',        color: 'bg-slate-700 text-slate-300',       icon: FileText },
  SENT:             { label: 'Đã gửi',       color: 'bg-blue-500/20 text-blue-400',      icon: FileText },
  CONFIRMED:        { label: 'Xác nhận',     color: 'bg-violet-500/20 text-violet-400',  icon: CheckCircle },
  PARTIAL_RECEIVED: { label: 'Nhận 1 phần',  color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  RECEIVED:         { label: 'Đã nhận',     color: 'bg-green-500/20 text-green-400',    icon: CheckCircle },
  CANCELLED:        { label: 'Đã hủy',       color: 'bg-red-500/20 text-red-400',        icon: XCircle },
};

// ─── Create PO Modal ──────────────────────────────────────────────────────────
function CreatePOModal({ branchId, onClose, onSuccess }: {
  branchId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [expectedAt, setExpectedAt] = useState('');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unitCost: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then(r => r.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => api.get('/products', { params: { search: productSearch, limit: 20 } }).then(r => r.data),
    enabled: productSearch.length >= 1,
  });

  const addProduct = (p: any) => {
    if (items.find(i => i.productId === p.id)) {
      toast('Sản phẩm đã có trong phiếu', { icon: '⚠️' });
      return;
    }
    setItems(prev => [...prev, {
      productId: p.id,
      productName: p.name,
      quantity: 1,
      unitCost: Number(p.costPrice || 0),
    }]);
    setProductSearch('');
  };

  const updateItem = (idx: number, field: 'quantity' | 'unitCost', val: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  const handleSubmit = async (status: 'DRAFT' | 'CONFIRMED') => {
    if (!supplierId) { toast.error('Chọn nhà cung cấp'); return; }
    if (items.length === 0) { toast.error('Thêm ít nhất 1 sản phẩm'); return; }
    setLoading(true);
    try {
      await api.post('/purchasing', {
        branchId, supplierId, note, status,
        expectedAt: expectedAt || undefined,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })),
      });
      toast.success(status === 'CONFIRMED' ? 'Tạo và xác nhận phiếu nhập!' : 'Lưu phiếu nháp thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tạo phiếu');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Truck size={18} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Tạo Phiếu Nhập Hàng</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Supplier + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Nhà Cung Cấp <span className="text-red-400">*</span></label>
              <select className="input-dark" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers?.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Ngày dự kiến nhận</label>
              <input type="date" className="input-dark" value={expectedAt} onChange={e => setExpectedAt(e.target.value)} />
            </div>
          </div>

          {/* Product search */}
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Tìm & Thêm Sản Phẩm</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-dark pl-9"
                placeholder="Tên sản phẩm, mã SKU..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
              {productSearch && products?.data?.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                  {products.data.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.code}</p>
                      </div>
                      <span className="text-xs text-violet-400 font-mono">{formatCurrency(Number(p.costPrice))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="rounded-xl border border-slate-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left">Sản phẩm</th>
                  <th className="px-4 py-2.5 text-right w-28">SL</th>
                  <th className="px-4 py-2.5 text-right w-36">Giá nhập</th>
                  <th className="px-4 py-2.5 text-right w-32">Thành tiền</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                    <Package size={28} className="mx-auto mb-2 opacity-30" />
                    Tìm và thêm sản phẩm vào phiếu
                  </td></tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-white text-sm">{item.productName}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number" min={1}
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="input-dark text-right text-sm py-1.5 px-2 w-full"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number" min={0}
                        value={item.unitCost}
                        onChange={e => updateItem(idx, 'unitCost', Number(e.target.value))}
                        className="input-dark text-right text-sm py-1.5 px-2 w-full"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-white">
                      {formatCurrency(item.quantity * item.unitCost)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => removeItem(idx)} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-800/50">
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-white">TỔNG CỘNG</td>
                    <td className="px-4 py-3 text-right text-violet-400 font-bold text-base">{formatCurrency(subtotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Ghi chú</label>
            <textarea className="input-dark resize-none" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú thêm..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-700 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
          <button
            onClick={() => handleSubmit('DRAFT')}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Lưu Nháp
          </button>
          <button
            onClick={() => handleSubmit('CONFIRMED')}
            disabled={loading}
            className="btn-primary flex-1 justify-center"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Xác Nhận PO
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receive Goods Modal ──────────────────────────────────────────────────────
function ReceiveModal({ po, onClose, onSuccess }: { po: any; onClose: () => void; onSuccess: () => void }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(
    Object.fromEntries((po.items || []).map((i: any) => [i.id, Number(i.quantity)]))
  );

  const handleReceive = async () => {
    setLoading(true);
    try {
      await api.post(`/purchasing/${po.id}/receive`, {
        note,
        items: po.items.map((i: any) => ({
          poItemId: i.id,
          receivedQty: receivedQtys[i.id] ?? Number(i.quantity),
        })),
      });
      toast.success('✅ Nhận hàng thành công! Tồn kho đã được cập nhật.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi nhận hàng');
    } finally { setLoading(false); }
  };

  const totalReceived = po.items?.reduce((s: number, i: any) => s + (receivedQtys[i.id] ?? 0) * Number(i.unitCost), 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
              <PackageCheck size={18} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nhận Hàng</h2>
              <p className="text-xs text-slate-400">PO: <span className="text-violet-400 font-mono">{po.code}</span> · {po.supplier?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
            <p className="text-sm text-green-300">✓ Nhận hàng sẽ cập nhật tồn kho ngay lập tức và đánh dấu PO là "Đã nhận".</p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/30">
                <th className="pb-2 text-left">Sản phẩm</th>
                <th className="pb-2 text-right">SL đặt</th>
                <th className="pb-2 text-right w-28">SL nhận</th>
                <th className="pb-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/20">
              {po.items?.map((item: any) => (
                <tr key={item.id} className="py-3">
                  <td className="py-3">
                    <p className="font-medium text-white">{item.product?.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(Number(item.unitCost))}/sp</p>
                  </td>
                  <td className="py-3 text-right text-slate-400">{Number(item.quantity)}</td>
                  <td className="py-3">
                    <input
                      type="number" min={0} max={Number(item.quantity)}
                      value={receivedQtys[item.id] ?? Number(item.quantity)}
                      onChange={e => setReceivedQtys(p => ({ ...p, [item.id]: Number(e.target.value) }))}
                      className="input-dark text-right text-sm py-1.5 px-2 w-full"
                    />
                  </td>
                  <td className="py-3 text-right font-bold text-white">
                    {formatCurrency((receivedQtys[item.id] ?? Number(item.quantity)) * Number(item.unitCost))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 flex justify-between">
            <span className="text-slate-400 font-medium">Tổng giá trị nhận</span>
            <span className="text-violet-400 font-bold text-lg">{formatCurrency(totalReceived)}</span>
          </div>

          <div className="mt-4">
            <label className="text-sm text-slate-400 mb-1.5 block">Ghi chú</label>
            <textarea className="input-dark resize-none" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú khi nhận hàng..." />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-700 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
          <button onClick={handleReceive} disabled={loading} className="btn-success flex-1 justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
            {loading ? 'Đang cập nhật...' : 'Xác Nhận Nhận Hàng'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PurchasingPage() {
  const { currentBranchId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [receivePO, setReceivePO] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', search, status, page, currentBranchId],
    queryFn: () => api.get('/purchasing', {
      params: { search, status, page, limit: 20, branchId: currentBranchId }
    }).then(r => r.data).catch(() => ({ data: [], total: 0, totalPages: 0 })),
    placeholderData: (prev: any) => prev,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/purchasing/${id}/status`, { status }),
    onSuccess: () => { toast.success('Cập nhật trạng thái!'); qc.invalidateQueries({ queryKey: ['purchase-orders'] }); },
  });

  const { data: poDetail } = useQuery({
    queryKey: ['po-detail', expandedId],
    queryFn: () => api.get(`/purchasing/${expandedId}`).then(r => r.data),
    enabled: !!expandedId,
  });

  const orders: any[] = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const totalPending = orders.filter((o: any) => ['DRAFT', 'SENT', 'CONFIRMED'].includes(o.status)).length;
  const totalValue = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const totalDebt = orders.reduce((s: number, o: any) => s + (Number(o.total || 0) - Number(o.paidAmount || 0)), 0);

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/purchasing/${id}`),
    onSuccess: () => { toast.success('Đã xóa phiếu nhập'); refresh(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Không thể xóa'),
  });

  const exportCSV = () => {
    if (orders.length === 0) return toast.error('Không có dữ liệu');
    const BOM = '\uFEFF';
    const header = ['Mã PO', 'Nhà CC', 'Ngày Tạo', 'Trạng Thái', 'Tổng Tiền (đ)', 'Đã Thanh Toán (đ)', 'Còn Nợ (đ)'];
    const rows = orders.map((o: any) => [
      o.code,
      o.supplier?.name || '',
      o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '',
      PO_STATUS[o.status]?.label || o.status,
      Number(o.total || 0).toFixed(0),
      Number(o.paidAmount || 0).toFixed(0),
      (Number(o.total||0) - Number(o.paidAmount||0)).toFixed(0),
    ]);
    const csv = BOM + [header, ...rows].map(r => r.map((c: any) => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `phieu-nhap_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${orders.length} phiếu`);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ['purchase-orders'] });

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreatePOModal branchId={currentBranchId || ''} onClose={() => setShowCreate(false)} onSuccess={refresh} />
      )}
      {receivePO && poDetail && (
        <ReceiveModal po={poDetail} onClose={() => setReceivePO(null)} onSuccess={refresh} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nhập Hàng</h1>
          <p className="text-slate-400 text-sm mt-1">{total} phiếu nhập · {formatCurrency(totalValue)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Tạo Phiếu Nhập
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', value: totalPending, label: 'Đang xử lý', fmt: false },
          { icon: ShoppingBag, color: 'text-violet-400', bg: 'bg-violet-500/20', value: totalValue, label: 'Tổng giá trị', fmt: true },
          { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', value: totalDebt, label: 'Còn nợ NCC', fmt: true },
        ].map((s, i) => (
          <div key={i} className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className={cn('text-xl font-bold', s.color)}>{s.fmt ? formatCurrency(s.value) : s.value}</p>
              <p className="text-sm text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-dark pl-9" placeholder="Tìm mã phiếu, nhà cung cấp..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-dark w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(PO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Mã Phiếu</th>
                <th className="px-5 py-3">Nhà Cung Cấp</th>
                <th className="px-5 py-3">Trạng Thái</th>
                <th className="px-5 py-3 text-right">Tổng Tiền</th>
                <th className="px-5 py-3 text-right">Còn Nợ</th>
                <th className="px-5 py-3">Ngày Tạo</th>
                <th className="px-5 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <Loader2 size={28} className="animate-spin text-violet-400 mx-auto" />
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500">
                  <Package size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="mb-4">Chưa có phiếu nhập hàng nào</p>
                  <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
                    <Plus size={14} /> Tạo phiếu đầu tiên
                  </button>
                </td></tr>
              ) : orders.map((o: any) => {
                const st = PO_STATUS[o.status] || PO_STATUS.DRAFT;
                const StIcon = st.icon;
                const debt = Number(o.total || 0) - Number(o.paidAmount || 0);
                const canReceive = ['CONFIRMED', 'SENT', 'PARTIAL_RECEIVED'].includes(o.status);
                return (
                  <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-violet-400">{o.code}</p>
                      <p className="text-xs text-slate-500">{o.items?.length || 0} sản phẩm</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="text-slate-200">{o.supplier?.name || '—'}</span>
                      </div>
                      {o.branch?.name && <p className="text-xs text-slate-500 mt-0.5">{o.branch.name}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', st.color)}>
                        <StIcon size={11} /> {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-white">{formatCurrency(Number(o.total))}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={cn('font-bold', debt > 0 ? 'text-red-400' : 'text-slate-500')}>
                        {debt > 0 ? formatCurrency(debt) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{formatDate(o.createdAt, 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {canReceive && (
                          <button
                            onClick={() => { setReceivePO(o); setExpandedId(o.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-all"
                          >
                            <PackageCheck size={13} /> Nhận hàng
                          </button>
                        )}
                        {o.status === 'DRAFT' && (
                          <button
                            onClick={() => statusMut.mutate({ id: o.id, status: 'CONFIRMED' })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all"
                          >
                            <CheckCircle size={13} /> Xác nhận
                          </button>
                        )}
                        {!['RECEIVED', 'CANCELLED'].includes(o.status) && (
                          <button
                            onClick={() => { if (confirm('Hủy phiếu này?')) statusMut.mutate({ id: o.id, status: 'CANCELLED' }); }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/30">
            <p className="text-sm text-slate-400">Trang {page}/{totalPages} — {total} phiếu</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm text-slate-300 bg-slate-800 border border-slate-600 rounded-lg disabled:opacity-40">←</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm text-slate-300 bg-slate-800 border border-slate-600 rounded-lg disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
