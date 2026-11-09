import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import type { HubState, GhgYear, HubSettings, CertProject, Lever, EmissionFactor, Activity, DocSet } from '../types/hub';
import { SAMPLE } from '../data/hubSample';

export type HubAction =
  | { type: 'LOAD_SAMPLE' } | { type: 'START_EMPTY'; modules?: HubSettings['modules'] } | { type: 'CLEAR' }
  | { type: 'RESTORE'; state: HubState }
  | { type: 'REPLACE'; state: HubState }
  | { type: 'SET_GHG'; ghg: GhgYear[] }
  | { type: 'UPSERT_GHG'; row: GhgYear; replaceYear?: number }
  | { type: 'DELETE_GHG'; year: number }
  | { type: 'SET_SETTINGS'; settings: Partial<HubSettings> }
  | { type: 'UPSERT_PROJECT'; item: CertProject } | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'UPSERT_LEVER'; item: Lever } | { type: 'DELETE_LEVER'; id: string }
  | { type: 'UPSERT_FACTOR'; item: EmissionFactor } | { type: 'ADD_FACTORS'; items: EmissionFactor[] } | { type: 'DELETE_FACTOR'; id: string }
  | { type: 'UPSERT_ACTIVITY'; item: Activity } | { type: 'DELETE_ACTIVITY'; id: string }
  | { type: 'UPSERT_DOC'; item: DocSet } | { type: 'DELETE_DOC'; id: string }
  | { type: 'DOC_EDIT'; id: string; key: string; value: string }
  | { type: 'UPDATE_DOC_SRC'; id: string; src: DocSet['src'] }
  | { type: 'DOC_META'; id: string; credit: string; patch: DocSet['meta'][string] };

export const EMPTY: HubState = {
  loaded: false, isSample: false, ghg: [], projects: [], levers: [], factors: [], activities: [], docs: [],
  settings: { targetYear: 2030, annualPct: 4.2, s2Method: 'location', revenueUnit: '₹ crore', currency: '₹', orgName: '', modules: { certs: true, lca: true }, s3Pct: 2.5, netZeroYear: 2050, nzPct: 90 },
};

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
const byYear = (g: GhgYear[]) => [...g].sort((a, b) => a.year - b.year);

/** Fill fields added in later versions so old saved data keeps working. */
export const migrate = (raw: Partial<HubState>): HubState => ({
  ...EMPTY, ...raw,
  ghg: byYear(raw.ghg ?? []), projects: raw.projects ?? [], levers: raw.levers ?? [],
  factors: raw.factors ?? [], activities: raw.activities ?? [], docs: raw.docs ?? [],
  settings: { ...EMPTY.settings, ...(raw.settings ?? {}), modules: { ...EMPTY.settings.modules, ...(raw.settings?.modules ?? {}) } },
});

export const reducer = (s: HubState, a: HubAction): HubState => {
  const live = { ...s, loaded: true };
  switch (a.type) {
    // Module choices survive switching between sample and own data.
    case 'LOAD_SAMPLE':  return { ...SAMPLE, loaded: true, isSample: true, settings: { ...SAMPLE.settings, modules: s.loaded ? s.settings.modules : SAMPLE.settings.modules } };
    case 'START_EMPTY':  return { ...EMPTY, loaded: true, settings: { ...EMPTY.settings, orgName: s.settings.orgName, modules: a.modules ?? s.settings.modules } };
    case 'CLEAR':        return { ...EMPTY, settings: { ...EMPTY.settings, modules: s.settings.modules } };
    case 'RESTORE':      return migrate({ ...a.state, loaded: true });
    case 'REPLACE':      return migrate(a.state);
    case 'SET_GHG':      return { ...live, ghg: byYear(a.ghg) };
    case 'UPSERT_GHG': {
      const drop = a.replaceYear ?? a.row.year;
      return { ...live, ghg: byYear([...s.ghg.filter((g) => g.year !== drop && g.year !== a.row.year), a.row]) };
    }
    case 'DELETE_GHG':   return { ...live, ghg: s.ghg.filter((g) => g.year !== a.year) };
    case 'SET_SETTINGS': return { ...s, settings: { ...s.settings, ...a.settings } };
    case 'UPSERT_PROJECT':  return { ...live, projects: upsert(s.projects, a.item) };
    case 'DELETE_PROJECT':  return { ...live, projects: s.projects.filter((x) => x.id !== a.id) };
    case 'UPSERT_LEVER':    return { ...live, levers: upsert(s.levers, a.item) };
    case 'DELETE_LEVER':    return { ...live, levers: s.levers.filter((x) => x.id !== a.id) };
    case 'UPSERT_FACTOR': {
      const old = s.factors.find((x) => x.id === a.item.id);
      const item = old?.official && old.kgPerUnit !== a.item.kgPerUnit ? { ...a.item, official: false, source: `${a.item.source} (value edited)` } : a.item;
      return { ...live, factors: upsert(s.factors, item) };
    }
    case 'ADD_FACTORS':     return { ...live, factors: [...s.factors, ...a.items] };
    case 'DELETE_FACTOR':   return { ...live, factors: s.factors.filter((x) => x.id !== a.id), activities: s.activities.filter((x) => x.factorId !== a.id) };
    case 'UPSERT_ACTIVITY': return { ...live, activities: upsert(s.activities, a.item) };
    case 'DELETE_ACTIVITY': return { ...live, activities: s.activities.filter((x) => x.id !== a.id) };
    case 'UPSERT_DOC':      return { ...live, docs: upsert(s.docs, a.item) };
    case 'DELETE_DOC':      return { ...live, docs: s.docs.filter((x) => x.id !== a.id) };
    case 'DOC_EDIT': {
      const now = new Date().toISOString();
      return { ...live, docs: s.docs.map((d) => (d.id !== a.id ? d : { ...d, updatedAt: now, edits: { ...d.edits, [a.key]: a.value } })) };
    }
    case 'UPDATE_DOC_SRC': return { ...live, docs: s.docs.map((d) => (d.id !== a.id ? d : { ...d, src: a.src, updatedAt: new Date().toISOString() })) };
    case 'DOC_META': {
      const now = new Date().toISOString();
      return { ...live, docs: s.docs.map((d) => (d.id !== a.id ? d : { ...d, updatedAt: now, meta: { ...d.meta, [a.credit]: { ...d.meta[a.credit], ...a.patch } } })) };
    }
    default: return s;
  }
};

/* ── Client workspaces ──
   Each client has its own HubState under its own storage key. The first workspace keeps the
   original key ('hub_v1') so data saved before workspaces existed simply becomes "My organisation". */
export interface Client { id: string; name: string; createdAt: string }
const CLIENTS_KEY = 'hub_clients';
const keyFor = (id: string) => (id === 'default' ? 'hub_v1' : `hub_v1:${id}`);
const readJSON = <T,>(k: string): T | null => { try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : null; } catch { return null; } };
const writeJSON = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const loadState = (id: string): HubState => { const r = readJSON<Partial<HubState>>(keyFor(id)); return r ? migrate(r) : EMPTY; };

interface HubCtx {
  hub: HubState; dispatch: React.Dispatch<HubAction>;
  clients: Client[]; client: Client; readOnly: boolean;
  switchClient: (id: string) => void; addClient: (name: string) => void;
  renameClient: (id: string, name: string) => void; deleteClient: (id: string) => void;
}
const Ctx = createContext<HubCtx | null>(null);

/** `fixed` = read-only shared view: the given state, no workspaces, nothing written to storage. */
export const HubProvider: React.FC<{ children: React.ReactNode; fixed?: { state: HubState; clientName: string } }> = ({ children, fixed }) => {
  const [reg, setReg] = useState<{ active: string; list: Client[] }>(() => {
    if (fixed) return { active: 'shared', list: [{ id: 'shared', name: fixed.clientName, createdAt: '' }] };
    const r = readJSON<{ active: string; list: Client[] }>(CLIENTS_KEY);
    if (r?.list?.length) return r.list.some((c) => c.id === r.active) ? r : { ...r, active: r.list[0].id };
    return { active: 'default', list: [{ id: 'default', name: 'My organisation', createdAt: new Date().toISOString() }] };
  });
  const active = useRef(reg.active);
  const [hub, dispatch] = useReducer(reducer, EMPTY, () => (fixed ? migrate({ ...fixed.state, loaded: true }) : loadState(reg.active)));

  useEffect(() => {
    if (fixed) return;
    const key = keyFor(active.current), t = setTimeout(() => writeJSON(key, hub), 250);
    return () => clearTimeout(t);
  }, [hub, fixed]);
  // Flush on tab close so the last keystrokes are never lost.
  const latest = useRef(hub); latest.current = hub;
  useEffect(() => {
    if (fixed) return;
    const f = () => writeJSON(keyFor(active.current), latest.current);
    window.addEventListener('pagehide', f); return () => window.removeEventListener('pagehide', f);
  }, [fixed]);
  useEffect(() => { if (!fixed) writeJSON(CLIENTS_KEY, reg); }, [reg, fixed]);

  const switchClient = useCallback((id: string) => {
    if (fixed || id === active.current) return;
    writeJSON(keyFor(active.current), hub);
    active.current = id;
    setReg((r) => ({ ...r, active: id }));
    dispatch({ type: 'REPLACE', state: loadState(id) });
  }, [hub, fixed]);
  const addClient = useCallback((name: string) => {
    const id = Math.random().toString(36).slice(2, 10);
    setReg((r) => ({ ...r, list: [...r.list, { id, name: name.trim() || 'New client', createdAt: new Date().toISOString() }] }));
    writeJSON(keyFor(active.current), hub);
    active.current = id;
    setReg((r) => ({ ...r, active: id }));
    dispatch({ type: 'REPLACE', state: { ...EMPTY, settings: { ...EMPTY.settings, orgName: name.trim() } } });
  }, [hub]);
  const renameClient = useCallback((id: string, name: string) => setReg((r) => ({ ...r, list: r.list.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)) })), []);
  const deleteClient = useCallback((id: string) => {
    if (reg.list.length <= 1) return;
    try { localStorage.removeItem(keyFor(id)); } catch { /* ignore */ }
    const rest = reg.list.filter((c) => c.id !== id);
    if (id === active.current) { active.current = rest[0].id; dispatch({ type: 'REPLACE', state: loadState(rest[0].id) }); }
    setReg({ active: active.current, list: rest });
  }, [reg]);

  const client = reg.list.find((c) => c.id === reg.active) ?? reg.list[0];
  return <Ctx.Provider value={{ hub, dispatch, clients: reg.list, client, readOnly: !!fixed, switchClient, addClient, renameClient, deleteClient }}>{children}</Ctx.Provider>;
};

export const useHub = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useHub outside HubProvider');
  return c;
};
