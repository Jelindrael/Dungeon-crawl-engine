import { LAND_MAP } from '../data/laender';
import { MERKMALE } from '../data/merkmale';
import type { LandDef, MerkmalDef } from '../data/schema';
import type { Spielstand, WertId } from './types';

export const START_JAHR = 2026;
export const END_RUNDE = 148; // Frühjahr 2100

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

export const jahr = (runde: number) => START_JAHR + Math.floor(runde / 2);
export const halbjahr = (runde: number) => (runde % 2 === 0 ? 'Frühjahr' : 'Herbst');
export const datum = (runde: number) => `${halbjahr(runde)} ${jahr(runde)}`;

export const land = (s: Spielstand): LandDef => LAND_MAP[s.land];

export const merkmale = (s: Spielstand): MerkmalDef[] => land(s).merkmale.map((m) => MERKMALE[m]).filter(Boolean);

export const hatMerkmal = (s: Spielstand, id: string) => land(s).merkmale.includes(id);

type ModKey = 'putsch' | 'reformKosten' | 'kulturWiderstand' | 'autoritaerStrafe' | 'kapitalflucht' | 'sanktionen' | 'klimaSchaden' | 'strukturwandel' | 'migrationNutzen' | 'rohstoffe';

/** Multipliziert alle Merkmals-Modifikatoren eines Typs (Standard 1). */
export function mod(s: Spielstand, key: ModKey): number {
  let f = 1;
  for (const m of merkmale(s)) {
    const v = m.mods?.[key];
    if (typeof v === 'number') f *= key === 'rohstoffe' ? 1 + v * 0.6 : v;
  }
  return f;
}

export function rateMod(s: Spielstand, wert: WertId): number {
  let f = 1;
  for (const m of merkmale(s)) {
    const v = m.mods?.raten?.[wert];
    if (typeof v === 'number') f *= v;
  }
  return f;
}

export function dialKostenMod(s: Spielstand, dial: string): number {
  let f = 1;
  for (const m of merkmale(s)) {
    const v = m.mods?.dialKosten?.[dial];
    if (typeof v === 'number') f *= v;
  }
  return f;
}

export const fossil = (s: Spielstand) => Math.max(0, 100 - s.werte.erneuerbar - s.werte.kernkraft);

export const anzahlFertig = (s: Spielstand, id: string) => s.fertig.filter((p) => p.id === id).length;

export const schwierigkeitsFaktor = (s: Spielstand) =>
  s.schwierigkeit === 'leicht' ? 0.65 : s.schwierigkeit === 'schwer' ? 1.35 : 1;

export function formatZahl(v: number, dez = 0): string {
  return v.toLocaleString('de-DE', { minimumFractionDigits: dez, maximumFractionDigits: dez });
}
