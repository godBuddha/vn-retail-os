'use client';
import AuthGuard from '@/components/auth-guard';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import OfflineBanner from '@/components/OfflineBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-slate-950 overflow-hidden">
        <Sidebar />
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)' }}>
          <Header />
          <main className="flex-1 overflow-y-auto p-6 relative">
            <OfflineBanner />
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
