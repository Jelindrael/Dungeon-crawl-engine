import { describe, expect, it } from 'vitest';
import { CODEX_MAP } from '../src/data/codex';
import { EREIGNISSE } from '../src/data/ereignisse';
import { FRAKTION_IDS } from '../src/data/fraktionen';
import { LAENDER } from '../src/data/laender';
import { MERKMALE, TECHNOLOGIEN } from '../src/data/merkmale';
import { POLITIK } from '../src/data/politik';
import { PROJEKTE } from '../src/data/projekte';
import { SYSTEME } from '../src/data/systeme';
import { WERTE } from '../src/data/werte';
import { neuesSpiel, rundeBeenden } from '../src/sim/engine';

describe('Datenintegrität', () => {
  it('alle Codex-Verweise existieren', () => {
    const verweise = new Set<string>();
    for (const e of EREIGNISSE) {
      if (e.codex) verweise.add(e.codex);
      for (const o of e.optionen) if (o.codex) verweise.add(o.codex);
    }
    for (const p of POLITIK) for (const s of p.stufen) if (s.codex) verweise.add(s.codex);
    for (const s of Object.values(SYSTEME)) if (s.codex) verweise.add(s.codex);
    for (const p of PROJEKTE) if (p.codex) verweise.add(p.codex);
    for (const t of TECHNOLOGIEN) if (t.codex) verweise.add(t.codex);
    const fehlend = [...verweise].filter((v) => !CODEX_MAP[v]);
    expect(fehlend).toEqual([]);
  });

  it('Ereignis-IDs sind eindeutig und haben Optionen', () => {
    const ids = EREIGNISSE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EREIGNISSE) expect(e.optionen.length).toBeGreaterThan(0);
  });

  it('Effekte verweisen nur auf existierende Werte und Fraktionen', () => {
    const pruefe = (eff: Record<string, unknown> | undefined, wo: string) => {
      if (!eff) return;
      for (const key of ['ziele', 'delta'] as const) {
        const m = eff[key] as Record<string, number> | undefined;
        if (m) for (const k of Object.keys(m)) expect(WERTE[k as keyof typeof WERTE], `${wo}: Wert ${k}`).toBeDefined();
      }
      for (const key of ['fraktionen', 'macht'] as const) {
        const m = eff[key] as Record<string, number> | undefined;
        if (m) for (const k of Object.keys(m)) expect(FRAKTION_IDS.includes(k as never), `${wo}: Fraktion ${k}`).toBe(true);
      }
    };
    for (const e of EREIGNISSE) for (const o of e.optionen) {
      pruefe(o.effekte as never, e.id);
      pruefe(o.modifikator?.effekte as never, e.id);
    }
    for (const p of POLITIK) for (const s of p.stufen) {
      pruefe(s.effekte as never, p.id);
      pruefe(s.wechsel as never, p.id);
    }
    for (const p of PROJEKTE) pruefe(p.effekte as never, p.id);
  });

  it('Länder sind vollständig definiert', () => {
    for (const l of LAENDER) {
      for (const p of POLITIK) {
        const st = l.politik[p.id];
        expect(st, `${l.id}.${p.id}`).toBeDefined();
        expect(st).toBeLessThan(p.stufen.length);
      }
      for (const m of l.merkmale) expect(MERKMALE[m], `${l.id}: Merkmal ${m}`).toBeDefined();
      expect(l.regionen.length).toBeGreaterThanOrEqual(5);
      for (const f of FRAKTION_IDS) expect(l.fraktionen[f]).toBeDefined();
    }
  });

  it('Spielstart ist ein Gleichgewicht (ohne Ereignisse kaum Drift)', () => {
    for (const l of LAENDER) {
      const s = neuesSpiel(l.id, 'normal', 42);
      s.ereignisse = [];
      s.modifikatoren = [];
      const vorher = { ...s.werte };
      rundeBeenden(s);
      for (const id of ['gesundheit', 'bildung', 'wohnen', 'faschismus', 'legitimitaet', 'ungleichheit', 'erneuerbar'] as const) {
        expect(Math.abs(s.werte[id] - vorher[id]), `${l.id}.${id}`).toBeLessThan(1.5);
      }
    }
  });
});
