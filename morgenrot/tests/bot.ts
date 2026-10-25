// Einfache Bots, die das Spiel automatisch durchspielen – für Balance- und Stabilitätstests.
import { AKTIONEN } from '../src/data/aktionen';
import { LAND_MAP } from '../src/data/laender';
import { POLITIK } from '../src/data/politik';
import { PROJEKTE } from '../src/data/projekte';
import {
  aktionAusfuehren,
  aktionMoeglich,
  neuesSpiel,
  politikAendern,
  politikKosten,
  projektMoeglich,
  projektStarten,
  rundeBeenden,
  systemWechseln,
} from '../src/sim/engine';
import { aktuellesEreignis, ereignisEntscheiden, optionVerfuegbar } from '../src/sim/ereignisse';
import type { Schwierigkeit, Spielstand } from '../src/sim/types';

export type Strategie = 'passiv' | 'zufall' | 'reformer' | 'radikal' | 'klug' | 'autoritaer';

/** Zielprogramm eines moderaten, demokratisch-ökologischen Reformers. */
const REFORMER: Record<string, number> = {
  energie: 2, jobgarantie: 1, gesundheit: 2, bildung: 2, wohnen: 2, verkehr: 2, care: 2, sicherung: 2,
  steuern: 2, loehne: 2, partizipation: 2, medien: 2, co2preis: 2, naturschutz: 2, landwirtschaft: 2,
  reproduktion: 2, gleichstellung: 2, minderheiten: 3, integration: 2, klimadiplomatie: 2, plattformen: 2,
  arbeitszeit: 2, betriebe: 2, forschung: 2, korruption: 2, finanzen: 3, sicherheit: 3, opposition: 1,
};

const RADIKAL: Record<string, number> = {
  ...REFORMER,
  industrie: 3, betriebe: 3, finanzen: 3, planung: 2, steuern: 3, arbeitszeit: 3, jobgarantie: 2,
  sicherung: 4, wohnen: 3, energie: 3, partizipation: 3, plattformen: 3, ki: 2, buendnis: 3, militaer: 2,
};

export interface Ergebnis {
  s: Spielstand;
  fehler: string[];
}

export function spielen(land: string, strategie: Strategie, seed = 1, runden = 148, schwierigkeit: Schwierigkeit = 'normal'): Ergebnis {
  const s = neuesSpiel(land, schwierigkeit, seed);
  const fehler: string[] = [];
  let r = seed * 7919;
  const rnd = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };

  for (let i = 0; i < runden; i++) {
    // Ereignisse abarbeiten
    let guard = 0;
    while (s.ereignisse.length && guard++ < 10) {
      const e = aktuellesEreignis(s);
      if (!e) {
        s.ereignisse.shift();
        continue;
      }
      const verfuegbar = e.optionen.map((o, idx) => ({ o, idx })).filter(({ o }) => !optionVerfuegbar(s, o));
      if (!verfuegbar.length) {
        s.ereignisse.shift();
        continue;
      }
      const wahl = strategie === 'zufall' ? verfuegbar[Math.floor(rnd() * verfuegbar.length)] : verfuegbar[0];
      ereignisEntscheiden(s, wahl.idx);
    }

    if (s.phase === 'regierung' && strategie !== 'passiv') {
      const programm = strategie === 'radikal' || strategie === 'klug' ? RADIKAL : REFORMER;
      if (strategie === 'zufall') {
        for (let k = 0; k < 3; k++) {
          const d = POLITIK[Math.floor(rnd() * POLITIK.length)];
          const neu = (s.politik[d.id] ?? 0) + (rnd() < 0.5 ? -1 : 1);
          if (neu >= 0 && neu < d.stufen.length) politikAendern(s, d.id, neu);
        }
      } else {
        if (strategie === 'autoritaer' && s.system !== 'autoritaer' && s.runde > 6) {
          systemWechseln(s, 'autoritaer');
        }
        const offen = Object.entries(programm)
          .filter(([id, ziel]) => (s.politik[id] ?? 0) < ziel)
          .map(([id]) => ({ id, k: politikKosten(s, id, (s.politik[id] ?? 0) + 1) }))
          .filter((x) => x.k.moeglich)
          .filter((x) => {
            if (strategie !== 'klug') return true;
            const kosten = POLITIK.find((p) => p.id === x.id)!.stufen[(s.politik[x.id] ?? 0) + 1].effekte.haushalt ?? 0;
            return s.werte.defizit < 3.5 || kosten <= 0;
          })
          .sort((a, b) => a.k.pk - b.k.pk);
        if (offen.length && s.pk > offen[0].k.pk + 2) politikAendern(s, offen[0].id, (s.politik[offen[0].id] ?? 0) + 1);
        // Projekte bauen
        if (s.pk > 6) {
          for (const p of PROJEKTE) {
            if (p.id === 'gaskraftwerk') continue;
            const region = LAND_MAP[s.land].regionen.find((rg) => !projektMoeglich(s, p.id, rg.id));
            if (region) {
              projektStarten(s, p.id, region.id);
              break;
            }
          }
        }
        // Aktionen bei Bedarf
        if (s.werte.legitimitaet < 45 && !aktionMoeglich(s, 'rede')) aktionAusfuehren(s, 'rede');
        if (s.werte.faschismus > 30 && !aktionMoeglich(s, 'bildungskampagne')) aktionAusfuehren(s, 'bildungskampagne');
        if (strategie === 'klug') {
          if (s.werte.defizit > 5 && !aktionMoeglich(s, 'sparprogramm')) aktionAusfuehren(s, 'sparprogramm');
          if (s.beziehungen.sueden < 40 && !aktionMoeglich(s, 'sued_allianz')) aktionAusfuehren(s, 'sued_allianz');
          if (s.beziehungen.china < 30 && !aktionMoeglich(s, 'handel_china')) aktionAusfuehren(s, 'handel_china');
        }
      }
    } else if (s.phase !== 'regierung' && strategie !== 'passiv') {
      const moegliche = AKTIONEN.filter((a) => !aktionMoeglich(s, a.id));
      if (moegliche.length) aktionAusfuehren(s, moegliche[Math.floor(rnd() * moegliche.length)].id);
    }

    rundeBeenden(s);

    for (const [k, v] of Object.entries(s.werte)) {
      if (!Number.isFinite(v)) fehler.push(`Runde ${s.runde}: ${k} = ${v}`);
    }
    for (const [k, f] of Object.entries(s.fraktionen)) {
      if (!Number.isFinite(f.loyalitaet) || !Number.isFinite(f.macht)) fehler.push(`Runde ${s.runde}: Fraktion ${k} ungültig`);
    }
  }
  return { s, fehler };
}

export function zusammenfassung(s: Spielstand): string {
  const w = s.werte;
  const b = s.basis.werte;
  const f = (v: number, d = 0) => v.toFixed(d);
  const wahlen = s.wahlergebnisse.map((e) => `${e.gewonnen ? '✓' : '✗'}${f(e.spieler)}`).join(' ');
  return [
    `${s.land.padEnd(11)} R${s.runde} ${s.phase.padEnd(10)} ${s.system.padEnd(16)}`,
    `LQ ${f(b.lebensqualitaet)}→${f(w.lebensqualitaet)}`,
    `BIP ${f(b.bip)}→${f(w.bip)}`,
    `AL ${f(b.arbeitslosigkeit, 1)}→${f(w.arbeitslosigkeit, 1)}`,
    `Gini ${f(b.ungleichheit)}→${f(w.ungleichheit)}`,
    `CO2 ${f(b.co2, 1)}→${f(w.co2, 1)}`,
    `EE ${f(b.erneuerbar)}→${f(w.erneuerbar)}`,
    `Schuld ${f(b.schulden)}→${f(w.schulden)}`,
    `Zust ${f(b.zustimmung)}→${f(w.zustimmung)}`,
    `Fasch ${f(b.faschismus)}→${f(w.faschismus)}`,
    `T ${f(w.temperatur, 2)}`,
    `PK ${f(s.pk)}`,
    `Wahlen: ${wahlen}`,
  ].join(' | ');
}
