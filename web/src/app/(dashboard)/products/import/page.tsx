'use client';
import { useState, useRef, DragEvent } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores';
import {
  ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, XCircle,
  Download, Loader2, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ImportRow {
  rowNum: number;
  sku: string;
  name: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  unit: string;
  category: string;
  barcode: string;
  // result
  status?: 'success' | 'error' | 'skip';
  error?: string;
}

const EXPECTED_HEADERS = ['sku', 'name', 'saleprice', 'costprice', 'stock', 'unit', 'category', 'barcode'];
const HEADER_ALIASES: Record<string, string> = {
  'mã sp': 'sku', 'mã sản phẩm': 'sku', 'ma sp': 'sku',
  'tên sp': 'name', 'tên sản phẩm': 'name', 'ten sp': 'name',
  'giá bán': 'saleprice', 'gia ban': 'saleprice', 'salePrice': 'saleprice',
  'giá vốn': 'costprice', 'gia von': 'costprice', 'costPrice': 'costprice',
  'tồn kho': 'stock', 'ton kho': 'stock', 'số lượng': 'stock',
  'đơn vị': 'unit', 'don vi': 'unit',
  'danh mục': 'category', 'danh muc': 'category',
};

function parseCSV(text: string): ImportRow[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse headers
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const headers = rawHeaders.map(h => {
    const lower = h.toLowerCase();
    return HEADER_ALIASES[lower] || HEADER_ALIASES[h] || lower.replace(/\s/g, '');
  });

  return lines.slice(1).map((line, i) => {
    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j] || ''; });
    return {
      rowNum: i + 2,
      sku: row.sku || '',
      name: row.name || '',
      salePrice: parseFloat(row.saleprice?.replace(/[^\d.]/g, '') || '0') || 0,
      costPrice: parseFloat(row.costprice?.replace(/[^\d.]/g, '') || '0') || 0,
      stock: parseInt(row.stock || '0') || 0,
      unit: row.unit || 'cái',
      category: row.category || '',
      barcode: row.barcode || '',
    };
  }).filter(r => r.name);
}

function parseXLSX(buffer: ArrayBuffer): ImportRow[] {
  // Simple XLSX parsing using xlsx library loaded from CDN
  // Fallback: treat as CSV if xlsx not available
  try {
    const XLSX = (window as any).XLSX;
    if (!XLSX) throw new Error('XLSX not loaded');
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length < 2) return [];
    const rawHeaders = (data[0] as string[]).map(h => String(h || '').trim());
    const headers = rawHeaders.map(h => {
      const lower = h.toLowerCase();
      return HEADER_ALIASES[lower] || HEADER_ALIASES[h] || lower.replace(/\s/g, '');
    });
    return data.slice(1).map((row, i) => {
      const r: Record<string, string> = {};
      headers.forEach((h, j) => { r[h] = String(row[j] || ''); });
      return {
        rowNum: i + 2,
        sku: r.sku || '',
        name: r.name || '',
        salePrice: parseFloat(r.saleprice?.replace(/[^\d.]/g, '') || '0') || 0,
        costPrice: parseFloat(r.costprice?.replace(/[^\d.]/g, '') || '0') || 0,
        stock: parseInt(r.stock || '0') || 0,
        unit: r.unit || 'cái',
        category: r.category || '',
        barcode: r.barcode || '',
      };
    }).filter(r => r.name);
  } catch {
    return [];
  }
}

const TEMPLATE_CSV = `Mã SP,Tên SP,Giá bán,Giá vốn,Tồn kho,Đơn vị,Danh mục,Barcode
SP001,Nước Suối Lavie 500ml,8000,5000,100,cái,Nước giải khát,8935049500019
SP002,Mì Hảo Hảo tôm chua cay,4500,3000,200,gói,Mì gói,
SP003,Bột giặt OMO 1kg,89000,65000,50,túi,Hóa phẩm,
`;

export default function BulkImportPage() {
  const { currentBranchId } = useAuthStore();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setFileName(file.name);
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      if (!(window as any).XLSX) {
        await new Promise<void>((resolve) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
          s.onload = () => resolve();
          document.head.appendChild(s);
        });
      }
      const buffer = await file.arrayBuffer();
      setRows(parseXLSX(buffer));
    } else {
      const text = await file.text();
      setRows(parseCSV(text));
    }
    setStep('preview');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!currentBranchId || rows.length === 0) return;
    setImporting(true);

    const results: ImportRow[] = [];
    // Process in batches of 10
    const batches = [];
    for (let i = 0; i < rows.length; i += 10) batches.push(rows.slice(i, i + 10));

    for (const batch of batches) {
      await Promise.all(batch.map(async (row) => {
        if (!row.name || row.salePrice <= 0) {
          results.push({ ...row, status: 'error', error: 'Thiếu tên hoặc giá bán' });
          return;
        }
        try {
          await api.post('/products', {
            name: row.name,
            sku: row.sku || undefined,
            barcode: row.barcode || undefined,
            salePrice: row.salePrice,
            costPrice: row.costPrice || 0,
            unit: row.unit || 'cái',
            categoryName: row.category || undefined,
            branchId: currentBranchId,
            stock: row.stock || 0,
          });
          results.push({ ...row, status: 'success' });
        } catch (e: any) {
          const msg = e?.response?.data?.message || 'Lỗi không xác định';
          results.push({ ...row, status: 'error', error: Array.isArray(msg) ? msg[0] : msg });
        }
      }));
    }

    setResults(results);
    setImporting(false);
    setStep('done');

    const ok = results.filter(r => r.status === 'success').length;
    const fail = results.filter(r => r.status === 'error').length;
    toast.success(`Hoàn tất: ${ok} thành công, ${fail} lỗi`);
  };

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'template_import_san_pham.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const totalOk = results.filter(r => r.status === 'success').length;
  const totalErr = results.filter(r => r.status === 'error').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/products" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Import Sản Phẩm từ Excel/CSV</h1>
          <p className="text-slate-400 text-sm">Nhập hàng loạt sản phẩm, tiết kiệm thời gian</p>
        </div>
        <button onClick={downloadTemplate}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-xl text-sm transition-all">
          <Download size={16} /> Tải template CSV
        </button>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="card-dark rounded-2xl p-8">
          <div
            onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'}`}>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileInput} />
            <FileSpreadsheet size={48} className={`mx-auto mb-4 ${isDragActive ? 'text-violet-400' : 'text-slate-500'}`} />
            <p className="text-white font-semibold text-lg">
              {isDragActive ? 'Thả file vào đây...' : 'Kéo thả file Excel hoặc CSV'}
            </p>
            <p className="text-slate-400 text-sm mt-2">Hỗ trợ .xlsx, .xls, .csv · Tối đa 10MB</p>
            <button type="button" className="mt-6 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-all">
              Chọn file từ máy tính
            </button>
          </div>

          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
            <p className="text-slate-300 text-sm font-medium mb-2">📋 Cột Excel/CSV cần có:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Mã SP (SKU)', 'Tên SP *', 'Giá bán *', 'Giá vốn', 'Tồn kho', 'Đơn vị', 'Danh mục', 'Barcode'].map(c => (
                <span key={c} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="card-dark rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-green-400" />
              <span className="text-white font-medium">{fileName}</span>
              <span className="text-slate-400 text-sm">— {rows.length} sản phẩm</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRows([]); setStep('upload'); }}
                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-sm transition-all">
                Chọn file khác
              </button>
              <button onClick={handleImport} disabled={importing || rows.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                {importing ? <><Loader2 size={16} className="animate-spin" /> Đang import...</> : <><Upload size={16} /> Import {rows.length} sản phẩm</>}
              </button>
            </div>
          </div>

          <div className="card-dark rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">#</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">SKU</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Tên SP</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Giá bán</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Giá vốn</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Tồn kho</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Barcode</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map(row => (
                    <tr key={row.rowNum} className="border-t border-slate-700/50 hover:bg-slate-800/30">
                      <td className="px-4 py-2 text-slate-500">{row.rowNum}</td>
                      <td className="px-4 py-2 text-slate-300 font-mono text-xs">{row.sku}</td>
                      <td className="px-4 py-2 text-white">{row.name}</td>
                      <td className="px-4 py-2 text-right text-green-400">{row.salePrice.toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-2 text-right text-slate-400">{row.costPrice.toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-2 text-right text-slate-300">{row.stock}</td>
                      <td className="px-4 py-2 text-slate-400 font-mono text-xs">{row.barcode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <p className="text-center text-slate-500 text-sm py-3">...và {rows.length - 100} sản phẩm khác</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card-dark rounded-xl p-5 border border-green-500/30">
              <p className="text-slate-400 text-sm">Thành công</p>
              <p className="text-3xl font-bold text-green-400">{totalOk}</p>
            </div>
            <div className="card-dark rounded-xl p-5 border border-red-500/30">
              <p className="text-slate-400 text-sm">Lỗi</p>
              <p className="text-3xl font-bold text-red-400">{totalErr}</p>
            </div>
            <div className="card-dark rounded-xl p-5">
              <p className="text-slate-400 text-sm">Tổng cộng</p>
              <p className="text-3xl font-bold text-white">{results.length}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setRows([]); setResults([]); setStep('upload'); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-all">
              <RefreshCw size={16} /> Import file khác
            </button>
            <Link href="/products" className="flex items-center gap-2 px-5 py-2.5 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl transition-all">
              Xem danh sách sản phẩm
            </Link>
          </div>

          <div className="card-dark rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400">#</th>
                    <th className="px-4 py-3 text-left text-slate-400">Tên SP</th>
                    <th className="px-4 py-3 text-left text-slate-400">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-slate-400">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(row => (
                    <tr key={row.rowNum} className="border-t border-slate-700/50">
                      <td className="px-4 py-2 text-slate-500">{row.rowNum}</td>
                      <td className="px-4 py-2 text-white">{row.name}</td>
                      <td className="px-4 py-2">
                        {row.status === 'success'
                          ? <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={14} /> Thành công</span>
                          : <span className="flex items-center gap-1 text-red-400"><XCircle size={14} /> Lỗi</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs">{row.error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
