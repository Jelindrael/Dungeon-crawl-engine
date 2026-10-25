// Einfache, reaktive Zustandsverwaltung für Spielstand und Oberfläche.
import { useEffect, useReducer } from 'preact/hooks';
import type { Spielstand } from '../sim/types';
import { autoSpeichern } from './speicher';

type Hoerer = () => void;

class Beobachtbar {
  private hoerer = new Set<Hoerer>();
  version = 0;
  abonnieren(h: Hoerer) {
    this.hoerer.add(h);
    return () => this.hoerer.delete(h);
  }
  melden() {
    this.version++;
    this.hoerer.forEach((h) => h());
  }
}

class SpielStore extends Beobachtbar {
  s: Spielstand | null = null;
  setzen(s: Spielstand | null) {
    this.s = s;
    this.melden();
  }
  /** Führt eine Änderung am Spielstand aus, speichert automatisch und benachrichtigt die Oberfläche. */
  aendern<T>(fn: (s: Spielstand) => T): T {
    if (!this.s) throw new Error('Kein Spiel aktiv');
    const r = fn(this.s);
    autoSpeichern(this.s);
    this.melden();
    return r;
  }
}

export const spiel = new SpielStore();

export type Tab = 'lage' | 'politik' | 'gesellschaft' | 'welt' | 'mehr';
export type Bildschirm = 'titel' | 'landwahl' | 'intro' | 'spiel';
export type Overlay = 'normal' | 'zustimmung' | 'verschmutzung' | 'unruhe';

export interface Toast {
  id: number;
  text: string;
  icon?: string;
  typ?: 'gut' | 'schlecht' | 'neutral' | 'erfolg';
}

class UiStore extends Beobachtbar {
  bildschirm: Bildschirm = 'titel';
  tab: Tab | null = null;
  region: string | null = null;
  overlay: Overlay = 'normal';
  zeigeBericht = false;
  ergebnisText: string | null = null;
  ereignisErgebnis: { text: string; codex?: string } | null = null;
  unterseite: string | null = null; // z. B. 'codex', 'statistik' im Mehr-Tab
  codexEintrag: string | null = null;
  toasts: Toast[] = [];
  private naechsteToastId = 1;

  setzen(teil: Partial<Omit<UiStore, 'setzen' | 'toast' | 'abonnieren' | 'melden' | 'version' | 'toasts'>>) {
    Object.assign(this, teil);
    this.melden();
  }

  toast(text: string, icon?: string, typ: Toast['typ'] = 'neutral') {
    const t = { id: this.naechsteToastId++, text, icon, typ };
    this.toasts = [...this.toasts, t].slice(-3);
    this.melden();
    setTimeout(() => {
      this.toasts = this.toasts.filter((x) => x.id !== t.id);
      this.melden();
    }, 3800);
  }
}

export const ui = new UiStore();

/** Öffnet einen Lexikoneintrag im Mehr-Tab und schaltet ihn im laufenden Spiel frei. */
export function lexikonOeffnen(id: string) {
  if (spiel.s && !spiel.s.codex.includes(id)) spiel.aendern((s) => s.codex.push(id));
  ui.setzen({ tab: 'mehr', unterseite: 'codex', codexEintrag: id, region: null });
}

function useAbo(o: Beobachtbar) {
  const [, erzwingen] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const ab = o.abonnieren(() => erzwingen(undefined));
    return () => {
      ab();
    };
  }, [o]);
}

export function useSpiel(): Spielstand {
  useAbo(spiel);
  return spiel.s!;
}

export function useSpielOptional(): Spielstand | null {
  useAbo(spiel);
  return spiel.s;
}

export function useUi(): UiStore {
  useAbo(ui);
  return ui;
}
