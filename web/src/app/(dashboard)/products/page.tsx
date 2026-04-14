'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Package, Tag, BarChart2, Upload, Download, Loader2, Filter } from 'lucide-react';
import { productsApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores';
import { exportProductsToXlsx } from '@/lib/exportToExcel';

export default function ProductsPage() {
  const { currentBranchId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, page, currentBranchId],
    queryFn: () => productsApi.getAll({ search, categoryId: categoryFilter, page, limit: 20, branchId: currentBranchId }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.getCategories().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => { toast.success('Đã xóa sản phẩm'); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: () => toast.error('Lỗi xóa sản phẩm'),
  });

  const products = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const categories = categoriesData?.data || categoriesData || [];

  const handleExportExcel = async () => {
    try {
      // Fetch all products for export
      const { data } = await productsApi.getAll({ branchId: currentBranchId, limit: 10000 });
      await exportProductsToXlsx(data.data || []);
      toast.success('Đã xuất Excel danh sách sản phẩm');
    } catch (err) {
      toast.error('Lỗi khi xuất bảng sản phẩm');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sản Phẩm</h1>
          <p className="text-slate-400 text-sm mt-1">{total} sản phẩm</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportExcel} className="btn-secondary">
            <Download size={16} />
            Xuất Excel
          </button>
          <Link href="/products/import" className="btn-secondary">
            <Upload size={16} />
            Import Excel
          </Link>
          <Link href="/products/new" className="btn-primary">
            <Plus size={16} />
            Thêm Sản Phẩm
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card-dark p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên, mã, barcode..."
              className="input-dark pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="input-dark min-w-40"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Sản phẩm</th>
                <th className="px-6 py-3">Mã / Barcode</th>
                <th className="px-6 py-3">Danh mục</th>
                <th className="px-6 py-3 text-right">Giá nhập</th>
                <th className="px-6 py-3 text-right">Giá bán</th>
                <th className="px-6 py-3 text-right">Tồn kho</th>
                <th className="px-6 py-3 text-center">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <Loader2 size={28} className="animate-spin text-violet-400 mx-auto" />
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">
                  <Package size={40} className="mx-auto mb-2 opacity-30" />
                  <p>Không có sản phẩm nào</p>
                </td></tr>
              ) : products.map((p: any) => {
                const stock = p.inventory?.reduce((sum: number, inv: any) => sum + Number(inv.quantity), 0) || 0;
                const isLowStock = stock <= p.minStock;
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : <Package size={18} className="text-slate-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{p.name}</p>
                          {p.promoPrice && <p className="text-xs text-red-400">Đang khuyến mãi</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-slate-300">{p.code}</p>
                      {p.barcode && <p className="text-xs text-slate-500 font-mono">{p.barcode}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {p.category && (
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-700 text-slate-300">{p.category.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 text-sm">{formatCurrency(Number(p.costPrice))}</td>
                    <td className="px-6 py-4 text-right">
                      <div>
                        <p className={cn('text-sm font-bold', p.promoPrice ? 'text-red-400' : 'text-white')}>
                          {formatCurrency(Number(p.promoPrice || p.salePrice))}
                        </p>
                        {p.promoPrice && <p className="text-xs text-slate-500 line-through">{formatCurrency(Number(p.salePrice))}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn('text-sm font-medium', isLowStock ? 'text-orange-400' : 'text-slate-300')}>
                        {stock} {p.unit?.symbol || ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400')}>
                        {p.isActive ? 'Hoạt động' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/products/${p.id}/edit`} className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-400/10 rounded-lg transition-all">
                          <Edit2 size={15} />
                        </Link>
                        <button
                          onClick={() => { if (confirm('Xóa sản phẩm này?')) deleteMutation.mutate(p.id); }}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/30">
            <p className="text-sm text-slate-400">Hiển thị {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} / {total}</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50">←</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={cn('px-3 py-1.5 rounded-lg text-sm transition-colors', p === page ? 'bg-violet-600 text-white' : 'btn-secondary')}>
                  {p}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
