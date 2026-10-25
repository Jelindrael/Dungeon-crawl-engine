import { FRAKTIONEN } from '../data/fraktionen';
import { WERTE } from '../data/werte';
import type { BlockId, Effekte, FraktionId, Spielstand, WertId } from './types';
import { clamp } from './util';

export const PK_MAX = 40;

export function setzeWert(s: Spielstand, id: WertId, v: number) {
  const m = WERTE[id];
  s.werte[id] = clamp(v, m.min, m.max);
}

/** Wendet einmalige Effekte (Ereignisse, Aktionen, Wechsel) an. */
export function wendeAn(s: Spielstand, e: Effekte | undefined) {
  if (!e) return;
  if (e.delta) for (const [k, v] of Object.entries(e.delta)) setzeWert(s, k as WertId, s.werte[k as WertId] + (v ?? 0));
  if (e.fraktionen)
    for (const [k, v] of Object.entries(e.fraktionen)) {
      const f = s.fraktionen[k as FraktionId];
      if (f) f.loyalitaet = clamp(f.loyalitaet + (v ?? 0), 0, 100);
    }
  if (e.beziehungen)
    for (const [k, v] of Object.entries(e.beziehungen))
      s.beziehungen[k as BlockId] = clamp(s.beziehungen[k as BlockId] + (v ?? 0), -100, 100);
  if (e.pk) s.pk = clamp(s.pk + e.pk, 0, PK_MAX);
  if (e.schuldenEinmalig) setzeWert(s, 'schulden', s.werte.schulden + e.schuldenEinmalig);
  if (e.flags) for (const [k, v] of Object.entries(e.flags)) s.flags[k] = v;
  if (e.ziele) for (const [k, v] of Object.entries(e.ziele)) s.bonus[k as WertId] = (s.bonus[k as WertId] ?? 0) + (v ?? 0);
  if (e.macht) for (const [k, v] of Object.entries(e.macht)) s.machtBonus[k as FraktionId] = (s.machtBonus[k as FraktionId] ?? 0) + (v ?? 0);
}

/** Kurze, menschenlesbare Zusammenfassung von Effekten (für Hinweise in der Oberfläche). */
export function effektHinweise(e: Effekte | undefined, max = 6): { text: string; gut: boolean | null }[] {
  if (!e) return [];
  const res: { text: string; gut: boolean | null; staerke: number }[] = [];
  const pfeil = (v: number, gross: number) => {
    const a = Math.abs(v);
    const n = a >= gross * 2 ? 3 : a >= gross ? 2 : 1;
    return (v > 0 ? '↑' : '↓').repeat(n);
  };
  const quellen: [Partial<Record<WertId, number>> | undefined, number][] = [
    [e.delta, 1],
    [e.ziele, 1],
  ];
  for (const [q] of quellen) {
    if (!q) continue;
    for (const [k, v] of Object.entries(q)) {
      if (!v) continue;
      const m = WERTE[k as WertId];
      const gross = m.max - m.min > 50 ? 6 : 1.5;
      const gut = m.gut === 0 ? null : (v > 0) === (m.gut > 0);
      res.push({ text: `${m.name} ${pfeil(v, gross)}`, gut, staerke: Math.abs(v) / gross });
    }
  }
  if (e.fraktionen)
    for (const [k, v] of Object.entries(e.fraktionen)) {
      if (!v) continue;
      res.push({ text: `${FRAKTIONEN[k as FraktionId].kurz} ${pfeil(v, 8)}`, gut: v > 0, staerke: Math.abs(v) / 8 });
    }
  if (e.wachstum) res.push({ text: `Wachstum ${pfeil(e.wachstum, 0.3)}`, gut: e.wachstum > 0, staerke: Math.abs(e.wachstum) / 0.3 });
  if (e.haushalt) res.push({ text: e.haushalt > 0 ? 'Kostet Geld' : 'Bringt Geld', gut: e.haushalt < 0, staerke: Math.abs(e.haushalt) });
  if (e.schuldenEinmalig) res.push({ text: `Schulden ${pfeil(e.schuldenEinmalig, 5)}`, gut: e.schuldenEinmalig < 0, staerke: Math.abs(e.schuldenEinmalig) / 5 });
  if (e.pk) res.push({ text: `${e.pk > 0 ? '+' : ''}${e.pk} Politisches Kapital`, gut: e.pk > 0, staerke: Math.abs(e.pk) / 3 });
  if (e.beziehungen)
    for (const [k, v] of Object.entries(e.beziehungen)) {
      if (!v) continue;
      const namen: Record<string, string> = { westen: 'Westmächte', china: 'China', sueden: 'Globaler Süden', maerkte: 'Finanzmärkte' };
      res.push({ text: `${namen[k]} ${pfeil(v, 10)}`, gut: v > 0, staerke: Math.abs(v) / 10 });
    }
  res.sort((a, b) => b.staerke - a.staerke);
  return res.slice(0, max).map(({ text, gut }) => ({ text, gut }));
}
