'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores';

export default function ThemeManager() {
  const { user } = useAuthStore();

  useEffect(() => {
    // If no user is logged in, we can still fall back to a default token or let it just be default dark
    const userId = user?.id || 'default';
    
    const applyTheme = () => {
      const stored = localStorage.getItem(`appearance-settings-${userId}`);
      if (stored) {
        try {
          const settings = JSON.parse(stored);
          const root = document.documentElement;

          // 1. Font Size
          const fonts = { small: '12px', medium: '14px', large: '16px' };
          root.style.fontSize = fonts[settings.fontSize as keyof typeof fonts] || '14px';

          // 2. Theme (Light/Dark)
          if (settings.theme === 'light') {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
          } else {
            root.classList.remove('light-theme');
            root.classList.add('dark-theme');
          }

          // 3. Accent Color
          const colors = {
            violet: '#7c3aed',
            blue: '#2563eb',
            green: '#059669',
            orange: '#ea580c',
            pink: '#db2777'
          };
          const primary = colors[settings.accentColor as keyof typeof colors];
          if (primary) {
            root.style.setProperty('--color-primary-base', primary);
          }
        } catch (e) {}
      }
    };

    applyTheme();
    window.addEventListener('storage', applyTheme);
    const interval = setInterval(applyTheme, 500); // Poll for fast intra-tab updates from React state changes where storage event might not fire to self

    return () => {
      window.removeEventListener('storage', applyTheme);
      clearInterval(interval);
    };
  }, [user?.id]);

  return null;
}
