'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import vi from './vi';
import en from './en';

type Lang = 'vi' | 'en';

const translations = { vi, en };

interface I18nState {
  lang: Lang;
  t: typeof vi;
  setLang: (lang: Lang) => void;
}

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      lang: 'vi',
      t: vi,
      setLang: (lang) => set({ lang, t: translations[lang] as typeof vi }),
    }),
    { name: 'retail-lang' }
  )
);
