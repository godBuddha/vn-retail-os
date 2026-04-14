import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/providers';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Hệ Thống Quản Lý Bán Hàng',
  description: 'Phần mềm quản lý bán hàng toàn diện cho chuỗi cửa hàng',
  keywords: 'quản lý bán hàng, POS, ERP, CRM, kho hàng',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
