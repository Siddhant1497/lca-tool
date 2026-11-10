import type { HubState } from '../types/hub';
import type { ShareConfig, SectionKey } from '../context/ShareContext';
import type { DocSummary } from './docsProgress';

export interface SharePayload { v: 1; client: string; config: ShareConfig; state: HubState; docs?: DocSummary[] }

/**
 * Data minimisation for client sharing: the payload carries only what the chosen sections need.
 * Anything left out here is not in the file at all (not merely hidden).
 */
export function buildPayload(hub: HubState, client: string, config: ShareConfig, docSummaries: DocSummary[] = []): SharePayload {
  const has = (...k: SectionKey[]) => k.some((x) => config.sections.includes(x));
  const emissions = has('kpis', 'pathway', 'split', 'inventory', 'scope3', 'intensity', 'levers', 'strategy', 'disclosures');
  const keepDenom = has('intensity', 'disclosures');
  const keepCats = has('scope3', 'strategy', 'disclosures');
  const state: HubState = {
    loaded: true, isSample: hub.isSample,
    ghg: emissions ? hub.ghg.map((g) => ({ year: g.year, scope1: g.scope1, scope2: g.scope2, scope2m: g.scope2m ?? null, scope3: g.scope3,
      ...(keepCats && g.s3cats ? { s3cats: g.s3cats } : {}), ...(keepDenom && g.denom ? { denom: g.denom } : {}) })) : [],
    levers: has('levers', 'strategy', 'pathway', 'kpis') ? hub.levers : [],
    projects: has('certs') ? hub.projects.filter((p) => config.projectIds.includes(p.id)) : [],
    factors: [], activities: [], docs: [], cba: undefined,   // activity data, factor libraries and narrative text never leave the consultant's workspace
    settings: { ...hub.settings, orgName: hub.settings.orgName || client, modules: { certs: has('certs') && config.projectIds.length > 0, lca: false } },
  };
  const docs = has('docs') ? docSummaries.filter((d) => (config.docIds ?? []).includes(d.id)) : [];
  return { v: 1, client, config, state, ...(docs.length ? { docs } : {}) };
}

const MARK = '<script id="share-data" type="application/json">null</script>';
/** Inject the payload into the single-file viewer template. `<` is escaped so data can never close the script tag. */
export function fillTemplate(template: string, p: SharePayload) {
  if (!template.includes(MARK)) throw new Error('Client view template is missing or outdated. Rebuild the app (npm run build).');
  const json = JSON.stringify(p).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const title = `${p.config.title || 'Sustainability dashboard'} – ${p.client}`.replace(/[<>&"]/g, '');
  return template.replace(MARK, `<script id="share-data" type="application/json">${json}</script>`).replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
}
export const readPayload = (): SharePayload | null => {
  try { const el = document.getElementById('share-data'); const v = el ? JSON.parse(el.textContent || 'null') : null; return v && v.v === 1 ? v : null; } catch { return null; }
};
