import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - auto refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw error;
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
  generate2FA: () => api.post('/auth/2fa/generate'),
  turnOn2FA: (token: string) => api.post('/auth/2fa/turn-on', { token }),
  turnOff2FA: (token: string) => api.post('/auth/2fa/turn-off', { token }),
  verifyLogin2FA: (userId: string, token: string) => api.post('/auth/2fa/verify-login', { userId, token }),
};


// Products
export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getOne: (id: string) => api.get(`/products/${id}`),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getBarcode: (barcode: string, branchId?: string) => api.get(`/products/barcode/${barcode}`, { params: { branchId } }),
  getCategories: () => api.get('/products/categories'),
  getUnits: () => api.get('/products/units'),
  bulkImport: (products: any[]) => api.post('/products/bulk-import', { products }),
};

// Orders
export const ordersApi = {
  getAll: (params?: any) => api.get('/orders', { params }),
  getOne: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  refund: (id: string, data: any) => api.post(`/orders/${id}/refund`, data),
  getDailySummary: (branchId: string, date?: string) => api.get('/orders/daily-summary', { params: { branchId, date } }),
  getWeeklyRevenue: (branchId: string, days?: number) => api.get('/orders/weekly-revenue', { params: { branchId, days } }),
  openShift: (data: any) => api.post('/orders/shifts/open', data),
  closeShift: (id: string, data: any) => api.post(`/orders/shifts/${id}/close`, data),
};


// Customers
export const customersApi = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getOne: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  getStats: () => api.get('/customers/stats'),
};

// Suppliers
export const suppliersApi = {
  getAll: (params?: any) => api.get('/suppliers', { params }),
  getOne: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};

// Inventory
export const inventoryApi = {
  getMovements: (params?: any) => api.get('/inventory/movements', { params }),
  adjust: (id: string, data: any) => api.patch(`/inventory/${id}/adjust`, data),
  getAlerts: () => api.get('/inventory/alerts'),
};

// Promotions
export const promotionsApi = {
  getAll: (params?: any) => api.get('/promotions', { params }),
  getOne: (id: string) => api.get(`/promotions/${id}`),
  create: (data: any) => api.post('/promotions', data),
  update: (id: string, data: any) => api.put(`/promotions/${id}`, data),
  delete: (id: string) => api.delete(`/promotions/${id}`),
  validate: (code: string, orderAmount: number) => api.post('/promotions/validate', { code, orderAmount }),
};

// Employees
export const employeesApi = {
  getAll: (params?: any) => api.get('/employees', { params }),
  getOne: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

// Branches
export const branchesApi = {
  getAll: (params?: any) => api.get('/branches', { params }),
  getOne: (id: string) => api.get(`/branches/${id}`),
  create: (data: any) => api.post('/branches', data),
  update: (id: string, data: any) => api.put(`/branches/${id}`, data),
};

// Purchasing
export const purchasingApi = {
  getAll: (params?: any) => api.get('/purchasing', { params }),
  getOne: (id: string) => api.get(`/purchasing/${id}`),
  create: (data: any) => api.post('/purchasing', data),
  update: (id: string, data: any) => api.put(`/purchasing/${id}`, data),
  receive: (id: string, data: any) => api.post(`/purchasing/${id}/receive`, data),
};

// Bank Accounts
export const bankAccountsApi = {
  getAll: (params?: any) => api.get('/bank-accounts', { params }),
  create: (data: any) => api.post('/bank-accounts', data),
  update: (id: string, data: any) => api.put(`/bank-accounts/${id}`, data),
  setDefault: (id: string) => api.post(`/bank-accounts/${id}/set-default`),
  delete: (id: string) => api.delete(`/bank-accounts/${id}`),
};

// Payments
export const paymentsApi = {
  cash: (data: any) => api.post('/payments/cash', data),
  vnpay: (data: any) => api.post('/payments/vnpay/create', data),
  momo: (data: any) => api.post('/payments/momo/create', data),
  getStatus: (orderId: string) => api.get(`/payments/status/${orderId}`),
};

// Users
export const usersApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getOne: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

