import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  phone?: string;
  language: string;
  isTwoFactorEnabled?: boolean;
  branches: Array<{ id: string; name: string; code: string; isPrimary: boolean }>;
  userBranches?: Array<{ id: string; branchId: string; isPrimary: boolean; branch: { id: string; name: string; code: string } }>;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  currentBranchId: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setCurrentBranch: (branchId: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentBranchId: null,
      isAuthenticated: false,

      setAuth: (userRaw: any, accessToken: string, refreshToken: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        // Normalize branches - API may return userBranches or branches
        const rawBranches = userRaw.userBranches || userRaw.branches || [];
        const branches = rawBranches.map((ub: any) => ({
          id: ub.branch?.id || ub.id,
          name: ub.branch?.name || ub.name,
          code: ub.branch?.code || ub.code,
          isPrimary: ub.isPrimary ?? false,
        }));
        const user: User = { ...userRaw, branches, userBranches: userRaw.userBranches || [] };
        const primaryBranch = branches.find((b: any) => b.isPrimary);
        set({
          user, accessToken, refreshToken, isAuthenticated: true,
          currentBranchId: primaryBranch?.id || branches[0]?.id || null,
        });
      },

      setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),

      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, currentBranchId: null });
      },
    }),
    { name: 'retail-auth', partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken, currentBranchId: state.currentBranchId, isAuthenticated: state.isAuthenticated }) }
  )
);

// Cart store for POS
interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  sku?: string;
  salePrice: number;
  costPrice: number;
  quantity: number;
  discount: number;
  total: number;
  unit?: string;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  discount: number;
  note: string;
  addItem: (item: Omit<CartItem, 'total'>) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, variantId: string | undefined, qty: number) => void;
  updateDiscount: (productId: string, variantId: string | undefined, discount: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  setCartDiscount: (discount: number) => void;
  setNote: (note: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  discount: 0,
  note: '',

  addItem: (item) => set((state) => {
    const existing = state.items.find(
      i => i.productId === item.productId && i.variantId === item.variantId
    );
    if (existing) {
      return {
        items: state.items.map(i =>
          i.productId === item.productId && i.variantId === item.variantId
            ? { ...i, quantity: i.quantity + item.quantity, total: (i.quantity + item.quantity) * (i.salePrice - i.discount) }
            : i
        ),
      };
    }
    return {
      items: [...state.items, { ...item, total: item.quantity * (item.salePrice - item.discount) }],
    };
  }),

  removeItem: (productId, variantId) => set((state) => ({
    items: state.items.filter(i => !(i.productId === productId && i.variantId === variantId)),
  })),

  updateQty: (productId, variantId, qty) => set((state) => ({
    items: state.items.map(i =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, quantity: qty, total: qty * (i.salePrice - i.discount) }
        : i
    ),
  })),

  updateDiscount: (productId, variantId, discount) => set((state) => ({
    items: state.items.map(i =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, discount, total: i.quantity * (i.salePrice - discount) }
        : i
    ),
  })),

  setCustomer: (id, name) => set({ customerId: id, customerName: name }),
  setCartDiscount: (discount) => set({ discount }),
  setNote: (note) => set({ note }),
  clearCart: () => set({ items: [], customerId: null, customerName: null, discount: 0, note: '' }),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.total, 0),
  getTotal: () => {
    const subtotal = get().items.reduce((sum, i) => sum + i.total, 0);
    return Math.max(0, subtotal - get().discount);
  },
}));
