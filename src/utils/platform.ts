import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Small layer over things a hosted (sandboxed) page cannot do directly:
 * downloads, confirmation dialogs and printing. Works the same when run locally.
 */
export const embedded = (() => { try { return window.self !== window.top; } catch { return true; } })();
/** window.print is blocked inside the hosted frame, so print buttons hide there. */
export const canPrint = !embedded;

type DownloadsNs = { save: (r: { filename: string; data: string | Blob }) => Promise<{ status: string }> };
let dlNs: Promise<DownloadsNs | null> | null = null;
const downloadsNs = () => {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return Promise.resolve(null);
  dlNs ??= c.use('downloads').then((x) => (x as DownloadsNs) ?? null).catch(() => null);
  return dlNs;
};

/** Save a generated file. Returns false if the viewer declined. Throws on a real failure. */
export async function saveFile(filename: string, data: string | Blob, type = 'text/plain'): Promise<boolean> {
  const ns = await downloadsNs();
  if (ns) {
    try { await ns.save({ filename, data }); return true; }
    catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return false;
      if (code !== 'unavailable' && code !== 'not_granted' && code !== 'capability_disabled' && code !== 'capability_removed')
        throw new Error((e as { message?: string })?.message || 'Download failed');
    }
  }
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  return true;
}

/** In-app confirmation dialog (the browser's confirm() is blocked when hosted). */
export function ask(message: string, opts: { ok?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: boolean) => { root.unmount(); host.remove(); window.removeEventListener('keydown', key); resolve(v); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); };
    window.addEventListener('keydown', key);
    const h = React.createElement;
    root.render(
      h('div', { className: 'overlay', onMouseDown: (e: React.MouseEvent) => e.target === e.currentTarget && done(false) },
        h('div', { className: 'modal ask', role: 'alertdialog', 'aria-modal': true, 'aria-label': 'Confirm' },
          h('div', { className: 'modal-body' }, h('p', { style: { fontSize: '.95rem', lineHeight: 1.5 } }, message)),
          h('div', { className: 'modal-ftr' },
            h('button', { className: 'btn btn-out', onClick: () => done(false) }, 'Cancel'),
            h('button', { className: `btn ${opts.danger ?? /delete|clear|remove|reset|overwrite|replace/i.test(message) ? 'btn-err' : 'btn-pri'}`, onClick: () => done(true), autoFocus: true }, opts.ok ?? 'Confirm')))));
  });
}
