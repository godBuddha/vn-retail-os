import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string | Date, format = 'dd/MM/yyyy'): string {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  if (format === 'dd/MM/yyyy HH:mm') return `${day}/${month}/${year} ${hours}:${minutes}`;
  if (format === 'dd/MM/yy HH:mm') return `${day}/${month}/${year.toString().slice(-2)} ${hours}:${minutes}`;
  if (format === 'HH:mm dd/MM') return `${hours}:${minutes} ${day}/${month}`;
  if (format === 'dd/MM/yy') return `${day}/${month}/${year.toString().slice(-2)}`;
  return `${day}/${month}/${year}`;
}


export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Quản trị viên',
    BRANCH_ADMIN: 'Quản trị chi nhánh',
    MANAGER: 'Quản lý',
    CASHIER: 'Thu ngân',
    WAREHOUSE: 'Quản lý kho',
    ACCOUNTANT: 'Kế toán',
    READONLY: 'Chỉ xem',
  };
  return labels[role] || role;
}

export function getOrderStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
    CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
    PROCESSING: { label: 'Đang xử lý', color: 'bg-purple-100 text-purple-800' },
    COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
    REFUNDED: { label: 'Đã hoàn trả', color: 'bg-gray-100 text-gray-800' },
  };
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
}

export function generateOrderCode(): string {
  return `DH${Date.now()}`;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
