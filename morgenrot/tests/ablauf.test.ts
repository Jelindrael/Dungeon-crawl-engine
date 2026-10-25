import { describe, expect, it } from 'vitest';
import { FRAKTION_IDS } from '../src/data/fraktionen';
import { aktionAusfuehren, aktionMoeglich, neuesSpiel, politikAendern, rundeBeenden, systemWechseln } from '../src/sim/engine';
import { ereignisEntscheiden } from '../src/sim/ereignisse';
import { machtVerlieren } from '../src/sim/macht';
import type { Spielstand } from '../src/sim/types';

function ereignisseAbarbeiten(s: Spielstand, wahl = 0) {
  let n = 0;
  while (s.ereignisse.length && n++ < 10) {
    const vorher = s.ereignisse.length;
    ereignisEntscheiden(s, wahl);
    if (s.ereignisse.length === vorher) ereignisEntscheiden(s, 0);
    if (s.ereignisse.length === vorher) s.ereignisse.shift();
  }
}

describe('Spielabläufe', () => {
  it('Spielstände überstehen JSON-Speicherung', () => {
    const s = neuesSpiel('deutschland', 'normal', 7);
    ereignisseAbarbeiten(s);
    rundeBeenden(s);
    const kopie = JSON.parse(JSON.stringify(s)) as Spielstand;
    ereignisseAbarbeiten(kopie);
    rundeBeenden(kopie);
    expect(kopie.runde).toBe(2);
    expect(Number.isFinite(kopie.werte.lebensqualitaet)).toBe(true);
  });

  it('Politik ändern kostet Kapital und wirkt nur einmal pro Runde', () => {
    const s = neuesSpiel('deutschland', 'leicht', 3);
    const pk = s.pk;
    expect(politikAendern(s, 'verkehr', 2)).toBeNull();
    expect(s.pk).toBeLessThan(pk);
    expect(s.politik.verkehr).toBe(2);
    expect(politikAendern(s, 'verkehr', 1)).not.toBeNull();
  });

  it('Wahlniederlage führt in die Opposition, Sieg zurück an die Regierung', () => {
    const s = neuesSpiel('chile', 'normal', 11);
    ereignisseAbarbeiten(s);
    for (const f of FRAKTION_IDS) s.fraktionen[f].loyalitaet = 12;
    s.werte.faschismus = 10;
    s.naechsteWahl = s.runde + 1;
    rundeBeenden(s);
    expect(s.phase).toBe('opposition');
    expect(s.system).toBe('rechtsregierung');
    // Opposition: Bewegung aufbauen, bis zur nächsten Wahl
    for (const f of FRAKTION_IDS) s.fraktionen[f].loyalitaet = 90;
    s.naechsteWahl = s.runde + 1;
    ereignisseAbarbeiten(s);
    rundeBeenden(s);
    expect(s.phase).toBe('regierung');
  });

  it('Starke extreme Rechte kann die Macht ergreifen, Widerstand stürzt das Regime', () => {
    const s = neuesSpiel('polen', 'normal', 5);
    ereignisseAbarbeiten(s);
    machtVerlieren(s, 'faschistisch');
    expect(s.phase).toBe('regime');
    expect(s.naechsteWahl).toBeNull();
    let runden = 0;
    while (s.phase === 'regime' && runden++ < 120) {
      if (!aktionMoeglich(s, 'untergrund')) aktionAusfuehren(s, 'untergrund');
      if (!aktionMoeglich(s, 'massenprotest')) aktionAusfuehren(s, 'massenprotest');
      ereignisseAbarbeiten(s);
      if (s.phase !== 'regime') break;
      rundeBeenden(s);
    }
    expect(s.phase).toBe('regierung');
  });

  it('Putsch kann abgewehrt werden oder zur Junta führen', () => {
    const ergebnisse = new Set<string>();
    for (let seed = 1; seed < 30; seed++) {
      const s = neuesSpiel('brasilien', 'normal', seed);
      ereignisseAbarbeiten(s);
      s.ereignisse = [{ id: 'putsch' }];
      ereignisEntscheiden(s, 0);
      ergebnisse.add(s.phase);
    }
    expect(ergebnisse.has('regierung')).toBe(true);
    expect(ergebnisse.has('regime')).toBe(true);
  });

  it('Notstand schafft Wahlen ab, Rückkehr zur Demokratie führt sie wieder ein', () => {
    const s = neuesSpiel('indien', 'leicht', 9);
    s.pk = 40;
    const r = systemWechseln(s, 'autoritaer');
    expect(r.erfolg).toBe(true);
    expect(s.naechsteWahl).toBeNull();
    s.flags.system_sperre = 0;
    s.pk = 40;
    const r2 = systemWechseln(s, 'parlamentarisch');
    expect(r2.erfolg).toBe(true);
    expect(s.naechsteWahl).not.toBeNull();
  });

  it('Die Kampagne erreicht 2100 und fordert eine Bilanz an', () => {
    const s = neuesSpiel('suedafrika', 'normal', 21);
    for (let i = 0; i < 148; i++) {
      ereignisseAbarbeiten(s);
      rundeBeenden(s);
    }
    expect(s.runde).toBe(148);
    expect(s.flags.bilanz_faellig).toBe(1);
  });
});
