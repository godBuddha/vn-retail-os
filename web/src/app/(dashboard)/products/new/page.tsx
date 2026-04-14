'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Package, Tag, DollarSign, Loader2, Plus, X, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { productsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const UNITS = [
  { value: 'cái', label: 'Cái' },
  { value: 'hộp', label: 'Hộp' },
  { value: 'thùng', label: 'Thùng' },
  { value: 'kg', label: 'Kg' },
  { value: 'lít', label: 'Lít' },
  { value: 'chai', label: 'Chai' },
  { value: 'túi', label: 'Túi' },
  { value: 'gói', label: 'Gói' },
  { value: 'bịch', label: 'Bịch' },
  { value: 'lon', label: 'Lon' },
  { value: 'pack', label: 'Pack' },
  { value: 'bộ', label: 'Bộ' },
];

export default function NewProductPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    code: '',
    barcode: '',
    categoryId: '',
    unit: 'cái',
    costPrice: '',
    salePrice: '',
    promoPrice: '',
    taxRate: '0',
    minStock: '5',
    maxStock: '',
    description: '',
    notes: '',
    isActive: true,
    isFeatured: false,
    tags: [] as string[],
    images: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.getCategories().then(r => r.data),
  });
  const categories = categoriesData?.data || categoriesData || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => productsApi.create(data),
    onSuccess: () => {
      toast.success('Tạo sản phẩm thành công!');
      qc.invalidateQueries({ queryKey: ['products'] });
      router.push('/products');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Lỗi tạo sản phẩm');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nhập tên sản phẩm'); return; }
    if (!form.salePrice) { toast.error('Nhập giá bán'); return; }

    createMutation.mutate({
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      categoryId: form.categoryId || undefined,
      salePrice: Number(form.salePrice),
      costPrice: Number(form.costPrice) || 0,
      promoPrice: form.promoPrice ? Number(form.promoPrice) : undefined,
      taxRate: Number(form.taxRate),
      minStock: Number(form.minStock) || 0,
      maxStock: form.maxStock ? Number(form.maxStock) : undefined,
      description: form.description.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      tags: form.tags,
      images: form.images,
    });
  };

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) { set('tags', [...form.tags, t]); setTagInput(''); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/products" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Thêm Sản Phẩm Mới</h1>
          <p className="text-slate-400 text-sm mt-1">Điền thông tin sản phẩm bên dưới</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="card-dark p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Package size={18} className="text-violet-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Thông tin cơ bản</h2>
              </div>

              <div>
                <label className="label-dark">Tên sản phẩm <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  className="input-dark" placeholder="Ví dụ: Nước Tăng Lực Sting 330ml" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Mã sản phẩm (SKU)</label>
                  <input value={form.code} onChange={e => set('code', e.target.value)}
                    className="input-dark font-mono" placeholder="Auto-generate nếu để trống" />
                </div>
                <div>
                  <label className="label-dark">Barcode</label>
                  <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
                    className="input-dark font-mono" placeholder="8935006..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Danh mục</label>
                  <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className="input-dark">
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-dark">Đơn vị tính</label>
                  <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input-dark">
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-dark">Mô tả</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  className="input-dark resize-none" rows={3} placeholder="Mô tả ngắn về sản phẩm..." />
              </div>
            </div>

            {/* Pricing */}
            <div className="card-dark p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-green-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Giá bán</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Giá nhập (₫)</label>
                  <input type="number" min="0" value={form.costPrice} onChange={e => set('costPrice', e.target.value)}
                    className="input-dark" placeholder="0" />
                </div>
                <div>
                  <label className="label-dark">Giá bán (₫) <span className="text-red-400">*</span></label>
                  <input type="number" min="0" value={form.salePrice} onChange={e => set('salePrice', e.target.value)}
                    className="input-dark" placeholder="0" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Giá khuyến mãi (₫)</label>
                  <input type="number" min="0" value={form.promoPrice} onChange={e => set('promoPrice', e.target.value)}
                    className="input-dark" placeholder="Để trống nếu không KM" />
                </div>
                <div>
                  <label className="label-dark">Thuế VAT (%)</label>
                  <select value={form.taxRate} onChange={e => set('taxRate', e.target.value)} className="input-dark">
                    <option value="0">0% - Miễn thuế</option>
                    <option value="5">5%</option>
                    <option value="8">8%</option>
                    <option value="10">10%</option>
                  </select>
                </div>
              </div>

              {form.costPrice && form.salePrice && (
                <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                  <p className="text-xs text-slate-400">
                    Lợi nhuận gộp:{' '}
                    <span className="text-green-400 font-bold">
                      {(((Number(form.salePrice) - Number(form.costPrice)) / Number(form.salePrice)) * 100).toFixed(1)}%
                    </span>
                    {' '}({(Number(form.salePrice) - Number(form.costPrice)).toLocaleString('vi-VN')} ₫/sp)
                  </p>
                </div>
              )}
            </div>

            {/* Stock Settings */}
            <div className="card-dark p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Cài đặt tồn kho</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">Tồn kho tối thiểu (cảnh báo)</label>
                  <input type="number" min="0" value={form.minStock} onChange={e => set('minStock', e.target.value)}
                    className="input-dark" />
                </div>
                <div>
                  <label className="label-dark">Tồn kho tối đa</label>
                  <input type="number" min="0" value={form.maxStock} onChange={e => set('maxStock', e.target.value)}
                    className="input-dark" placeholder="Không giới hạn" />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="card-dark p-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={18} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Tags</h2>
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  className="input-dark flex-1" placeholder="Nhập tag và nhấn Enter..." />
                <button type="button" onClick={addTag} className="btn-secondary px-3">
                  <Plus size={16} />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-violet-600/20 text-violet-400 border border-violet-500/30">
                      {t}
                      <button type="button" onClick={() => set('tags', form.tags.filter(x => x !== t))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="card-dark p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Trạng thái</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set('isActive', !form.isActive)}
                  className={cn('relative w-11 h-6 rounded-full transition-colors cursor-pointer', form.isActive ? 'bg-green-500' : 'bg-slate-600')}
                >
                  <div className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.isActive ? 'translate-x-5' : 'translate-x-0')} />
                </div>
                <span className="text-sm text-slate-300">{form.isActive ? 'Đang bán' : 'Ngừng bán'}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set('isFeatured', !form.isFeatured)}
                  className={cn('relative w-11 h-6 rounded-full transition-colors cursor-pointer', form.isFeatured ? 'bg-yellow-500' : 'bg-slate-600')}
                >
                  <div className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.isFeatured ? 'translate-x-5' : 'translate-x-0')} />
                </div>
                <span className="text-sm text-slate-300">Sản phẩm nổi bật</span>
              </label>
            </div>

            {/* Image URLs */}
            <div className="card-dark p-6">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon size={18} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Hình ảnh</h2>
              </div>
              <p className="text-xs text-slate-500 mb-3">Nhập URL ảnh (http://...)</p>
              {form.images.map((url, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={url} onChange={e => {
                    const imgs = [...form.images]; imgs[i] = e.target.value; set('images', imgs);
                  }} className="input-dark flex-1 text-xs" placeholder="https://..." />
                  <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => set('images', [...form.images, ''])}
                className="btn-secondary w-full text-sm mt-1">
                <Plus size={14} /> Thêm URL ảnh
              </button>
            </div>

            {/* Notes */}
            <div className="card-dark p-6">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Ghi chú nội bộ</h2>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                className="input-dark resize-none text-sm" rows={3} placeholder="Ghi chú nội bộ..." />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/products" className="btn-secondary">
            Hủy
          </Link>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Tạo Sản Phẩm
          </button>
        </div>
      </form>
    </div>
  );
}
