import type { Spielstand } from './types';

/** Mulberry32 – kleiner, deterministischer Zufallsgenerator. Der Zustand liegt im Spielstand,
 *  sodass Spielstände reproduzierbar bleiben. */
export function zufall(s: Spielstand): () => number {
  return () => {
    s.rng = (s.rng + 0x6d2b79f5) | 0;
    let t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gewichteteWahl<T>(rnd: () => number, eintraege: { wert: T; gewicht: number }[]): T | null {
  const summe = eintraege.reduce((a, e) => a + Math.max(0, e.gewicht), 0);
  if (summe <= 0) return null;
  let r = rnd() * summe;
  for (const e of eintraege) {
    r -= Math.max(0, e.gewicht);
    if (r <= 0) return e.wert;
  }
  return eintraege[eintraege.length - 1].wert;
}
