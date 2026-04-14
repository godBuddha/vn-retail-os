'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, Printer, Plus, Minus, Search, QrCode } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  salePrice: number;
  unit?: string;
}

interface LabelItem {
  product: Product;
  qty: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// Generate SVG barcode (Code128 simplified via character encoding)
function BarcodeLabel({ product, showPrice = true, size = '58mm' }: {
  product: Product; showPrice?: boolean; size?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const code = product.barcode || product.sku || product.id.slice(0, 12);
    // Use JsBarcode via dynamic script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    script.onload = () => {
      try {
        (window as any).JsBarcode(canvasRef.current, code, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 9,
          margin: 4,
          background: '#ffffff',
          lineColor: '#000000',
          fontOptions: '',
          font: 'monospace',
        });
      } catch {}
    };
    if (!(window as any).JsBarcode) {
      document.head.appendChild(script);
    } else {
      script.onload?.(new Event('load'));
    }
  }, [product]);

  const isSmall = size === '40mm';

  return (
    <div className={`bg-white border border-gray-300 flex flex-col items-center p-1 ${isSmall ? 'w-[151px] h-[113px]' : 'w-[219px] h-[130px]'}`}
      style={{ fontFamily: 'Arial, sans-serif' }}>
      <p className="text-black text-center font-bold leading-tight"
        style={{ fontSize: isSmall ? '7px' : '9px', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {product.name}
      </p>
      <canvas ref={canvasRef} className="max-w-full" />
      {showPrice && (
        <p className="text-black font-bold" style={{ fontSize: isSmall ? '10px' : '13px' }}>
          {formatCurrency(product.salePrice)}
        </p>
      )}
      {product.unit && (
        <p className="text-gray-500" style={{ fontSize: '7px' }}>ĐVT: {product.unit}</p>
      )}
    </div>
  );
}

export default function BarcodePrintPage() {
  const [search, setSearch] = useState('');
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [labelSize, setLabelSize] = useState<'58mm' | '40mm'>('58mm');
  const [showPrice, setShowPrice] = useState(true);
  const [cols, setCols] = useState(3);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-barcode', search],
    queryFn: async () => {
      const r = await api.get('/products', { params: { search, limit: 30 } });
      return r.data?.data || r.data || [];
    },
    enabled: search.length > 0,
  });

  const addProduct = (p: Product) => {
    setLabels(prev => {
      const ex = prev.find(l => l.product.id === p.id);
      if (ex) return prev.map(l => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { product: p, qty: 1 }];
    });
    setSearch('');
  };

  const updateQty = (id: string, delta: number) => {
    setLabels(prev => prev.map(l => l.product.id === id
      ? { ...l, qty: Math.max(0, l.qty + delta) }
      : l
    ).filter(l => l.qty > 0));
  };

  const totalLabels = labels.reduce((s, l) => s + l.qty, 0);

  const handlePrint = () => {
    window.print();
  };

  // Expand labels for print
  const printLabels = labels.flatMap(item =>
    Array(item.qty).fill(null).map(() => item.product)
  );

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; }
          @page { margin: 5mm; size: A4; }
        }
      `}</style>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/products" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">In Nhãn Barcode</h1>
            <p className="text-slate-400 text-sm">Tạo và in nhãn giá cho sản phẩm</p>
          </div>
          <button onClick={handlePrint} disabled={labels.length === 0}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-all disabled:opacity-40">
            <Printer size={18} /> In {totalLabels > 0 ? `${totalLabels} nhãn` : ''}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Product search + list */}
          <div className="col-span-1 space-y-4">
            <div className="card-dark rounded-xl p-4">
              <h3 className="text-white font-medium mb-3">Tìm sản phẩm</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input-dark w-full pl-9"
                  placeholder="Tìm theo tên, SKU, barcode..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {search && products.length > 0 && (
                <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                  {products.map(p => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 transition-all">
                      <p className="text-white text-sm truncate">{p.name}</p>
                      <p className="text-slate-400 text-xs">{p.sku} · {formatCurrency(p.salePrice)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected products */}
            <div className="card-dark rounded-xl p-4">
              <h3 className="text-white font-medium mb-3">Danh sách nhãn ({labels.length} SP)</h3>
              {labels.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Chưa chọn sản phẩm nào</p>
              ) : (
                <div className="space-y-2">
                  {labels.map(item => (
                    <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs truncate">{item.product.name}</p>
                        <p className="text-slate-400 text-xs">{item.product.sku}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.product.id, -1)}
                          className="w-6 h-6 rounded bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-all">
                          <Minus size={10} />
                        </button>
                        <span className="w-8 text-center text-white text-sm">{item.qty}</span>
                        <button onClick={() => updateQty(item.product.id, 1)}
                          className="w-6 h-6 rounded bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-all">
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="card-dark rounded-xl p-4 space-y-4">
              <h3 className="text-white font-medium">Tuỳ chọn nhãn</h3>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Kích thước nhãn</label>
                <div className="flex gap-2">
                  {(['58mm', '40mm'] as const).map(s => (
                    <button key={s} onClick={() => setLabelSize(s)}
                      className={`flex-1 py-1.5 rounded-lg text-sm border transition-all ${labelSize === s ? 'bg-violet-600/20 text-violet-400 border-violet-500/40' : 'text-slate-400 border-slate-700 hover:border-slate-600'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Số cột trên A4</label>
                <div className="flex gap-2">
                  {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setCols(n)}
                      className={`flex-1 py-1.5 rounded-lg text-sm border transition-all ${cols === n ? 'bg-violet-600/20 text-violet-400 border-violet-500/40' : 'text-slate-400 border-slate-700 hover:border-slate-600'}`}>
                      {n} cột
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showPrice" checked={showPrice}
                  onChange={e => setShowPrice(e.target.checked)} className="w-4 h-4 accent-violet-500" />
                <label htmlFor="showPrice" className="text-slate-300 text-sm">Hiển thị giá</label>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="col-span-2">
            <div className="card-dark rounded-xl p-4">
              <h3 className="text-white font-medium mb-4">Xem trước ({totalLabels} nhãn)</h3>
              {printLabels.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <QrCode size={48} className="mx-auto mb-3 text-slate-600" />
                  <p>Chọn sản phẩm để xem trước nhãn</p>
                </div>
              ) : (
                <div id="print-area"
                  className="bg-white p-4 rounded-lg"
                  style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '4px' }}>
                  {printLabels.map((p, i) => (
                    <BarcodeLabel key={`${p.id}-${i}`} product={p} showPrice={showPrice} size={labelSize} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
