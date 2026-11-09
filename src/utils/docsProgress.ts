import type { DocSet } from '../types/hub';
import { creditCounts, isTargeted, DOC_DONE, DOC_STATUSES, type NData, type DocStatus } from './narrative';

export interface DocCreditRow { id: string; name: string; pts: string; section: string; status: DocStatus; due?: string; owner?: string; done: number; fills: number; miss: number }
export interface DocSummary {
  id: string; name: string; system: string; project: string; updatedAt: string;
  totals: { pts?: string; level?: string; mand?: string; stage?: string };
  credits: DocCreditRow[]; byStatus: Record<DocStatus, number>; pctReady: number; pctFacts: number;
}

/** Credit-level progress for a documentation set (targeted credits only). Contains no narrative text. */
export function summarise(d: DocSet, DATA: NData): DocSummary | null {
  const R = DATA[d.rating]; if (!R) return null;
  const credits: DocCreditRow[] = [];
  for (const sec of R.sections) for (const c of sec.credits) {
    if (c.id === 'Project' || !isTargeted(c, d.src)) continue;
    const n = creditCounts(c, d.src, d.edits); const m = d.meta[c.id] ?? {};
    credits.push({ id: c.id, name: c.name, pts: c.pts, section: sec.title, status: m.status ?? 'Not started', due: m.due || undefined, owner: m.owner || undefined, ...n });
  }
  const byStatus = Object.fromEntries(DOC_STATUSES.map((s) => [s, 0])) as Record<DocStatus, number>;
  credits.forEach((c) => byStatus[c.status]++);
  const fills = credits.reduce((a, c) => a + c.fills, 0), done = credits.reduce((a, c) => a + c.done, 0);
  const str = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : String(v));
  return {
    id: d.id, name: d.name, system: R.title, project: d.src.project, updatedAt: d.updatedAt,
    totals: { pts: str(d.src.totals.pts), level: str(d.src.totals.level), mand: str(d.src.totals.mand), stage: str(d.src.totals.stage) },
    credits, byStatus,
    pctReady: credits.length ? Math.round((credits.filter((c) => DOC_DONE.includes(c.status)).length / credits.length) * 100) : 0,
    pctFacts: fills ? Math.round((done / fills) * 100) : 100,
  };
}

/** All narrative template sets: IGBC (from the IGBC Narrative Builder, workbook-filled) plus LEED and GRIHA (project facts). */
export const loadNarratives = async (): Promise<NData> => {
  const [igbc, leed, griha] = await Promise.all([import('../data/narratives/igbc.json'), import('../data/narratives/leed'), import('../data/narratives/griha')]);
  const I = igbc.default as unknown as NData;
  for (const k of Object.keys(I)) I[k].family ??= 'IGBC';
  return { ...I, leed41bdc: leed.LEED_V41_BDC, griha2019: griha.GRIHA_V2019 };
};
