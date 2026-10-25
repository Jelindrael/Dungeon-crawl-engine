// Verbindung zwischen Oberfläche und 3D-Welt.
import { LAND_MAP } from '../data/laender';
import { regionsWerte } from '../sim/regionen';
import type { Spielstand } from '../sim/types';
import type { Welt, WeltZustand } from '../world/welt';

let welt: Welt | null = null;

export function weltSetzen(w: Welt | null) {
  welt = w;
}

export function weltGlobal(): Welt | null {
  return welt;
}

export function weltZustand(s: Spielstand): WeltZustand {
  const rw = regionsWerte(s);
  return {
    erneuerbar: s.werte.erneuerbar,
    kernkraft: s.werte.kernkraft,
    natur: s.werte.natur,
    verschmutzung: s.werte.verschmutzung,
    temperatur: s.werte.temperatur,
    wohlstand: Math.max(0, Math.min(1, 0.5 + Math.log(s.werte.bip / s.basis.bip) * 0.6 + (s.werte.wohnen - 50) / 200)),
    regime: s.phase === 'regime',
    regionen: rw.map((r) => ({ id: r.region.id, zustimmung: r.zustimmung, verschmutzung: r.verschmutzung, unruhe: r.unruhe })),
    projekte: [
      ...s.fertig.map((p) => ({ uid: p.uid, id: p.id, region: p.region, fertig: true })),
      ...s.projekte.map((p) => ({ uid: p.uid, id: p.id, region: p.region, fertig: false })),
    ],
  };
}

/** Ein ruhiger Zustand für den Titelbildschirm. */
export function titelZustand(landId: string): WeltZustand {
  const l = LAND_MAP[landId];
  return {
    erneuerbar: 55,
    kernkraft: 0,
    natur: 70,
    verschmutzung: 20,
    temperatur: 1.45,
    wohlstand: 0.7,
    regime: false,
    regionen: l.regionen.map((r) => ({ id: r.id, zustimmung: 60, verschmutzung: 20, unruhe: 20 })),
    projekte: [],
  };
}
