import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { HubState, GhgYear, HubSettings, CertProject, Lever, EmissionFactor, Activity } from '../types/hub';
import { SAMPLE } from '../data/hubSample';

export type HubAction =
  | { type: 'LOAD_SAMPLE' } | { type: 'START_EMPTY'; modules?: HubSettings['modules'] } | { type: 'CLEAR' }
  | { type: 'RESTORE'; state: HubState }
  | { type: 'SET_GHG'; ghg: GhgYear[] }
  | { type: 'UPSERT_GHG'; row: GhgYear; replaceYear?: number }
  | { type: 'DELETE_GHG'; year: number }
  | { type: 'SET_SETTINGS'; settings: Partial<HubSettings> }
  | { type: 'UPSERT_PROJECT'; item: CertProject } | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'UPSERT_LEVER'; item: Lever } | { type: 'DELETE_LEVER'; id: string }
  | { type: 'UPSERT_FACTOR'; item: EmissionFactor } | { type: 'ADD_FACTORS'; items: EmissionFactor[] } | { type: 'DELETE_FACTOR'; id: string }
  | { type: 'UPSERT_ACTIVITY'; item: Activity } | { type: 'DELETE_ACTIVITY'; id: string };

export const EMPTY: HubState = {
  loaded: false, isSample: false, ghg: [], projects: [], levers: [], factors: [], activities: [],
  settings: { targetYear: 2030, annualPct: 4.2, s2Method: 'location', revenueUnit: '₹ crore', currency: '₹', orgName: '', modules: { certs: true, lca: true }, s3Pct: 2.5, netZeroYear: 2050, nzPct: 90 },
};

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
const byYear = (g: GhgYear[]) => [...g].sort((a, b) => a.year - b.year);

/** Fill fields added in later versions so old saved data keeps working. */
export const migrate = (raw: Partial<HubState>): HubState => ({
  ...EMPTY, ...raw,
  ghg: byYear(raw.ghg ?? []), projects: raw.projects ?? [], levers: raw.levers ?? [],
  factors: raw.factors ?? [], activities: raw.activities ?? [],
  settings: { ...EMPTY.settings, ...(raw.settings ?? {}), modules: { ...EMPTY.settings.modules, ...(raw.settings?.modules ?? {}) } },
});

export const reducer = (s: HubState, a: HubAction): HubState => {
  const live = { ...s, loaded: true };
  switch (a.type) {
    // Module choices survive switching between sample and own data.
    case 'LOAD_SAMPLE':  return { ...SAMPLE, loaded: true, isSample: true, settings: { ...SAMPLE.settings, modules: s.loaded ? s.settings.modules : SAMPLE.settings.modules } };
    case 'START_EMPTY':  return { ...EMPTY, loaded: true, settings: { ...EMPTY.settings, modules: a.modules ?? s.settings.modules } };
    case 'CLEAR':        return { ...EMPTY, settings: { ...EMPTY.settings, modules: s.settings.modules } };
    case 'RESTORE':      return migrate({ ...a.state, loaded: true });
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
    default: return s;
  }
};

const KEY = 'hub_v1';
const Ctx = createContext<{ hub: HubState; dispatch: React.Dispatch<HubAction> } | null>(null);

export const HubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hub, dispatch] = useReducer(reducer, EMPTY, (init) => {
    try { const s = localStorage.getItem(KEY); if (s) return migrate(JSON.parse(s)); } catch { /* ignore */ }
    return init;
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(hub)); } catch { /* ignore */ } }, [hub]);
  return <Ctx.Provider value={{ hub, dispatch }}>{children}</Ctx.Provider>;
};

export const useHub = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useHub outside HubProvider');
  return c;
};
