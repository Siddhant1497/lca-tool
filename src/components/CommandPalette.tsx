import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLCA } from '../context/LCAContext';
import { useHub } from '../context/HubContext';
import { useUi } from '../context/UiContext';
import { useToast } from './ui/Toast';
import Icon, { type IconName } from './ui/Icon';
import { visibleNav } from './nav';

interface Cmd { id: string; label: string; hint: string; icon: IconName; run: () => void }

/** Ctrl/⌘+K quick switcher: every page plus the common actions. */
const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const { dispatch } = useLCA();
  const { hub, dispatch: hd } = useHub();
  const { toggleTheme, toggleSidebar, theme } = useUi();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); setQ(''); setI(0); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 0); }, [open]);

  const cmds = useMemo<Cmd[]>(() => [
    ...visibleNav(hub.settings.modules).map((n) => ({ id: n.page, label: n.label, hint: 'Go to page', icon: n.icon, run: () => dispatch({ type: 'SET_PAGE', page: n.page }) })),
    { id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, hint: 'Appearance', icon: theme === 'dark' ? 'sun' : 'moon', run: toggleTheme },
    { id: 'side', label: 'Toggle sidebar', hint: 'Layout  [', icon: 'chevL', run: toggleSidebar },
    { id: 'xlsx', label: 'Export Excel workbook', hint: 'Export', icon: 'sheet', run: async () => {
      if (!hub.ghg.length && !hub.projects.length) { toast('Nothing to export yet', 'info'); return; }
      const { exportWorkbook } = await import('../utils/xlsx'); await exportWorkbook(hub); toast('Excel workbook downloaded'); } },
    { id: 'print', label: 'Print / save as PDF', hint: 'Export', icon: 'file', run: () => setTimeout(() => window.print(), 100) },
    { id: 'sample', label: 'Load sample portfolio', hint: 'Data', icon: 'grid', run: () => { if (!hub.loaded || confirm('Replace current data with the illustrative sample?')) { hd({ type: 'LOAD_SAMPLE' }); dispatch({ type: 'SET_PAGE', page: 'hub' }); } } },
  ], [dispatch, hub, hd, theme, toggleTheme, toggleSidebar, toast]);

  const list = cmds.filter((c) => (c.label + ' ' + c.hint).toLowerCase().includes(q.toLowerCase().trim()));
  if (!open) return null;
  const go = (c?: Cmd) => { if (!c) return; setOpen(false); c.run(); };

  return (
    <div className="overlay palette-ov" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-in">
          <Icon name="search" size={18} />
          <input ref={input} value={q} placeholder="Jump to a page or run an action…" aria-label="Search commands"
            onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(x + 1, list.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
              if (e.key === 'Enter') go(list[i]);
            }} />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" role="listbox">
          {list.length === 0 && <div className="cell-sub" style={{ padding: 16, textAlign: 'center' }}>No matches</div>}
          {list.map((c, k) => (
            <button key={c.id} role="option" aria-selected={k === i} className={`palette-item${k === i ? ' on' : ''}`} onMouseEnter={() => setI(k)} onClick={() => go(c)}>
              <Icon name={c.icon} size={16} /><span className="grow">{c.label}</span><span className="cell-sub">{c.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
