import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to manage global keyboard shortcuts.
 * Prevents shortcuts from triggering if the user is typing in an input field
 * unless that input field matches a specific whitelist (if provided).
 */
export function useHotkeys(
  hotkeyMap: Record<string, () => void>,
  options: {
    enabled?: boolean;
    ignoreInputFocus?: boolean;
  } = {}
) {
  const { enabled = true, ignoreInputFocus = false } = options;
  const handlersRef = useRef(hotkeyMap);

  // Keep ref up to date to avoid stale closures and unnecessary re-renders
  useEffect(() => {
    handlersRef.current = hotkeyMap;
  }, [hotkeyMap]);

  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore shortcuts if the user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT');

      const keyCode = e.key;
      const handler = handlersRef.current[keyCode];

      if (handler) {
        if (isInputFocused && !ignoreInputFocus) {
          // If focus is in input and we aren't allowing it, ignore.
          // Example: pressing 'F2' while typing shouldn't be blocked, 
          // usually F-keys are safe to override even in inputs unless 
          // they have a specific purpose. We can adjust this logic if needed.
          // However, for F-keys, they don't produce characters, so we might want to allow them.
          if (!keyCode.startsWith('F') && keyCode !== 'Escape') {
             return;
          }
        }
        
        e.preventDefault();
        handler();
      }
    },
    [enabled, ignoreInputFocus]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);
}
