// Speichern & Laden im Browser (localStorage). Alle Zugriffe sind abgesichert, da Speicher fehlen kann.
import { LAND_MAP } from '../data/laender';
import { SPIELSTAND_VERSION } from '../sim/engine';
import type { Spielstand } from '../sim/types';
import { datum } from '../sim/util';

const PREFIX = 'morgenrot.';
export type Slot = 'auto' | '1' | '2' | '3';
export const SLOTS: Slot[] = ['auto', '1', '2', '3'];

export interface SlotInfo {
  slot: Slot;
  land: string;
  flagge: string;
  datum: string;
  gespeichert: number;
  phase: string;
}

function lesen<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function schreiben(key: string, wert: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(wert));
    return true;
  } catch {
    return false;
  }
}

export function speichern(s: Spielstand, slot: Slot): boolean {
  const l = LAND_MAP[s.land];
  const info: SlotInfo = { slot, land: l.name, flagge: l.flagge, datum: datum(s.runde), gespeichert: Date.now(), phase: s.phase };
  return schreiben(`stand.${slot}`, s) && schreiben(`info.${slot}`, info);
}

export function autoSpeichern(s: Spielstand) {
  speichern(s, 'auto');
}

export function laden(slot: Slot): Spielstand | null {
  const s = lesen<Spielstand>(`stand.${slot}`);
  if (!s || s.version !== SPIELSTAND_VERSION || !LAND_MAP[s.land]) return null;
  return migrieren(s);
}

/** Ergänzt Felder, die in älteren Spielständen derselben Version noch fehlen können. */
function migrieren(s: Spielstand): Spielstand {
  s.bonus ??= {};
  s.machtBonus ??= {};
  s.anliegenBasis ??= {};
  s.anliegenRef ??= {};
  s.anliegenStart ??= {};
  s.amtszeit ??= 0;
  s.strukturwandel ??= 0;
  s.weltRest ??= 100;
  s.geplanteEreignisse ??= [];
  s.erfolgeLauf ??= [];
  return s;
}

export function slotInfo(slot: Slot): SlotInfo | null {
  const info = lesen<SlotInfo>(`info.${slot}`);
  if (!info) return null;
  return laden(slot) ? info : null;
}

export function loeschen(slot: Slot) {
  try {
    localStorage.removeItem(PREFIX + `stand.${slot}`);
    localStorage.removeItem(PREFIX + `info.${slot}`);
  } catch {
    /* ignorieren */
  }
}

// ───────── Einstellungen ─────────
export interface Einstellungen {
  ton: boolean;
  musik: boolean;
  haptik: boolean;
  grafik: 'hoch' | 'niedrig';
  tippsGesehen: string[];
}

const STANDARD: Einstellungen = { ton: true, musik: true, haptik: true, grafik: 'hoch', tippsGesehen: [] };

export function einstellungenLaden(): Einstellungen {
  const e = lesen<Partial<Einstellungen>>('einstellungen');
  const grafik = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4 ? 'niedrig' : 'hoch';
  return { ...STANDARD, grafik, ...(e ?? {}) };
}

export function einstellungenSpeichern(e: Einstellungen) {
  schreiben('einstellungen', e);
}

// ───────── Erfolge (über alle Spiele) ─────────
export function erfolgeLaden(): string[] {
  return lesen<string[]>('erfolge') ?? [];
}

export function erfolgeSpeichern(liste: string[]) {
  schreiben('erfolge', liste);
}
