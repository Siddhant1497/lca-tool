import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { AppState, AppPage, Project, MaterialEntry, LCAResults, ComplianceResult, BuildingType } from '../types/lca';
import { calculateLCA } from '../utils/lcaCalculator';
import { runAllCompliance } from '../utils/complianceChecker';

type Action =
  | { type: 'SET_PAGE'; page: AppPage }
  | { type: 'SET_PROJECT'; project: Project }
  | { type: 'ADD_ENTRY'; entry: MaterialEntry }
  | { type: 'UPDATE_ENTRY'; entry: MaterialEntry }
  | { type: 'DELETE_ENTRY'; id: string }
  | { type: 'ADD_BASELINE'; entry: MaterialEntry }
  | { type: 'UPDATE_BASELINE'; entry: MaterialEntry }
  | { type: 'DELETE_BASELINE'; id: string }
  | { type: 'SET_HAS_BASELINE'; value: boolean }
  | { type: 'RESET' };

const defaultProject = (): Project => ({
  id: uuid(), name: 'New Building Project', description: '',
  buildingType: 'office' as BuildingType, grossFloorArea: 1000, stories: 5,
  lifespan: 60, location: '', country: 'US',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

const INITIAL: AppState = {
  project: defaultProject(), materialEntries: [], baselineEntries: [],
  hasBaseline: false, activePage: 'dashboard',
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_PAGE':      return { ...state, activePage: action.page };
    case 'SET_PROJECT':   return { ...state, project: action.project };
    case 'ADD_ENTRY':     return { ...state, materialEntries: [...state.materialEntries, action.entry] };
    case 'UPDATE_ENTRY':  return { ...state, materialEntries: state.materialEntries.map((e) => e.id === action.entry.id ? action.entry : e) };
    case 'DELETE_ENTRY':  return { ...state, materialEntries: state.materialEntries.filter((e) => e.id !== action.id) };
    case 'ADD_BASELINE':  return { ...state, baselineEntries: [...state.baselineEntries, action.entry] };
    case 'UPDATE_BASELINE': return { ...state, baselineEntries: state.baselineEntries.map((e) => e.id === action.entry.id ? action.entry : e) };
    case 'DELETE_BASELINE': return { ...state, baselineEntries: state.baselineEntries.filter((e) => e.id !== action.id) };
    case 'SET_HAS_BASELINE': return { ...state, hasBaseline: action.value };
    case 'RESET':         return { ...INITIAL, project: defaultProject() };
    default:              return state;
  }
};

interface LCACtx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  results: LCAResults | null;
  baselineResults: LCAResults | null;
  complianceResults: ComplianceResult[];
}

const Ctx = createContext<LCACtx | null>(null);
const KEY = 'lca_tool_v1';

export const LCAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL, (init) => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) return JSON.parse(s) as AppState;
    } catch { /* ignore */ }
    return init;
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const results = useMemo<LCAResults | null>(() => {
    if (!state.project || state.materialEntries.length === 0) return null;
    return calculateLCA(state.materialEntries, state.project);
  }, [state.materialEntries, state.project]);

  const baselineResults = useMemo<LCAResults | null>(() => {
    if (!state.hasBaseline || !state.project || state.baselineEntries.length === 0) return null;
    return calculateLCA(state.baselineEntries, state.project);
  }, [state.baselineEntries, state.project, state.hasBaseline]);

  const complianceResults = useMemo<ComplianceResult[]>(() => {
    if (!state.project || !results) return [];
    return runAllCompliance(results, baselineResults, state.project, state.materialEntries, state.hasBaseline);
  }, [results, baselineResults, state.project, state.materialEntries, state.hasBaseline]);

  return <Ctx.Provider value={{ state, dispatch, results, baselineResults, complianceResults }}>{children}</Ctx.Provider>;
};

export const useLCA = (): LCACtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLCA outside LCAProvider');
  return ctx;
};
