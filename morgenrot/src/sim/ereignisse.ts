import { EREIGNISSE, EREIGNIS_MAP } from '../data/ereignisse';
import { FRAKTION_IDS } from '../data/fraktionen';
import type { EreignisDef, EreignisOption } from '../data/schema';
import { wendeAn } from './effekte';
import { gewichteteWahl, zufall } from './rng';
import type { FraktionId, Spielstand } from './types';
import { jahr, land, schwierigkeitsFaktor } from './util';

const MAX_EREIGNISSE = 3;

export function ereignisErlaubt(s: Spielstand, e: EreignisDef): boolean {
  const phasen = e.phasen ?? ['regierung'];
  if (!phasen.includes(s.phase)) return false;
  if (e.laender && !e.laender.includes(s.land)) return false;
  const j = jahr(s.runde);
  if (e.jahr && (j < e.jahr[0] || j > e.jahr[1])) return false;
  const letzt = s.ereignisHistorie[e.id];
  if (letzt !== undefined) {
    if (e.einmalig) return false;
    if (s.runde - letzt < (e.abstand ?? 20)) return false;
  }
  if (e.wenn && !e.wenn(s)) return false;
  return true;
}

function gewicht(s: Spielstand, e: EreignisDef): number {
  const g = typeof e.gewicht === 'function' ? e.gewicht(s) : e.gewicht ?? 1;
  return e.laender ? g * 1.6 : g;
}

export function ereignisseZiehen(s: Spielstand, rnd: () => number) {
  const offen = new Set(s.ereignisse.map((e) => e.id));
  const hinzu = (id: string, quelle?: FraktionId) => {
    if (s.ereignisse.length >= MAX_EREIGNISSE + 1 || offen.has(id)) return;
    s.ereignisse.push({ id, quelle });
    offen.add(id);
  };

  // Geplante Folgeereignisse
  const faellig = s.geplanteEreignisse.filter((g) => g.runde <= s.runde);
  s.geplanteEreignisse = s.geplanteEreignisse.filter((g) => g.runde > s.runde);
  for (const g of faellig) {
    const def = EREIGNIS_MAP[g.id];
    if (def && (!def.wenn || def.wenn(s)) && (def.phasen ?? ['regierung']).includes(s.phase)) hinzu(g.id);
  }

  // Proteste und Unterstützung von Fraktionen
  const sf = schwierigkeitsFaktor(s);
  for (const f of FRAKTION_IDS) {
    const fr = s.fraktionen[f];
    let art: 'protest' | 'unterstuetzung' | null = null;
    if (fr.loyalitaet < 30 && rnd() < ((30 - fr.loyalitaet) * fr.macht) / 1500 * sf) art = 'protest';
    else if (fr.loyalitaet > 75 && rnd() < ((fr.loyalitaet - 75) * fr.macht) / 2500) art = 'unterstuetzung';
    if (!art) continue;
    const pool = EREIGNISSE.filter((e) => e.fraktion === f && e.art === art && ereignisErlaubt(s, e));
    const wahl = gewichteteWahl(rnd, pool.map((e) => ({ wert: e, gewicht: gewicht(s, e) })));
    if (wahl) hinzu(wahl.id, f);
  }

  // Allgemeine Ereignisse
  const anzahl = rnd() < 0.25 ? 0 : 1 + (rnd() < 0.3 ? 1 : 0);
  for (let i = 0; i < anzahl && s.ereignisse.length < MAX_EREIGNISSE; i++) {
    const pool = EREIGNISSE.filter((e) => !e.fraktion && !offen.has(e.id) && ereignisErlaubt(s, e));
    const wahl = gewichteteWahl(rnd, pool.map((e) => ({ wert: e, gewicht: gewicht(s, e) })));
    if (wahl) hinzu(wahl.id);
  }
}

export function aktuellesEreignis(s: Spielstand): EreignisDef | null {
  const e = s.ereignisse[0];
  return e ? EREIGNIS_MAP[e.id] ?? null : null;
}

export function ersetzePlatzhalter(s: Spielstand, text: string, vars?: Record<string, string>): string {
  const l = land(s);
  let t = text
    .replaceAll('{land}', l.name)
    .replaceAll('{hauptstadt}', l.hauptstadt)
    .replaceAll('{jahr}', String(jahr(s.runde)));
  t = t.replace(/\{region:(\w+)\}/g, (_, typ: string) => l.regionen.find((r) => r.typ === typ)?.name ?? l.regionen[0].name);
  if (vars) for (const [k, v] of Object.entries(vars)) t = t.replaceAll(`{${k}}`, v);
  // Aktuelle Kennzahlen, z. B. {inflation}
  t = t.replace(/\{(\w+)\}/g, (m, k: string) =>
    k in s.werte ? (s.werte[k as keyof typeof s.werte] as number).toLocaleString('de-DE', { maximumFractionDigits: 1 }) : m,
  );
  return t;
}

export function optionVerfuegbar(s: Spielstand, o: EreignisOption): string | null {
  if (o.bedingung && !o.bedingung(s)) return o.bedingungText ?? 'Nicht möglich.';
  if (o.pkKosten && s.pk < o.pkKosten) return `Benötigt ${o.pkKosten} politisches Kapital.`;
  return null;
}

/** Wählt eine Option des vordersten Ereignisses und gibt den Ergebnistext zurück. */
export function ereignisEntscheiden(s: Spielstand, index: number): string {
  const offen = s.ereignisse[0];
  if (!offen) return '';
  const def = EREIGNIS_MAP[offen.id];
  if (!def) {
    s.ereignisse.shift();
    return '';
  }
  const o = def.optionen[index];
  if (!o || optionVerfuegbar(s, o)) return '';
  s.ereignisse.shift();
  s.ereignisHistorie[def.id] = s.runde;
  if (o.pkKosten) s.pk -= o.pkKosten;
  wendeAn(s, o.effekte);
  if (o.modifikator) {
    s.modifikatoren.push({ id: `${def.id}_${s.runde}`, ...o.modifikator });
  }
  if (o.folge) s.geplanteEreignisse.push({ id: o.folge.id, runde: s.runde + o.folge.in });
  for (const c of [def.codex, o.codex]) if (c && !s.codex.includes(c)) s.codex.push(c);
  let text = o.ergebnis ?? '';
  if (o.aktion) {
    const r = o.aktion(s, zufall(s));
    if (r) text = text ? `${text} ${r}` : r;
  }
  if (def.kategorie !== 'fraktion' || def.art === 'protest')
    s.chronik.push({ runde: s.runde, text: `${def.titel}: ${o.text}` });
  return ersetzePlatzhalter(s, text, offen.vars);
}
