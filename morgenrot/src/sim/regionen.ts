// Regionale Kennzahlen – abgeleitet aus dem nationalen Zustand und der Zusammensetzung der Regionen.
import { FRAKTION_IDS } from '../data/fraktionen';
import type { RegionDef } from '../data/schema';
import type { FraktionId, RegionTyp, Spielstand } from './types';
import { clamp, land } from './util';

const TYP_GEWICHTE: Record<RegionTyp, Partial<Record<FraktionId, number>>> = {
  metropole: { klima: 1.5, feministisch: 1.6, minderheiten: 1.8, tech: 2, wissenschaft: 1.7, kapital: 1.5, land: 0.2, religion: 0.7 },
  industrie: { arbeiter: 1.7, kapital: 1.3, land: 0.4, minderheiten: 1.2 },
  agrar: { land: 3, religion: 1.4, mittelstand: 1.1, arbeiter: 0.7, klima: 0.6, minderheiten: 0.5, wissenschaft: 0.5 },
  kueste: { arbeiter: 1.2, land: 1.2, mittelstand: 1.2, klima: 1.1 },
  wald: { land: 2, klima: 1.4, religion: 1.2, arbeiter: 0.8 },
  berge: { land: 1.8, religion: 1.5, mittelstand: 1.3, arbeiter: 0.7 },
  bergbau: { arbeiter: 2.2, land: 1, religion: 1.1, klima: 0.5 },
};

const VERSCHMUTZUNG_FAKTOR: Record<RegionTyp, number> = {
  metropole: 1.2, industrie: 1.5, agrar: 0.8, kueste: 0.9, wald: 0.5, berge: 0.5, bergbau: 1.6,
};

const SAUBER_PROJEKTE: Record<string, number> = {
  renaturierung: 8, kreislauf: 8, stadtbahn: 6, gruener_stahl: 10, solarpark: 3, windpark: 3, windpark_offshore: 3, agraroeko_zentrum: 5,
};

export const REGION_TYP_NAMEN: Record<RegionTyp, string> = {
  metropole: 'Metropole',
  industrie: 'Industrieregion',
  agrar: 'Agrarland',
  kueste: 'Küste',
  wald: 'Waldland',
  berge: 'Bergland',
  bergbau: 'Bergbauregion',
};

export interface RegionsWerte {
  region: RegionDef;
  zustimmung: number;
  verschmutzung: number;
  unruhe: number;
  projekte: number;
}

export function regionsWerte(s: Spielstand): RegionsWerte[] {
  return land(s).regionen.map((r) => {
    const g = TYP_GEWICHTE[r.typ];
    let summe = 0;
    let gewicht = 0;
    for (const f of FRAKTION_IDS) {
      const fr = s.fraktionen[f];
      const w = fr.anteil * (g[f] ?? 1);
      summe += w * fr.loyalitaet;
      gewicht += w;
    }
    const zustimmung = gewicht ? summe / gewicht : 50;
    const sauber = s.fertig.filter((p) => p.region === r.id).reduce((a, p) => a + (SAUBER_PROJEKTE[p.id] ?? 0), 0);
    const verschmutzung = clamp(s.werte.verschmutzung * VERSCHMUTZUNG_FAKTOR[r.typ] - sauber, 0, 100);
    const unruhe = clamp(s.werte.unruhe * (1 + (50 - zustimmung) / 80), 0, 100);
    const projekte = s.fertig.filter((p) => p.region === r.id).length;
    return { region: r, zustimmung, verschmutzung, unruhe, projekte };
  });
}
