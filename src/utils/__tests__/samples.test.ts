import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readIgbcWorkbook, type NData } from '../narrative';
import DATA_RAW from '../../data/narratives/igbc.json';
const DATA = DATA_RAW as unknown as NData;

// Workbooks written by openpyxl (scripts/make_sample_workbooks.py), i.e. a real Excel writer, not our own code.
describe('sample IGBC workbooks import exactly like the IGBC Narrative Builder expects', () => {
  for (const key of Object.keys(DATA)) {
    it(`${DATA[key].title}`, () => {
      const buf = new Uint8Array(readFileSync(`docs/samples/IGBC_${key}_SAMPLE.xlsx`));
      const src = readIgbcWorkbook(buf, DATA);
      const S = DATA[key].sample;
      expect(src.rating).toBe(key);
      expect(src.project).toBe(S.project);
      expect(src.uncached).toBe(false);
      const mismatches = Object.entries(S.values).filter(([k, v]) => String(v ?? '').replace(/,/g, '') !== String(src.values[k] ?? '').replace(/,/g, '')).map(([k, v]) => `${k}: expected "${v}" got "${src.values[k]}"`);
      expect(mismatches).toEqual([]);   // compared without commas: the builder shows Indian grouping (50,00,000) live
      const tg = Object.fromEntries(Object.entries(S.targets).filter(([, v]) => v != null));
      expect(src.targets).toEqual(tg);
      expect(String(src.totals.level)).toBe(String(S.totals.level));
    });
  }
});
