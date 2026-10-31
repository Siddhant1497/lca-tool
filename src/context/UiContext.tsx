import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

/** Call before first render so the page never flashes the wrong theme. */
export const initialTheme = (): Theme => {
  const t = read('ui_theme');
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

interface UiCtx { theme: Theme; toggleTheme: () => void; collapsed: boolean; toggleSidebar: () => void }
const Ctx = createContext<UiCtx | null>(null);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const s = read('ui_sidebar');
    return s ? s === 'collapsed' : window.innerWidth < 900;
  });

  useEffect(() => { document.documentElement.dataset.theme = theme; write('ui_theme', theme); }, [theme]);
  useEffect(() => { write('ui_sidebar', collapsed ? 'collapsed' : 'open'); }, [collapsed]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), []);

  // "[" toggles the sidebar (ignored while typing)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== '[' || e.metaKey || e.ctrlKey || el.closest('input,textarea,select,[contenteditable]')) return;
      toggleSidebar();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [toggleSidebar]);

  return <Ctx.Provider value={{ theme, toggleTheme, collapsed, toggleSidebar }}>{children}</Ctx.Provider>;
};

export const useUi = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUi outside UiProvider');
  return c;
};
