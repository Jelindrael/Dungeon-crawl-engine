import { SYSTEME } from '../data/systeme';
import { WERTE } from '../data/werte';
import type { Spielstand, WertId } from '../sim/types';

export function zahl(v: number, dez = 0): string {
  return v.toLocaleString('de-DE', { minimumFractionDigits: dez, maximumFractionDigits: dez });
}

export function wertText(id: WertId, v: number, mitEinheit = true): string {
  const m = WERTE[id];
  const e = mitEinheit && m.einheit ? ` ${m.einheit}` : '';
  return `${zahl(v, m.dez)}${e}`;
}

export function delta(v: number, dez = 1): string {
  const s = zahl(Math.abs(v), dez);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : '±0';
}

/** In autoritären Systemen sind die gemeldeten Zahlen geschönt und ungenau. */
export function anzeige(s: Spielstand, id: WertId): { wert: number; unsicher: boolean } {
  const info = s.phase === 'regierung' ? SYSTEME[s.system].infoQualitaet : 1;
  const echt = s.werte[id];
  const m = WERTE[id];
  if (info >= 0.99 || m.gut === 0) return { wert: echt, unsicher: false };
  const spanne = m.max - m.min > 50 ? 25 : 3;
  const schoen = (1 - info) * spanne * m.gut;
  const wert = Math.max(m.min, Math.min(m.max, echt + schoen));
  return { wert, unsicher: true };
}

/** Ist eine Veränderung gut, schlecht oder neutral? */
export function bewertung(id: WertId, d: number): 'gut' | 'schlecht' | 'neutral' {
  const g = WERTE[id].gut;
  if (!g || Math.abs(d) < 1e-6) return 'neutral';
  return d * g > 0 ? 'gut' : 'schlecht';
}

export function prozentFarbe(v: number, gutHoch = true): string {
  const t = Math.max(0, Math.min(1, v / 100));
  const g = gutHoch ? t : 1 - t;
  if (g > 0.66) return 'var(--gut)';
  if (g > 0.4) return 'var(--warn)';
  return 'var(--schlecht)';
}
