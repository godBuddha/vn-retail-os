'use client';
import { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false); // Show again if we go offline again
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
      <WifiOff size={18} />
      <span className="text-sm font-medium">Bạn đang ngoại tuyến. Hệ thống PWA đang hoạt động từ bộ nhớ đệm (cache).</span>
      <button onClick={() => setDismissed(true)} className="p-1 hover:bg-orange-600 rounded-full transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}
