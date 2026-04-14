'use client';
import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  enabled: boolean;
}

export default function BarcodeScanner({ onScan, enabled }: BarcodeScannerProps) {
  const bufferRef = useRef('');
  const lastKeyRef = useRef(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    // Ignore if focus is on input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      // But still capture if it's super fast (barcode scanner)
      const now = Date.now();
      if (now - lastKeyRef.current > 50) {
        bufferRef.current = '';
      }
      lastKeyRef.current = now;

      if (e.key === 'Enter' && bufferRef.current.length > 3) {
        onScan(bufferRef.current);
        bufferRef.current = '';
        e.preventDefault();
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
      return;
    }

    const now = Date.now();
    if (now - lastKeyRef.current > 50) {
      bufferRef.current = '';
    }
    lastKeyRef.current = now;

    if (e.key === 'Enter') {
      if (bufferRef.current.length > 3) {
        onScan(bufferRef.current);
        bufferRef.current = '';
      }
    } else if (e.key.length === 1) {
      bufferRef.current += e.key;
    }
  }, [enabled, onScan]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null; // invisible component
}
