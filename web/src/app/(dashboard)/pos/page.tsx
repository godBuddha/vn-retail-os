'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, User, X,
  Barcode, Tag, Loader2, Receipt, RefreshCw,
} from 'lucide-react';
import { useAuthStore, useCartStore } from '@/stores';
import { useI18n } from '@/i18n';
import { productsApi, ordersApi } from '@/lib/api';
import api from '@/lib/api';
import { formatCurrency, debounce, cn } from '@/lib/utils';
import PaymentModal from '@/components/pos/payment-modal';
import ReceiptModal from '@/components/pos/receipt-modal';
import BarcodeScanner from '@/components/pos/barcode-scanner';
import toast from 'react-hot-toast';
import { useHotkeys } from '@/hooks/useHotkeys';

export default function POSPage() {
  const { t } = useI18n();
  const { user, currentBranchId } = useAuthStore();
  const cart = useCartStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- HOTKEYS ---
  useHotkeys({
    'F2': () => searchInputRef.current?.focus(),
    'F9': () => {
      if (cart.items.length > 0 && !paymentOpen && !receiptOpen) {
        setPaymentOpen(true);
      } else if (cart.items.length === 0) {
        toast.error('Giỏ hàng đang trống!');
      }
    },
    'F12': () => {
      if (cart.items.length > 0) {
        if (confirm('Khách hủy mua? Bạn chắc chắn xóa toàn bộ giỏ hàng?')) {
          cart.clearCart();
        }
      }
    },
    'Escape': () => {
       if (paymentOpen) setPaymentOpen(false);
       if (receiptOpen) setReceiptOpen(false);
    }
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.getCategories().then(r => r.data),
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['pos-products', search, categoryFilter, currentBranchId],
    queryFn: () => productsApi.getAll({
      search: search || undefined,
      categoryId: categoryFilter || undefined,
      branchId: currentBranchId,
      limit: 50,
      isActive: true,
    }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  // Add product to cart
  const addToCart = (product: any) => {
    const price = Number(product.promoPrice || product.salePrice);
    cart.addItem({
      productId: product.id,
      variantId: undefined,
      name: product.name,
      sku: product.code,
      salePrice: price,
      costPrice: Number(product.costPrice),
      quantity: 1,
      discount: 0,
      unit: product.unit?.symbol,
    });
    toast.success(`Đã thêm ${product.name}`, { duration: 1000, position: 'bottom-right' });
  };

  // Barcode scan handler
  const handleBarcodeScan = async (barcode: string) => {
    try {
      const { data } = await productsApi.getBarcode(barcode, currentBranchId || undefined);
      addToCart(data.product || data);
    } catch {
      toast.error(`Không tìm thấy sản phẩm: ${barcode}`);
    }
  };

  // Customer search
  const searchCustomer = debounce(async (q: string) => {
    if (!q || q.length < 2) { setCustomerResults([]); return; }
    try {
      const { data } = await import('@/lib/api').then(m => m.default.get('/customers', { params: { search: q, limit: 5 } }));
      setCustomerResults(data.data || []);
      setShowCustomerDropdown(true);
    } catch {}
  }, 300);

  useEffect(() => { searchCustomer(customerSearch); }, [customerSearch]);

  // Promo code validation
  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const { data } = await api.get(`/promotions/validate/${promoCode.trim()}`, {
        params: { orderAmount: cart.getSubtotal() }
      });
      setAppliedPromo(data);
      // Calculate discount
      const discAmt = data.type === 'PERCENTAGE'
        ? Math.min(cart.getSubtotal() * (data.value / 100), data.maxDiscount || Infinity)
        : data.value;
      cart.setCartDiscount(Math.round(discAmt));
      setDiscountInput(String(Math.round(discAmt)));
      toast.success(`Áp dụng "${data.name}" — giảm ${formatCurrency(Math.round(discAmt))}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mã không hợp lệ hoặc hết hạn');
      setAppliedPromo(null);
    } finally { setPromoLoading(false); }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    cart.setCartDiscount(0);
    setDiscountInput('');
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (paymentData: any) => {
      return ordersApi.create({
        branchId: currentBranchId,
        customerId: cart.customerId || undefined,
        items: cart.items.map(i => ({
          productId: i.productId, variantId: i.variantId,
          quantity: i.quantity, discount: i.discount,
        })),
        discountAmount: cart.discount,
        note: cart.note,
        paymentMethod: paymentData.method,
        amountPaid: paymentData.amountPaid || cart.getTotal(),
      });
    },
  });

  const handlePaymentSuccess = async (result: { orderId: string; orderCode: string; method: string; change: number; paidAmount: number }) => {
    setPaymentOpen(false);
    const orderData = {
      code: result.orderCode,
      items: cart.items.map(i => ({ name: i.name, quantity: i.quantity, salePrice: i.salePrice, discount: i.discount, total: i.total })),
      subtotal: cart.getSubtotal(),
      discountAmount: cart.discount,
      total: cart.getTotal(),
      paidAmount: result.paidAmount,
      changeAmount: result.change,
      paymentMethod: result.method,
      pointsEarned: Math.floor(cart.getTotal() / 10000),
      customerName: cart.customerName || undefined,
    };
    setLastOrder(orderData);
    setReceiptOpen(true);
    cart.clearCart();
  };

  const handleNewOrder = () => {
    setReceiptOpen(false);
    setLastOrder(null);
  };

  const subtotal = cart.getSubtotal();
  const discount = cart.discount;
  const total = cart.getTotal();
  const categories = categoriesData?.data || categoriesData || [];
  const products = productsData?.data || productsData || [];

  // Loyalty calculations
  const selectedCustomer = customerResults.find((c: any) => c.id === cart.customerId) || (cart.customerId ? { points: 0 } : null);
  const customerPts = selectedCustomer?.loyaltyPoints ?? selectedCustomer?.points ?? 0;
  const vndPerPoint = 1000;
  const maxPointsToUse = Math.min(customerPts, Math.ceil(total / vndPerPoint));
  const pointsRedeemed = usePoints && cart.customerId ? maxPointsToUse : 0;
  const pointsDiscount = pointsRedeemed * vndPerPoint;
  const finalTotal = Math.max(0, total - pointsDiscount);

  return (
    <div className="flex h-[calc(100vh-65px)] gap-0 -m-6 overflow-hidden">
      <BarcodeScanner onScan={handleBarcodeScan} enabled={!paymentOpen && !receiptOpen} />

      {/* Left: Product Browser */}
      <div className="flex-1 flex flex-col bg-slate-950 border-r border-slate-700/50 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm / barcode (F2)..."
              className="input-dark pl-10 pr-4"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
          {/* Category filter */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter('')}
              className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                !categoryFilter ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
              )}
            >
              Tất cả
            </button>
            {categories.slice(0, 8).map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id === categoryFilter ? '' : c.id)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                  categoryFilter === c.id ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={28} className="animate-spin text-violet-400" />
            </div>
          ) : (
            <div className="pos-products-grid">
              {products.map((product: any) => {
                const price = Number(product.promoPrice || product.salePrice);
                const stock = product.inventory?.[0]?.quantity || 0;
                const outOfStock = stock <= 0 && !product.hasVariants;
                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                    className={cn(
                      'flex flex-col text-left p-3 rounded-xl border transition-all duration-200 group',
                      outOfStock
                        ? 'bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed'
                        : 'bg-slate-800/60 border-slate-700/50 hover:border-violet-500/50 hover:bg-slate-800 hover:-translate-y-0.5'
                    )}
                  >
                    {/* Product image or icon */}
                    <div className="w-full aspect-square rounded-lg bg-slate-700/50 flex items-center justify-center mb-2 overflow-hidden">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-3xl">{product.category?.name?.[0] || '📦'}</div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-tight mb-1">{product.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{product.code}</p>
                    <div className="mt-auto">
                      {product.promoPrice && (
                        <p className="text-xs text-slate-500 line-through">{formatCurrency(Number(product.salePrice))}</p>
                      )}
                      <p className={cn('text-sm font-bold', product.promoPrice ? 'text-red-400' : 'text-violet-400')}>
                        {formatCurrency(price)}
                      </p>
                      <p className={cn('text-xs mt-0.5', stock <= 5 ? 'text-orange-400' : 'text-slate-500')}>
                        Kho: {stock} {product.unit?.symbol || ''}
                      </p>
                    </div>
                  </button>
                );
              })}
              {products.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-500">
                  <Search size={40} className="mb-3 opacity-50" />
                  <p>Không tìm thấy sản phẩm</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-80 xl:w-96 flex flex-col bg-slate-900 overflow-hidden">
        {/* Customer selector */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={customerSearch || cart.customerName || ''}
              onChange={e => { setCustomerSearch(e.target.value); if (!e.target.value) cart.setCustomer(null, null); }}
              placeholder="Khách vãng lai..."
              className="input-dark pl-9 text-sm"
            />
            {cart.customerId && (
              <button onClick={() => { cart.setCustomer(null, null); setCustomerSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={14} />
              </button>
            )}
            {showCustomerDropdown && customerResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-slate-800 border border-slate-700 rounded-xl mt-1 shadow-xl overflow-hidden">
                {customerResults.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => { cart.setCustomer(c.id, c.name); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-400 text-sm font-bold flex-shrink-0">
                      {c.name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm text-white">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone} · {c.points} đ</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Loyalty points banner */}
          {cart.customerId && (() => {
            const customer = customerResults.find((c: any) => c.id === cart.customerId);
            const pts = customer?.loyaltyPoints ?? customer?.points ?? 0;
            const willEarn = Math.floor(total / 10000);
            if (!customer) return null;
            return (
              <div className="mt-2 flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⭐</span>
                  <div>
                    <p className="text-xs text-amber-400 font-medium">{pts.toLocaleString()} điểm hiện có</p>
                    <p className="text-xs text-slate-500">+{willEarn} điểm từ đơn này</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-500 font-bold">{(pts + willEarn).toLocaleString()} pts</span>
                  {pts > 0 && (
                    <label className="flex items-center gap-1 cursor-pointer ml-2">
                      <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)} className="accent-amber-500" />
                      <span className="text-xs text-amber-500 font-medium">Dùng điểm</span>
                    </label>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <ShoppingCart size={48} className="mb-3 opacity-30" />
              <p className="text-sm">Chưa có sản phẩm</p>
              <p className="text-xs mt-1 text-slate-700">Chọn sản phẩm hoặc quét barcode</p>
            </div>
          ) : (
            cart.items.map(item => (
              <div key={`${item.productId}-${item.variantId}`} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(item.salePrice)}/{item.unit || 'cái'}</p>
                  </div>
                  <button
                    onClick={() => cart.removeItem(item.productId, item.variantId)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => item.quantity > 1 ? cart.updateQty(item.productId, item.variantId, item.quantity - 1) : cart.removeItem(item.productId, item.variantId)}
                      className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      onChange={e => cart.updateQty(item.productId, item.variantId, Math.max(1, Number(e.target.value)))}
                      className="w-10 text-center text-sm bg-slate-700 rounded-lg py-1 text-white border border-slate-600"
                    />
                    <button
                      onClick={() => cart.updateQty(item.productId, item.variantId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-white">{formatCurrency(item.total)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout */}
        {cart.items.length > 0 && (
          <div className="border-t border-slate-700/50 p-4 space-y-3">
            {/* Promo code */}
            <div className="flex items-center gap-2">
              <input
                value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                placeholder="Mã khuyến mãi (Enter)..."
                className="input-dark text-sm py-1.5 flex-1 font-mono tracking-wider"
                disabled={!!appliedPromo}
              />
              {appliedPromo ? (
                <button onClick={removePromo} className="px-2 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex-shrink-0">
                  <X size={14} />
                </button>
              ) : (
                <button onClick={applyPromo} disabled={!promoCode || promoLoading}
                  className="px-3 py-1.5 text-xs font-medium bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-lg hover:bg-violet-600/30 disabled:opacity-40 transition-all flex-shrink-0">
                  {promoLoading ? <Loader2 size={12} className="animate-spin" /> : 'Áp'}
                </button>
              )}
            </div>
            {appliedPromo && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Tag size={11} className="text-green-400" />
                <span className="text-xs text-green-300 flex-1">{appliedPromo.name}</span>
                <span className="text-xs font-bold text-green-400">
                  -{appliedPromo.type === 'PERCENTAGE' ? `${appliedPromo.value}%` : formatCurrency(appliedPromo.value)}
                </span>
              </div>
            )}

            {/* Discount */}
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400 flex-shrink-0" />
              <input
                type="number"
                value={discountInput}
                onChange={e => { setDiscountInput(e.target.value); cart.setCartDiscount(Number(e.target.value)); setAppliedPromo(null); }}
                placeholder="Giảm giá trực tiếp..."
                className="input-dark text-sm py-1.5"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Tạm tính ({cart.items.length} sp)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Khấu trừ điểm ({pointsRedeemed} pts)</span>
                  <span>-{formatCurrency(pointsDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-lg border-t border-slate-700 pt-2 mt-2">
                <span>TỔNG</span>
                <span className="text-violet-400">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            {/* Checkout button */}
            <button
              onClick={() => setPaymentOpen(true)}
              className="btn-success w-full justify-center py-3 text-base font-bold shadow-lg shadow-green-500/20"
            >
              <ShoppingCart size={20} />
              Thanh Toán {formatCurrency(finalTotal)}
            </button>

            <button
              onClick={() => cart.clearCart()}
              className="btn-danger w-full justify-center py-2 text-sm"
            >
              <Trash2 size={16} />
              Xóa đơn
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
        cartItems={cart.items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          name: i.name,
          salePrice: i.salePrice,
          quantity: i.quantity,
          discount: i.discount,
          total: i.total,
          unit: i.unit,
        }))}
        subtotal={subtotal}
        cartDiscount={discount + pointsDiscount}
        total={finalTotal}
        customerId={cart.customerId}
        customerName={cart.customerName}
        branchId={currentBranchId || ''}
        enabledMethods={['CASH', 'QR_MANUAL', 'VNPAY', 'MOMO']}
        pointsRedeemed={pointsRedeemed}
      />

      {/* Receipt Modal */}
      {lastOrder && (
        <ReceiptModal
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          onNewOrder={handleNewOrder}
          order={lastOrder}
        />
      )}
    </div>
  );
}
