import type { SharePayload } from './share';
import { metrics, s12, s2, total } from './hub';
import { trajectory, phaseOf } from './strategy';

/** What a live client portal receives. Built from the minimised share payload, so it never carries more than the client file would. */
export interface PortalUpdate {
  kind: 'sustainhub-portal'; v: 1; client: string; title: string; preparedBy: string; note: string; generatedAt: string; isSample: boolean;
  sections: string[];
  kpis?: { year: number; total: number; s1: number; s2: number; s3: number; s2Method: string; baseYear: number; baseS12: number; s12: number;
    s12VsBasePct: number; targetYear: number; targetS12: number; gapS12: number; netZeroYear: number; leverCoveragePct: number };
  trajectory?: { year: number; s12: number | null; s12t: number; s3: number | null; s3t: number }[];
  roadmap?: { id: string; name: string; scope: number; abatement: number; year?: number; status: string; phase: string }[];
  certs?: { id: string; name: string; system: string; target: string; needed: number; secured: number; likely: number; max: number; unit: string; stage: string; next: string }[];
  docs?: SharePayload['docs'];
}

export function buildPortalUpdate(p: SharePayload): PortalUpdate {
  const st = p.state, S = st.settings, has = (k: string) => p.config.sections.includes(k as never);
  const m = metrics(st.ghg, st.levers, S);
  const r = (x: number) => Math.round(x * 10) / 10;
  const out: PortalUpdate = { kind: 'sustainhub-portal', v: 1, client: p.client, title: p.config.title, preparedBy: p.config.preparedBy, note: p.config.note,
    generatedAt: new Date().toISOString(), isSample: st.isSample, sections: p.config.sections };
  if (m && (has('kpis') || has('pathway'))) {
    out.kpis = { year: m.latest.year, total: r(total(m.latest, S.s2Method)), s1: r(m.latest.scope1), s2: r(s2(m.latest, S.s2Method)), s3: r(m.latest.scope3), s2Method: S.s2Method,
      baseYear: m.base.year, baseS12: r(s12(m.base, S.s2Method)), s12: r(s12(m.latest, S.s2Method)), s12VsBasePct: r(m.s12VsBase),
      targetYear: S.targetYear, targetS12: r(m.pathwayTarget), gapS12: r(m.gapTarget), netZeroYear: S.netZeroYear, leverCoveragePct: Math.round(Math.min(m.leverCoverage, 999)) };
  }
  if (st.ghg.length && (has('pathway') || has('strategy'))) out.trajectory = trajectory(st.ghg, S).map((t) => ({ year: t.year, s12: t.s12 == null ? null : r(t.s12), s12t: r(t.s12t), s3: t.s3 == null ? null : r(t.s3), s3t: r(t.s3t) }));
  if (st.levers.length && (has('strategy') || has('levers')) && m) out.roadmap = st.levers.map((l) => ({ id: l.id, name: l.name, scope: l.scope, abatement: l.abatement, year: l.year, status: l.status, phase: l.status === 'Implemented' ? 'Done' : phaseOf(l, m.latest.year) }));
  if (st.projects.length) out.certs = st.projects.map((x) => ({ id: x.id, name: x.name, system: `${x.system} ${x.version}`.trim(), target: x.targetLabel, needed: x.needed, secured: x.secured, likely: x.likely, max: x.max, unit: x.unit, stage: x.stage, next: x.next }));
  if (p.docs?.length) out.docs = p.docs;
  return out;
}
