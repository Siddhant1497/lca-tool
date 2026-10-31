import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { HubState, GhgYear, HubSettings } from '../types/hub';
import { SAMPLE } from '../data/hubSample';

type Action =
  | { type: 'LOAD_SAMPLE' }
  | { type: 'SET_GHG'; ghg: GhgYear[] }
  | { type: 'SET_SETTINGS'; settings: Partial<HubSettings> }
  | { type: 'CLEAR' };

const EMPTY: HubState = {
  loaded: false, isSample: false, ghg: [], projects: [], levers: [],
  settings: { targetYear: 2030, annualPct: 4.2 },
};

const reducer = (s: HubState, a: Action): HubState => {
  switch (a.type) {
    case 'LOAD_SAMPLE':   return { ...SAMPLE, loaded: true, isSample: true };
    case 'SET_GHG':       return { ...s, loaded: true, isSample: false, ghg: a.ghg, projects: s.isSample ? [] : s.projects, levers: s.isSample ? [] : s.levers };
    case 'SET_SETTINGS':  return { ...s, settings: { ...s.settings, ...a.settings } };
    case 'CLEAR':         return EMPTY;
    default:              return s;
  }
};

const KEY = 'hub_v1';
const Ctx = createContext<{ hub: HubState; dispatch: React.Dispatch<Action> } | null>(null);

export const HubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hub, dispatch] = useReducer(reducer, EMPTY, (init) => {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) as HubState; } catch { /* ignore */ }
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
