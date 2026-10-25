// Sammelt alle dauerhaften Beiträge (Politik, System, Technologie, Projekte, Modifikatoren)
// und berechnet daraus Zielwerte. Zielwerte = Kalibrierungs-Offset + Beiträge + Dynamik + Trend.
import { BLOCK_IDS, FRAKTION_IDS, FRAKTIONEN } from '../data/fraktionen';
import { POLITIK } from '../data/politik';
import { PROJEKT_MAP } from '../data/projekte';
import { SYSTEME } from '../data/systeme';
import { TECH_MAP } from '../data/merkmale';
import { ZIEL_WERTE } from '../data/werte';
import type { Effekte } from './types';
import type { BlockId, FraktionId, Spielstand, WertId } from './types';
import { clamp, fossil, jahr, land, merkmale, mod } from './util';

export interface Beitraege {
  ziele: Partial<Record<WertId, number>>;
  wachstum: number;
  haushalt: number;
  fraktionen: Record<FraktionId, number>;
  beziehungen: Record<BlockId, number>;
  macht: Record<FraktionId, number>;
}

const leer = (): Beitraege => ({
  ziele: {},
  wachstum: 0,
  haushalt: 0,
  fraktionen: Object.fromEntries(FRAKTION_IDS.map((f) => [f, 0])) as Record<FraktionId, number>,
  beziehungen: Object.fromEntries(BLOCK_IDS.map((b) => [b, 0])) as Record<BlockId, number>,
  macht: Object.fromEntries(FRAKTION_IDS.map((f) => [f, 0])) as Record<FraktionId, number>,
});

function addiere(b: Beitraege, e: Effekte | undefined, faktor = 1, mitFraktionen = true) {
  if (!e) return;
  if (e.ziele) for (const [k, v] of Object.entries(e.ziele)) b.ziele[k as WertId] = (b.ziele[k as WertId] ?? 0) + v * faktor;
  if (e.wachstum) b.wachstum += e.wachstum * faktor;
  if (e.haushalt) b.haushalt += e.haushalt * faktor;
  if (mitFraktionen && e.fraktionen)
    for (const [k, v] of Object.entries(e.fraktionen)) b.fraktionen[k as FraktionId] += v * faktor;
  if (e.beziehungen) for (const [k, v] of Object.entries(e.beziehungen)) b.beziehungen[k as BlockId] += v * faktor;
  if (e.macht) for (const [k, v] of Object.entries(e.macht)) b.macht[k as FraktionId] += v * faktor;
}

/** Faktor für die KI-Stellschraube: Ihre Wirkung wächst mit dem technischen Fortschritt. */
export function kiFaktor(s: Spielstand): number {
  if (s.technologien.includes('allgemeine_ki')) return 2;
  if (s.technologien.includes('automatisierung')) return 1.4;
  if (s.technologien.includes('fortgeschrittene_ki')) return 1;
  return 0.35;
}

/** Fraktionshaltungen gegenüber einer Politikstufe, inkl. kulturellem Widerstand. */
export function stufenHaltung(s: Spielstand, dialId: string, stufe: number): Partial<Record<FraktionId, number>> {
  const dial = POLITIK.find((p) => p.id === dialId);
  const st = dial?.stufen[stufe];
  if (!st?.effekte.fraktionen) return {};
  const kw = mod(s, 'kulturWiderstand');
  const res: Partial<Record<FraktionId, number>> = {};
  for (const [f, v] of Object.entries(st.effekte.fraktionen)) {
    let wert = v;
    if (f === 'religion' && dial!.sektor === 'gesellschaft') wert = v * kw;
    if (dialId === 'ki') wert *= Math.min(1.5, kiFaktor(s));
    res[f as FraktionId] = wert;
  }
  return res;
}

export function sammleBeitraege(s: Spielstand): Beitraege {
  const b = leer();
  const haltungsPolitik = s.phase === 'regierung' ? s.politik : s.programm;

  for (const dial of POLITIK) {
    const stufe = s.politik[dial.id] ?? 0;
    const st = dial.stufen[stufe];
    if (!st) continue;
    const faktor = dial.id === 'ki' ? kiFaktor(s) : 1;
    addiere(b, st.effekte, faktor, false);
    // Haltungen der Fraktionen (in der Opposition: gegenüber deinem Programm)
    const h = stufenHaltung(s, dial.id, haltungsPolitik[dial.id] ?? stufe);
    for (const [f, v] of Object.entries(h)) b.fraktionen[f as FraktionId] += v;
  }

  const sys = SYSTEME[s.system];
  if (s.phase === 'regierung') addiere(b, sys.effekte);
  else addiere(b, { ...sys.effekte, fraktionen: undefined });

  // Technologien wirken dauerhaft auf Zielwerte; ihr Wachstumsschub ist ein zeitlich begrenzter Modifikator
  for (const t of s.technologien) {
    const e = TECH_MAP[t]?.effekte;
    if (e) addiere(b, { ...e, wachstum: undefined });
  }
  for (const p of s.fertig) addiere(b, PROJEKT_MAP[p.id]?.effekte);
  for (const m of s.modifikatoren) addiere(b, m.effekte);
  for (const m of merkmale(s)) addiere(b, { macht: m.effekte.macht });

  for (const [k, v] of Object.entries(s.bonus)) b.ziele[k as WertId] = (b.ziele[k as WertId] ?? 0) + (v ?? 0);
  for (const [k, v] of Object.entries(s.machtBonus)) b.macht[k as FraktionId] += v ?? 0;

  // Laufende Projekte kosten Geld
  for (const p of s.projekte) b.haushalt += PROJEKT_MAP[p.id]?.kosten ?? 0;

  return b;
}

/** Dynamische Zusammenhänge zwischen den Werten. Werden bei der Kalibrierung mit erfasst. */
export function dynamik(s: Spielstand): Partial<Record<WertId, number>> {
  const w = s.werte;
  const bipRel = Math.log(w.bip / s.basis.bip);
  const fos = fossil(s);
  const integrationsLuecke = Math.max(0, w.zuwanderung) * (1 - w.integration / 110);
  const offenheit = [0.25, 0.55, 1, 1.4][s.politik.migration ?? 1];
  const weltFlucht = Math.max(0, w.temperatur - 1.3) * 3.2;

  return {
    gesundheit: bipRel * 4 - w.verschmutzung * 0.12,
    bildung: bipRel * 3,
    wohnen: -integrationsLuecke * 0.8 - w.ungleichheit * 0.15 + bipRel * 1.5,
    ungleichheit: -w.gemeineigentum * 0.08 - w.betriebsdemokratie * 0.04 + w.informell * 0.05 + w.techmacht * 0.04,
    informell: w.arbeitslosigkeit * 0.25,
    verschmutzung: fos * 0.3 + bipRel * 6 - w.effizienz * 0.3,
    natur: -w.verschmutzung * 0.12 - Math.max(0, w.temperatur - 1.3) * 5,
    kapitalflucht: (Math.max(0, -s.beziehungen.maerkte) * 0.15 + w.unruhe * 0.1 + w.sanktionen * 0.1) * mod(s, 'kapitalflucht') - w.gemeineigentum * 0.25,
    arbeitslosigkeit: w.kapitalflucht * 0.04 + w.sanktionen * 0.03,
    inflation: w.defizit * 0.25 + w.sanktionen * 0.05 + w.kapitalflucht * 0.03,
    frauenrechte: w.bildung * 0.08 - w.faschismus * 0.1,
    minderheitenrechte: w.bildung * 0.06 - w.faschismus * 0.12,
    pressefreiheit: -w.techmacht * 0.08 - w.faschismus * 0.05,
    buergerrechte: -w.ueberwachung * 0.15,
    integration: -w.faschismus * 0.15 + w.bildung * 0.05,
    zuwanderung: weltFlucht * offenheit + (w.lebensqualitaet - 50) * 0.06 - (100 - w.buergerrechte) * 0.03,
    bewusstsein:
      w.partizipation * 0.1 + w.betriebsdemokratie * 0.06 + w.lebensqualitaet * 0.08 + w.weltbewegung * 0.1 - w.techmacht * 0.06 + w.unruhe * 0.04,
    unruhe:
      Math.max(0, 50 - w.zustimmung) * 0.5 +
      Math.max(0, w.inflation - 3) * 1.2 +
      w.arbeitslosigkeit * 0.35 +
      w.faschismus * 0.15 +
      Math.max(0, 50 - w.legitimitaet) * 0.3 -
      w.partizipation * 0.05,
    faschismus:
      w.arbeitslosigkeit * 0.5 +
      Math.max(0, w.inflation - 3) * 0.6 +
      w.ungleichheit * 0.12 +
      integrationsLuecke * 0.6 +
      w.techmacht * 0.08 +
      w.unruhe * 0.08 -
      w.bewusstsein * 0.25 -
      w.lebensqualitaet * 0.15,
    legitimitaet:
      w.zustimmung * 0.25 + w.partizipation * 0.1 - w.korruption * 0.2 - w.unruhe * 0.1 + w.pressefreiheit * 0.05 + w.lebensqualitaet * 0.1,
    partizipation: w.bewusstsein * 0.1 + (40 - w.arbeitszeit) * 0.3,
    ueberwachung: w.techmacht * 0.1,
    korruption: w.buerokratie * 0.08 - w.pressefreiheit * 0.1 - w.partizipation * 0.05,
    militaermacht: w.unruhe * 0.08,
    steuerquote: w.gemeineigentum * 0.06 * mod(s, 'rohstoffe') - w.informell * 0.08 - w.kapitalflucht * 0.03,
    sanktionen:
      (Math.max(0, -s.beziehungen.westen - 20) * 0.5 + Math.max(0, -s.beziehungen.maerkte - 30) * 0.3) * mod(s, 'sanktionen'),
    weltklima: w.weltbewegung * 0.15 + vorbild(s),
    weltbewegung: (w.lebensqualitaet - s.basis.lebensqualitaet) * 0.25 * gewichtLand(s) + w.bewusstsein * 0.05,
  };
}

/** Wie stark dein Land weltweit als Beispiel wahrgenommen wird. */
export function gewichtLand(s: Spielstand) {
  const pop = land(s).bevoelkerung;
  return clamp(0.5 + Math.log10(pop) * 0.25, 0.5, 1.4);
}

/** Dein Klimaschutz als Vorbild für andere Länder. */
export function vorbild(s: Spielstand) {
  const rel = (s.basis.co2 - s.werte.co2) / Math.max(1, s.basis.co2);
  return clamp(rel * 14, -6, 10) * gewichtLand(s);
}

/** Zeittrends – nicht kalibriert, weil sie beim Start 0 sind. */
export function trend(s: Spielstand): Partial<Record<WertId, number>> {
  const t = jahr(s.runde) - 2026;
  const plattform = [1.2, 0.8, 0.3, 0][s.politik.plattformen ?? 1];
  return {
    techmacht: Math.min(25, t * 0.5) * plattform,
    weltklima: Math.max(0, s.werte.temperatur - 1.45) * 10 + Math.min(8, t * 0.12),
    faschismus: Math.max(0, s.werte.temperatur - 1.6) * 4, // Klimakrise befeuert Angst
    anpassung: -Math.max(0, s.werte.temperatur - 1.45) * 6, // Mehr Anpassung nötig
  };
}

const SAETTIGUNG_OBEN: WertId[] = [
  'gesundheit', 'bildung', 'wohnen', 'frauenrechte', 'minderheitenrechte', 'pressefreiheit', 'buergerrechte',
  'integration', 'bewusstsein', 'legitimitaet', 'partizipation', 'natur', 'anpassung', 'betriebsdemokratie',
];
const SAETTIGUNG_UNTEN: WertId[] = ['korruption', 'verschmutzung', 'ueberwachung', 'buerokratie', 'kapitalflucht', 'techmacht'];

export function zielwerte(s: Spielstand, b: Beitraege = sammleBeitraege(s)): Partial<Record<WertId, number>> {
  const dyn = dynamik(s);
  const tr = trend(s);
  const z: Partial<Record<WertId, number>> = {};
  for (const id of ZIEL_WERTE) {
    z[id] = (s.offsets[id] ?? 0) + (b.ziele[id] ?? 0) + (dyn[id] ?? 0) + (tr[id] ?? 0);
  }
  // Sättigung: Die letzten Prozentpunkte sind die schwersten
  for (const id of SAETTIGUNG_OBEN) {
    const v = z[id];
    if (v !== undefined && v > 80) z[id] = 80 + (v - 80) * 0.35;
  }
  for (const id of ['bewusstsein', 'legitimitaet'] as WertId[]) {
    const v = z[id];
    if (v !== undefined && v > 65) z[id] = 65 + (v - 65) * 0.4;
  }
  for (const id of SAETTIGUNG_UNTEN) {
    const v = z[id];
    if (v !== undefined && v < 8) z[id] = 8 - (8 - v) * 0.4;
  }
  if ((z.faschismus ?? 0) < 12) z.faschismus = Math.max(3, 12 - (12 - (z.faschismus ?? 0)) * 0.35);
  if ((z.ungleichheit ?? 0) < 25) z.ungleichheit = Math.max(18, 25 - (25 - (z.ungleichheit ?? 0)) * 0.4);
  z.unruhe = Math.max(3, z.unruhe ?? 0);
  // Jobgarantie: Arbeitslosigkeit sinkt stark Richtung Sockel
  if ((s.politik.jobgarantie ?? 0) >= 2 && s.phase === 'regierung') z.arbeitslosigkeit = Math.max(2, (z.arbeitslosigkeit ?? 0) * 0.55);
  // Kernkraft folgt eigener Logik
  const kk = s.politik.kernkraft ?? 1;
  const kkStart = s.basis.werte.kernkraft;
  const neueReaktoren = s.fertig.filter((p) => p.id === 'kernkraftwerk').length * 6;
  z.kernkraft = (kk === 0 ? 0 : kk === 1 ? kkStart : kkStart + 4) + neueReaktoren;
  z.erneuerbar = clamp(z.erneuerbar ?? 0, 0, 100 - (z.kernkraft ?? 0));
  return z;
}

/** Politische Haltungen wirken gesättigt: Gute Politik hilft, aber materielle Lage zählt mehr. */
export const haltung = (x: number) => 24 * Math.tanh(x / 24);

/** Loyalitäts-Zielwerte der Fraktionen. */
export function fraktionsZiele(s: Spielstand, b: Beitraege): Record<FraktionId, number> {
  const res = {} as Record<FraktionId, number>;
  const verschleiss = Math.min(12, s.amtszeit * 0.15);
  for (const f of FRAKTION_IDS) {
    let a = anliegenWert(s, f);
    if (s.phase !== 'regierung') {
      // In der Opposition wächst die Unterstützung, wenn es dem Land schlechter geht
      a = (s.anliegenBasis[f] ?? a) - (a - (s.anliegenBasis[f] ?? a)) * 0.6;
    } else {
      // Gewöhnung: Verbesserungen wirken zuerst voll, dann nur noch zu einem Drittel
      const a0 = s.anliegenStart[f] ?? a;
      const ref = s.anliegenRef[f] ?? a;
      const gewohnt = ref - a0;
      a = a0 + (a - ref) + gewohnt * (gewohnt > 0 ? 0.35 : 0.7) - verschleiss;
    }
    res[f] = (s.fraktionOffsets[f] ?? 0) + haltung(b.fraktionen[f]) + a;
  }
  return res;
}

export function anliegenWert(s: Spielstand, f: FraktionId): number {
  let a = 0;
  for (const [k, gew] of Object.entries(FRAKTIONEN[f].anliegen)) a += (s.werte[k as WertId] ?? 0) * (gew ?? 0);
  return a;
}

export function beziehungsZiele(s: Spielstand, b: Beitraege): Record<BlockId, number> {
  const w = s.werte;
  const dyn: Record<BlockId, number> = {
    westen: -w.gemeineigentum * 0.25 + w.pressefreiheit * 0.15 + w.buergerrechte * 0.1,
    china: w.gemeineigentum * 0.05,
    sueden: w.weltbewegung * 0.2,
    maerkte: -Math.max(0, w.schulden - 60) * 0.25 - w.defizit * 1.5 - w.kapitalflucht * 0.2 + w.wachstum * 2 - w.gemeineigentum * 0.2,
  };
  const res = {} as Record<BlockId, number>;
  for (const id of BLOCK_IDS) res[id] = (s.beziehungOffsets[id] ?? 0) + b.beziehungen[id] + dyn[id];
  return res;
}

/** Aktuelle Macht der Fraktionen (Grundmacht + dynamische Faktoren). */
export function fraktionsMacht(s: Spielstand, b: Beitraege): Record<FraktionId, number> {
  const w = s.werte;
  const l = land(s);
  const res = {} as Record<FraktionId, number>;
  for (const f of FRAKTION_IDS) {
    let m = l.fraktionen[f].macht + b.macht[f];
    if (f === 'kapital') m *= 1 - w.gemeineigentum / 140;
    if (f === 'tech') m *= 0.35 + w.techmacht / 75;
    if (f === 'militaer') m *= 0.45 + w.militaermacht / 70;
    if (f === 'arbeiter') m *= 0.75 + w.betriebsdemokratie / 160 + w.bewusstsein / 200;
    if (f === 'partei' && (s.system === 'staatssozialismus' || s.system === 'autoritaer')) m *= 1.4;
    if (f === 'klima') m *= 1 + Math.max(0, w.temperatur - 1.45) * 0.6;
    res[f] = clamp(m, 3, 100);
  }
  return res;
}
