// Die Kern-Simulation: Spielstart, Rundenablauf und alle Spieleraktionen.
import { AKTION_MAP } from '../data/aktionen';
import { BLOCK_IDS, FRAKTION_IDS, FRAKTIONEN } from '../data/fraktionen';
import { LAND_MAP } from '../data/laender';
import { TECHNOLOGIEN } from '../data/merkmale';
import { POLITIK, POLITIK_MAP } from '../data/politik';
import { PROJEKT_MAP } from '../data/projekte';
import { GEGNER_PROGRAMM, SYSTEME } from '../data/systeme';
import { KERNWERTE, WERTE, ZIEL_RATEN, ZIEL_WERTE } from '../data/werte';
import {
  anliegenWert,
  beziehungsZiele,
  dynamik,
  fraktionsMacht,
  fraktionsZiele,
  haltung,
  sammleBeitraege,
  stufenHaltung,
  trend,
  zielwerte,
  type Beitraege,
} from './beitraege';
import { PK_MAX, setzeWert, wendeAn } from './effekte';
import { ereignisseZiehen } from './ereignisse';
import { machtVerlieren, machtZurueck } from './macht';
import { forderungenPruefen } from './forderungen';
import { zufall } from './rng';
import type {
  Bericht,
  FraktionId,
  Meldung,
  Schwierigkeit,
  Spielstand,
  SystemId,
  Werte,
  WertId,
} from './types';
import {
  clamp,
  datum,
  dialKostenMod,
  END_RUNDE,
  formatZahl,
  fossil,
  jahr,
  land,
  mod,
  rateMod,
  schwierigkeitsFaktor,
} from './util';

export const SPIELSTAND_VERSION = 1;

// ───────────────────────── Abgeleitete Größen ─────────────────────────

export function lebensqualitaetBerechnen(w: Werte): number {
  const einkommen = clamp(20 * Math.log(w.bip / 4), 0, 100) * clamp(1 - (w.ungleichheit - 25) / 100, 0.4, 1.1);
  const freizeit = clamp((50 - w.arbeitszeit) * 4, 0, 100);
  const umwelt = (100 - w.verschmutzung) * 0.5 + w.natur * 0.5;
  const sicherheit = 100 - w.unruhe;
  const rechte = (w.frauenrechte + w.minderheitenrechte + w.buergerrechte + w.pressefreiheit) / 4;
  const arbeit = clamp(100 - w.arbeitslosigkeit * 2.5, 0, 100);
  const roh =
    0.16 * w.gesundheit +
    0.12 * w.bildung +
    0.13 * w.wohnen +
    0.18 * einkommen +
    0.08 * freizeit +
    0.1 * umwelt +
    0.08 * sicherheit +
    0.08 * rechte +
    0.07 * arbeit -
    Math.max(0, w.inflation - 3) * 0.6;
  return clamp(roh > 80 ? 80 + (roh - 80) * 0.6 : roh, 0, 100);
}

export function lebensqualitaetMitVerlust(s: Spielstand): number {
  const verlust = Math.max(0, 1 - s.werte.bip / s.basis.bip) * 45;
  return clamp(lebensqualitaetBerechnen(s.werte) - verlust, 0, 100);
}

export function zustimmungBerechnen(s: Spielstand): number {
  let summe = 0;
  let gewicht = 0;
  for (const f of FRAKTION_IDS) {
    const z = s.fraktionen[f];
    summe += z.anteil * z.loyalitaet;
    gewicht += z.anteil;
  }
  return gewicht ? summe / gewicht : 50;
}

/** Grundwachstum: sinkt, je reicher das Land wird (Konvergenz), und langfristig durch Sättigung. */
export function potenzial(s: Spielstand): number {
  const l = land(s);
  const konvergenz = Math.pow(s.basis.bip / s.werte.bip, 0.8);
  const saettigung = Math.max(0.4, 1 - (jahr(s.runde) - 2026) * 0.006);
  return l.potenzial * clamp(konvergenz, 0.15, 1.5) * saettigung;
}

export interface Haushalt {
  einnahmen: number;
  grundausgaben: number;
  politik: number;
  projekte: number;
  zinsen: number;
  zinssatz: number;
  jobgarantie: number;
  klimaschaeden: number;
  ausgaben: number;
  defizit: number;
}

export function haushaltBerechnen(s: Spielstand, b: Beitraege = sammleBeitraege(s)): Haushalt {
  const w = s.werte;
  const projekte = s.projekte.reduce((a, p) => a + (PROJEKT_MAP[p.id]?.kosten ?? 0), 0);
  const politik = b.haushalt - projekte - s.basis.haushaltStatisch;
  let risiko = Math.max(0, w.schulden - 60) * 0.025 + Math.max(0, -s.beziehungen.maerkte) * 0.04 + Math.max(0, w.inflation - 2) * 0.3;
  // Öffentliche Banken finanzieren den Staat günstiger
  if ((s.politik.finanzen ?? 1) >= 3) risiko *= 0.35;
  let zinssatz = Math.min(8, 1.5 + risiko);
  if (s.politik.schulden === 1) zinssatz -= 0.5;
  let zinsen = (w.schulden * zinssatz) / 100;
  if (s.politik.schulden === 2) zinsen *= 0.4;
  const jobgarantie = (s.politik.jobgarantie ?? 0) >= 2 ? w.arbeitslosigkeit * 0.12 : 0;
  const klimaschaeden = land(s).klimaVerwundbarkeit * Math.max(0, w.temperatur - 1.45) * 0.6 * (1 - w.anpassung / 160);
  const ausgaben = s.basis.ausgaben + politik + projekte + zinsen + jobgarantie + klimaschaeden;
  return {
    einnahmen: w.steuerquote,
    grundausgaben: s.basis.ausgaben,
    politik,
    projekte,
    zinsen,
    zinssatz,
    jobgarantie,
    klimaschaeden,
    ausgaben,
    defizit: ausgaben - w.steuerquote,
  };
}

// ───────────────────────── Spielstart ─────────────────────────

export function neuesSpiel(landId: string, schwierigkeit: Schwierigkeit = 'normal', seed = Date.now() % 1e9): Spielstand {
  const l = LAND_MAP[landId];
  if (!l) throw new Error(`Unbekanntes Land: ${landId}`);

  const werte: Werte = {
    ...l.start,
    wachstum: l.potenzial,
    temperatur: 1.45,
    weltemissionen: 100,
    weltklima: 30,
    weltbewegung: 12,
    sanktionen: 0,
    lebensqualitaet: 0,
    zustimmung: 0,
  };
  werte.lebensqualitaet = lebensqualitaetBerechnen(werte);

  const loyMod = schwierigkeit === 'leicht' ? 5 : schwierigkeit === 'schwer' ? -5 : 0;
  const fraktionen = Object.fromEntries(
    FRAKTION_IDS.map((f) => [f, { ...l.fraktionen[f], loyalitaet: clamp(l.fraktionen[f].loyalitaet + loyMod, 0, 100) }]),
  ) as Spielstand['fraktionen'];

  const sys = SYSTEME[l.system];
  const s: Spielstand = {
    version: SPIELSTAND_VERSION,
    seed,
    rng: seed,
    land: landId,
    schwierigkeit,
    runde: 0,
    phase: 'regierung',
    system: l.system,
    spielerSystem: l.system,
    werte,
    offsets: {},
    fraktionen,
    fraktionOffsets: {} as Spielstand['fraktionOffsets'],
    beziehungen: { ...l.beziehungen },
    beziehungOffsets: {} as Spielstand['beziehungOffsets'],
    politik: { ...l.politik },
    programm: { ...l.politik },
    geaendert: [],
    pk: schwierigkeit === 'leicht' ? 20 : schwierigkeit === 'schwer' ? 12 : 16,
    forschung: 0,
    technologien: [],
    modifikatoren: [
      {
        id: 'flitterwochen',
        name: 'Rückenwind des Wahlsiegs',
        text: 'Die Hoffnung auf Veränderung trägt deine Regierung.',
        runden: 4,
        effekte: { fraktionen: { arbeiter: 6, klima: 6, partei: 6, feministisch: 4, minderheiten: 4, wissenschaft: 3 } },
        gut: true,
      },
    ],
    projekte: [],
    fertig: [],
    naechsteUid: 1,
    forderungen: [],
    ereignisse: [{ id: 'amtsantritt' }],
    ereignisHistorie: {},
    geplanteEreignisse: [],
    flags: {},
    naechsteWahl: sys.wahlen ? l.wahlintervall : null,
    widerstand: 0,
    aktionenGenutzt: [],
    verlauf: [],
    chronik: [{ runde: 0, text: `Deine Regierung tritt in ${l.name} ihr Amt an.`, typ: 'system' }],
    codex: ['sozialismus', 'spielanleitung'],
    berichte: [],
    letzterBericht: null,
    basis: {
      bip: werte.bip,
      co2: werte.co2,
      fossil: Math.max(1, 100 - werte.erneuerbar - werte.kernkraft),
      effizienz: werte.effizienz,
      ausgaben: 0,
      wachstumStatisch: 0,
      haushaltStatisch: 0,
      lebensqualitaet: werte.lebensqualitaet,
      werte: { ...werte },
    },
    bonus: {},
    machtBonus: {},
    anliegenBasis: {},
    anliegenRef: {},
    anliegenStart: {},
    amtszeit: 0,
    weltRest: 100,
    strukturwandel: 0,
    wahlergebnisse: [],
    erfolgeLauf: [],
    beendet: false,
  };

  for (const f of FRAKTION_IDS) {
    s.anliegenStart[f] = anliegenWert(s, f);
    s.anliegenRef[f] = s.anliegenStart[f];
  }
  kalibrieren(s);
  s.werte.zustimmung = zustimmungBerechnen(s);
  s.basis.werte = { ...s.werte };
  verlaufAufzeichnen(s);
  return s;
}

/** Setzt alle Offsets so, dass die Ausgangslage ein Gleichgewicht ist. */
function kalibrieren(s: Spielstand) {
  s.werte.zustimmung = zustimmungBerechnen(s);
  // Flitterwochen-Modifikator nicht mitkalibrieren
  const mods = s.modifikatoren;
  s.modifikatoren = [];
  const b = sammleBeitraege(s);
  const dyn = dynamik(s);
  const tr = trend(s);
  for (const id of ZIEL_WERTE) {
    s.offsets[id] = s.werte[id] - (b.ziele[id] ?? 0) - (dyn[id] ?? 0) - (tr[id] ?? 0);
  }
  for (const f of FRAKTION_IDS) {
    s.fraktionOffsets[f] = s.fraktionen[f].loyalitaet - haltung(b.fraktionen[f]) - anliegenWert(s, f);
  }
  const bz = beziehungsZiele({ ...s, beziehungOffsets: { westen: 0, china: 0, sueden: 0, maerkte: 0 } }, b);
  for (const id of BLOCK_IDS) s.beziehungOffsets[id] = s.beziehungen[id] - bz[id];
  s.basis.wachstumStatisch = b.wachstum;
  s.basis.haushaltStatisch = b.haushalt;
  const h = haushaltBerechnen(s, b);
  s.basis.ausgaben = s.werte.steuerquote + s.werte.defizit - h.zinsen;
  s.modifikatoren = mods;
}

// ───────────────────────── Rundenablauf ─────────────────────────

export function rundeBeenden(s: Spielstand): Bericht {
  const rnd = zufall(s);
  const vorher: Werte = { ...s.werte };
  const meldungen: Meldung[] = [];
  const l = land(s);

  // 1. Modifikatoren
  for (const m of s.modifikatoren) {
    if (m.effekte.delta) wendeAn(s, { delta: m.effekte.delta });
    m.runden -= 1;
  }
  const abgelaufen = s.modifikatoren.filter((m) => m.runden <= 0);
  s.modifikatoren = s.modifikatoren.filter((m) => m.runden > 0);
  for (const m of abgelaufen) if (m.id !== 'flitterwochen' && m.name) meldungen.push({ typ: 'neutral', text: `„${m.name}“ ist ausgelaufen.` });

  // 2. Projekte
  for (const p of [...s.projekte]) {
    p.fortschritt += 1;
    const def = PROJEKT_MAP[p.id];
    if (def && p.fortschritt >= def.dauer) {
      s.projekte = s.projekte.filter((x) => x.uid !== p.uid);
      s.fertig.push({ uid: p.uid, id: p.id, region: p.region, runde: s.runde });
      const region = l.regionen.find((r) => r.id === p.region)?.name ?? '';
      meldungen.push({ typ: 'projekt', text: `${def.icon} ${def.name} in ${region} fertiggestellt.` });
      s.chronik.push({ runde: s.runde, text: `${def.name} in ${region} eröffnet.`, typ: 'projekt' });
      if (def.codex && !s.codex.includes(def.codex)) s.codex.push(def.codex);
    }
  }

  // 3. Forschung
  const forschungsStufe = s.politik.forschung ?? 1;
  const unis = s.fertig.filter((p) => p.id === 'universitaet').length;
  s.forschung += ([0.45, 1, 2.1][forschungsStufe] + unis * 0.3) * (0.55 + s.werte.bildung / 110) + 0.55;
  for (const t of TECHNOLOGIEN) {
    if (s.technologien.includes(t.id)) continue;
    if (jahr(s.runde) >= t.jahr && s.forschung >= t.kosten) {
      s.technologien.push(t.id);
      s.forschung -= t.kosten * 0.5;
      if (t.effekte.wachstum)
        s.modifikatoren.push({ id: `tech_${t.id}`, name: `Technologieschub: ${t.name}`, runden: 12, effekte: { wachstum: t.effekte.wachstum }, gut: true });
      meldungen.push({ typ: 'technik', text: `${t.icon} Neue Technologie: ${t.name}` });
      if (t.codex && !s.codex.includes(t.codex)) s.codex.push(t.codex);
      s.chronik.push({ runde: s.runde, text: `Technologie verfügbar: ${t.name}.`, typ: 'technik' });
      break; // höchstens eine pro Runde
    }
  }

  // 4. Gegner regieren (Opposition/Regime)
  if (s.phase !== 'regierung') gegnerRegieren(s, rnd, meldungen);

  // 5. Zielwerte und Annäherung
  const b = sammleBeitraege(s);
  const z = zielwerte(s, b);
  const pot = potenzial(s);
  z.arbeitslosigkeit = Math.max(1, (z.arbeitslosigkeit ?? 0) - (s.werte.wachstum - pot) * 0.45 + s.strukturwandel);
  for (const id of ZIEL_WERTE) {
    let rate = (ZIEL_RATEN[id] ?? 0.1) * rateMod(s, id);
    if (id === 'erneuerbar') {
      const steigt = (z.erneuerbar ?? 0) > s.werte.erneuerbar;
      rate = steigt
        ? 0.025 + [0, 0.01, 0.03, 0.045][s.politik.energie ?? 1] + (s.technologien.includes('speicher') ? 0.012 : 0) + ((s.politik.planung ?? 1) >= 2 ? 0.01 : 0)
        : 0.03;
    }
    const ziel = z[id] ?? s.werte[id];
    setzeWert(s, id, s.werte[id] + (ziel - s.werte[id]) * clamp(rate, 0, 1));
  }

  // 6. Strukturwandel: schneller Fossilausstieg kostet Jobs
  const fosVorher = Math.max(0, 100 - vorher.erneuerbar - vorher.kernkraft);
  const fosJetzt = fossil(s);
  const ausstieg = Math.max(0, fosVorher - fosJetzt);
  const daempfung = [1, 0.5, 0.2][s.politik.jobgarantie ?? 0] * Math.max(0.3, 1 - s.fertig.filter((p) => p.id === 'strukturwandel').length * 0.2);
  const schock = ausstieg * 0.18 * mod(s, 'strukturwandel') * daempfung;
  s.strukturwandel = s.strukturwandel * 0.75 + schock;
  if (schock > 0.25) {
    wendeAn(s, { fraktionen: { arbeiter: -schock * 3, land: -schock } });
    if (schock > 0.6) meldungen.push({ typ: 'schlecht', text: 'Der schnelle Ausstieg aus fossiler Energie kostet in Kohle- und Industrieregionen Arbeitsplätze.' });
  }

  // 7. Wirtschaft
  const w = s.werte;
  const bw = s.basis.werte;
  const sf = schwierigkeitsFaktor(s);
  const klimaschaden =
    l.klimaVerwundbarkeit * Math.max(0, w.temperatur - 1.45) * 0.9 * (1 - w.anpassung / 150) * mod(s, 'klimaSchaden');
  // Gute Beziehungen zu China und dem globalen Süden mildern Sanktionen (Handelsumlenkung)
  const umlenkung = Math.max(0, (s.beziehungen.china + s.beziehungen.sueden) / 2) / 200;
  const handelsAbh = ((l.handel.westen + l.handel.maerkte) / 2) * (1 - umlenkung);
  // Strukturelle Faktoren (Politik, Bildung, Migration …) – gedeckelt, damit nichts explodiert
  const struktur = clamp(
    (b.wachstum - s.basis.wachstumStatisch) +
      (w.bildung - bw.bildung) * 0.015 +
      (w.gesundheit - bw.gesundheit) * 0.005 +
      (w.zuwanderung - bw.zuwanderung) * 0.03 * mod(s, 'migrationNutzen') +
      (s.politik.planung === 3 && s.technologien.includes('planungssoftware') ? 0.3 : 0),
    -3,
    2,
  );
  // Belastungen durch Konflikte, Krisen und Isolation
  const belastung =
    Math.max(0, w.kapitalflucht - bw.kapitalflucht) * 0.06 * sf +
    w.sanktionen * 0.075 * handelsAbh * 1.5 * sf +
    Math.max(0, w.unruhe - bw.unruhe) * 0.05 +
    (w.korruption - bw.korruption) * 0.02 +
    (w.buerokratie - bw.buerokratie) * 0.015 +
    Math.max(0, w.inflation - 5) * 0.12 +
    klimaschaden;
  // Fiskalimpuls: Nur eine Ausweitung des Defizits wirkt kurzfristig belebend, nicht sein Niveau
  const defTrend = s.flags.defizitTrend ?? bw.defizit;
  const konjunktur = clamp((w.defizit - defTrend) * 0.35, -1.5, 1.5);
  s.flags.defizitTrend = defTrend + (w.defizit - defTrend) * 0.25;
  let wachstum = pot + struktur - belastung + konjunktur + (rnd() - 0.5) * 0.8;
  wachstum = clamp(wachstum, -12, 12);
  w.wachstum = wachstum;
  w.bip = w.bip * Math.pow(1 + wachstum / 100, 0.5);

  const h = haushaltBerechnen(s, b);
  w.defizit = h.defizit;
  const nominal = wachstum + w.inflation;
  setzeWert(s, 'schulden', w.schulden * (1 - nominal / 200) + h.defizit / 2);
  w.inflation = clamp(w.inflation + (rnd() - 0.5) * 0.6, -3, 80);

  // 8. Klima
  const effRel = (1 - w.effizienz / 100) / (1 - s.basis.effizienz / 100);
  const fosRel = Math.pow(Math.max(0.0, fosJetzt) / s.basis.fossil, 0.9);
  const senken = s.fertig.filter((p) => p.id === 'co2_entnahme').length * 0.5 + Math.max(0, w.natur - bw.natur) * 0.02;
  w.co2 = clamp(s.basis.co2 * fosRel * Math.pow(w.bip / s.basis.bip, 0.45) * effRel - senken, -2, 40);

  const pop = l.bevoelkerung;
  const anteil0 = (pop * s.basis.co2) / 37000;
  const restRate = 0.8 - w.weltklima * 0.045;
  s.weltRest = Math.max(0, s.weltRest * (1 + restRate / 200));
  if (jahr(s.runde) > 2045 && w.weltklima > 60) s.weltRest = Math.max(-10, s.weltRest - (w.weltklima - 60) * 0.05);
  const eigen = 100 * anteil0 * (w.co2 / s.basis.co2);
  w.weltemissionen = Math.max(-10, s.weltRest * (1 - anteil0) + eigen);
  let erwaermung = 0.0135 * (w.weltemissionen / 100);
  if (w.temperatur > 2.0) erwaermung += 0.002; // Kipppunkte
  if (s.flags.amazonas_kipp) erwaermung += 0.0015;
  if (s.flags.geoengineering) erwaermung -= 0.006;
  w.temperatur = clamp(w.temperatur + erwaermung, 0, 6);

  // 9. Lebensqualität (Wohlstandsverluste gegenüber dem Ausgangsniveau schmerzen besonders)
  w.lebensqualitaet = lebensqualitaetMitVerlust(s);

  // 10. Beziehungen
  const bz = beziehungsZiele(s, b);
  for (const id of BLOCK_IDS) s.beziehungen[id] = clamp(s.beziehungen[id] + (bz[id] - s.beziehungen[id]) * 0.12, -100, 100);

  // 11. Fraktionen
  const macht = fraktionsMacht(s, b);
  const fz = fraktionsZiele(s, b);
  for (const f of FRAKTION_IDS) {
    const fr = s.fraktionen[f];
    fr.macht = macht[f];
    fr.loyalitaet = clamp(fr.loyalitaet + (fz[f] - fr.loyalitaet) * 0.12, 0, 100);
    const a = anliegenWert(s, f);
    s.anliegenRef[f] = (s.anliegenRef[f] ?? a) + (a - (s.anliegenRef[f] ?? a)) * 0.04;
  }
  if (s.phase === 'regierung') s.amtszeit += 1;
  w.zustimmung = zustimmungBerechnen(s);

  // 12. Politisches Kapital
  s.pk = clamp(s.pk + pkEinkommen(s), 0, PK_MAX);

  // 13. Wahlen
  if (s.naechsteWahl !== null && s.runde + 1 >= s.naechsteWahl) wahlDurchfuehren(s, rnd, meldungen);

  // 14. Regime-Widerstand
  if (s.phase === 'regime') {
    s.widerstand = clamp(
      s.widerstand + (w.unruhe - 40) * 0.06 + (w.bewusstsein - 35) * 0.06 + w.weltbewegung * 0.03 - w.ueberwachung * 0.02 + 0.6,
      0,
      100,
    );
    if (s.widerstand >= 100 && !s.ereignisse.some((e) => e.id === 'regime_sturz')) s.ereignisse.push({ id: 'regime_sturz' });
  }

  // 15. Forderungen
  forderungenPruefen(s, rnd, meldungen);

  // 16. Krisen
  krisenPruefen(s, rnd);

  // 17. Ereignisse für die nächste Runde
  s.runde += 1;
  s.geaendert = [];
  s.aktionenGenutzt = [];
  ereignisseZiehen(s, rnd);

  if (s.runde === END_RUNDE) {
    meldungen.push({ typ: 'system', text: 'Das Jahr 2100 ist erreicht. Zeit für eine Bilanz.' });
    s.flags.bilanz_faellig = 1;
  }

  // 18. Verlauf & Bericht
  verlaufAufzeichnen(s);
  const aenderungen = KERNWERTE.map((id) => ({ id, vorher: vorher[id], nachher: s.werte[id] })).filter((a) => {
    const m = WERTE[a.id];
    const schwelle = m.max - m.min > 50 ? 0.6 : 0.05;
    return Math.abs(a.nachher - a.vorher) >= schwelle;
  });
  const bericht: Bericht = { runde: s.runde, titel: datum(s.runde), aenderungen, meldungen };
  s.letzterBericht = bericht;
  if (s.chronik.length > 400) s.chronik = s.chronik.slice(-400);
  return bericht;
}

export function pkEinkommen(s: Spielstand): number {
  const w = s.werte;
  if (s.phase === 'opposition') return clamp(2 + w.bewusstsein / 25 + (w.zustimmung - 40) / 20, 1, 8);
  if (s.phase === 'regime') return clamp(1.5 + w.bewusstsein / 30 + w.unruhe / 40, 1, 7);
  const sys = SYSTEME[s.system];
  let e = sys.pkBasis - 1 + (w.zustimmung - 50) / 15 + (w.legitimitaet - 50) / 20;
  if (s.schwierigkeit === 'leicht') e += 1.5;
  if (s.schwierigkeit === 'schwer') e -= 0.8;
  return clamp(e, 1, 9);
}

function verlaufAufzeichnen(s: Spielstand) {
  const w: Partial<Record<WertId, number>> = {};
  for (const id of KERNWERTE) w[id] = Math.round(s.werte[id] * 100) / 100;
  s.verlauf.push({ r: s.runde, w });
}

// ───────────────────────── Wahlen ─────────────────────────

export interface Wahlprognose {
  spieler: number;
  rechte: number;
  extrem: number;
}

export function wahlprognose(s: Spielstand): Wahlprognose {
  const w = s.werte;
  let spieler = w.zustimmung + (s.flags.wahlkampf ?? 0) - w.techmacht * 0.05 - ((s.politik.medien ?? 1) === 0 ? 3 : 0) + (s.system === 'raete' ? 6 : 0);
  if (s.phase !== 'regierung') spieler += 3; // Oppositionsbonus: Regierungen nutzen sich ab
  spieler = clamp(spieler, 3, 85);
  const extrem = clamp(w.faschismus * 0.8, 0, 65);
  let rechte = 100 - spieler - extrem;
  if (rechte < 5) {
    const ueber = 5 - rechte;
    rechte = 5;
    spieler -= ueber / 2;
  }
  const summe = spieler + rechte + extrem;
  return { spieler: (spieler / summe) * 100, rechte: (rechte / summe) * 100, extrem: (extrem / summe) * 100 };
}

function wahlDurchfuehren(s: Spielstand, rnd: () => number, meldungen: Meldung[]) {
  const l = land(s);
  const p = wahlprognose(s);
  const spieler = clamp(p.spieler + (rnd() - 0.5) * 6, 1, 95);
  const extrem = p.extrem;
  const rechte = 100 - spieler - extrem;
  const gewonnen = spieler >= 45 || (spieler >= 35 && spieler > rechte && spieler > extrem);
  s.wahlergebnisse.push({ runde: s.runde + 1, spieler, rechte, extrem, gewonnen });
  delete s.flags.wahlkampf;
  const text = `Wahl: Linkes Bündnis ${formatZahl(spieler, 1)} %, Konservative ${formatZahl(rechte, 1)} %, Extreme Rechte ${formatZahl(extrem, 1)} %.`;

  if (s.phase === 'regierung') {
    if (gewonnen) {
      s.naechsteWahl = s.runde + 1 + l.wahlintervall;
      s.pk = clamp(s.pk + 6, 0, PK_MAX);
      meldungen.push({ typ: 'wahl', text: `🗳️ ${text} Du bleibst an der Regierung!` });
      s.chronik.push({ runde: s.runde + 1, text: `Wahlsieg mit ${formatZahl(spieler, 1)} %.`, typ: 'wahl' });
      s.ereignisse.unshift({ id: 'wahl_sieg', vars: { prozent: formatZahl(spieler, 1) } });
      if (spieler >= 55) wendeAn(s, { delta: { legitimitaet: 4 } });
    } else {
      machtVerlieren(s, extrem > rechte ? 'faschistisch' : 'rechtsregierung');
      meldungen.push({ typ: 'wahl', text: `🗳️ ${text} Du hast die Wahl verloren.` });
      s.chronik.push({ runde: s.runde + 1, text: `Wahlniederlage mit ${formatZahl(spieler, 1)} %.`, typ: 'wahl' });
      s.ereignisse.unshift({ id: extrem > rechte ? 'machtergreifung' : 'wahl_niederlage', vars: { prozent: formatZahl(spieler, 1) } });
    }
  } else if (s.phase === 'opposition') {
    if (gewonnen) {
      machtZurueck(s, s.spielerSystem);
      s.pk = clamp(s.pk + 8, 0, PK_MAX);
      meldungen.push({ typ: 'wahl', text: `🗳️ ${text} Du kehrst an die Regierung zurück!` });
      s.chronik.push({ runde: s.runde + 1, text: `Rückkehr an die Macht mit ${formatZahl(spieler, 1)} %.`, typ: 'wahl' });
      s.ereignisse.unshift({ id: 'rueckkehr', vars: { prozent: formatZahl(spieler, 1) } });
    } else if (extrem > rechte && extrem > spieler) {
      machtVerlieren(s, 'faschistisch');
      meldungen.push({ typ: 'wahl', text: `🗳️ ${text} Die extreme Rechte übernimmt die Macht.` });
      s.ereignisse.unshift({ id: 'machtergreifung' });
    } else {
      s.naechsteWahl = s.runde + 1 + l.wahlintervall;
      meldungen.push({ typ: 'wahl', text: `🗳️ ${text} Deine Bewegung bleibt in der Opposition.` });
    }
  }
}

function gegnerRegieren(s: Spielstand, rnd: () => number, meldungen: Meldung[]) {
  if ((s.flags.blockade ?? 0) > s.runde) return;
  const programm = GEGNER_PROGRAMM[s.system as keyof typeof GEGNER_PROGRAMM];
  if (!programm) return;
  const anzahl = s.phase === 'regime' ? 2 : 1;
  const chanceBlock = s.phase === 'opposition' ? clamp((s.werte.bewusstsein - 40) / 80, 0, 0.5) : 0;
  for (let i = 0; i < anzahl; i++) {
    if (rnd() < chanceBlock) {
      if (i === 0) meldungen.push({ typ: 'gut', text: 'Massiver Widerstand der Bewegung verhindert weitere Kürzungen – vorerst.' });
      continue;
    }
    const offen = Object.entries(programm).filter(([id, ziel]) => (s.politik[id] ?? 0) !== ziel);
    if (!offen.length) return;
    const [id, ziel] = offen[Math.floor(rnd() * offen.length)];
    const alt = s.politik[id];
    const neu = alt + Math.sign(ziel - alt);
    s.politik[id] = neu;
    const dial = POLITIK_MAP[id];
    const name = SYSTEME[s.system].name;
    meldungen.push({ typ: 'schlecht', text: `${name}: ${dial.name} → „${dial.stufen[neu].name}“` });
    s.chronik.push({ runde: s.runde, text: `${name} ändert ${dial.name}: ${dial.stufen[neu].name}.`, typ: 'schlecht' });
  }
}

// ───────────────────────── Krisen ─────────────────────────

export function putschRisiko(s: Spielstand): number {
  if (s.phase !== 'regierung') return 0;
  const w = s.werte;
  const loyal = s.fraktionen.militaer.loyalitaet;
  const sys = SYSTEME[s.system];
  const p =
    Math.max(0, (45 - loyal) / 45) *
    (w.militaermacht / 100) *
    (1 - sys.putschResistenz) *
    mod(s, 'putsch') *
    (1 + Math.max(0, w.unruhe - 40) / 60) *
    (s.beziehungen.westen < -40 ? 1.4 : 1) *
    schwierigkeitsFaktor(s) *
    0.18;
  return clamp(p, 0, 0.25);
}

function krisenPruefen(s: Spielstand, rnd: () => number) {
  if (s.phase !== 'regierung') return;
  const w = s.werte;
  const letzt = (id: string) => s.ereignisHistorie[id] ?? -999;
  if (s.runde - letzt('putsch') > 10 && rnd() < putschRisiko(s)) s.ereignisse.push({ id: 'putsch' });
  else if (w.legitimitaet < 22 && w.unruhe > 72 && s.runde - letzt('aufstand') > 8) s.ereignisse.push({ id: 'aufstand' });
}

// ───────────────────────── Politik ändern ─────────────────────────

export interface PolitikKosten {
  pk: number;
  moeglich: boolean;
  grund?: string;
  widerstand: { f: FraktionId; wert: number }[];
}

export function politikKosten(s: Spielstand, dialId: string, neu: number): PolitikKosten {
  const dial = POLITIK_MAP[dialId];
  const alt = s.politik[dialId] ?? 0;
  const st = dial?.stufen[neu];
  if (!dial || !st || neu === alt) return { pk: 0, moeglich: false, widerstand: [] };
  const sys = SYSTEME[s.system];
  const l = land(s);
  const delta = Math.abs(neu - alt);
  const basis = dial.kosten * Math.pow(delta, 1.15) * sys.kostenFaktor * l.reformFaktor * mod(s, 'reformKosten') * dialKostenMod(s, dialId);

  const hAlt = stufenHaltung(s, dialId, alt);
  const hNeu = stufenHaltung(s, dialId, neu);
  let widerstand = 0;
  let unterstuetzung = 0;
  const liste: { f: FraktionId; wert: number }[] = [];
  for (const f of FRAKTION_IDS) {
    const d = (hNeu[f] ?? 0) - (hAlt[f] ?? 0);
    if (!d) continue;
    const m = s.fraktionen[f].macht;
    if (d < 0) widerstand += (-d * m) / 2000;
    else unterstuetzung += (d * m) / 3200;
    liste.push({ f, wert: d });
  }
  let faktor = clamp(1 + widerstand - unterstuetzung * 0.5, 0.6, 2.6);
  if (sys.wahlen && s.werte.zustimmung < 45) faktor *= 1.2;
  const pk = Math.max(1, Math.round(basis * faktor));
  liste.sort((a, b) => Math.abs(b.wert) - Math.abs(a.wert));

  if (s.phase !== 'regierung') return { pk, moeglich: false, grund: 'Du regierst gerade nicht.', widerstand: liste };
  if (s.geaendert.includes(dialId)) return { pk, moeglich: false, grund: 'Diese Stellschraube wurde in dieser Runde schon verändert.', widerstand: liste };
  if (st.bedingung && !st.bedingung(s)) return { pk, moeglich: false, grund: st.bedingungText ?? 'Voraussetzung nicht erfüllt.', widerstand: liste };
  if (pk > s.pk) return { pk, moeglich: false, grund: `Nicht genug politisches Kapital (${pk} benötigt).`, widerstand: liste };
  return { pk, moeglich: true, widerstand: liste };
}

export function politikAendern(s: Spielstand, dialId: string, neu: number): string | null {
  const k = politikKosten(s, dialId, neu);
  if (!k.moeglich) return k.grund ?? 'Nicht möglich.';
  const dial = POLITIK_MAP[dialId];
  const alt = s.politik[dialId];
  s.pk -= k.pk;
  s.politik[dialId] = neu;
  s.geaendert.push(dialId);
  if (neu > alt) wendeAn(s, dial.stufen[neu].wechsel);
  const codex = dial.stufen[neu].codex;
  if (codex && !s.codex.includes(codex)) s.codex.push(codex);
  s.chronik.push({ runde: s.runde, text: `${dial.name}: ${dial.stufen[neu].name}.` });
  // Erfüllte Forderungen sofort belohnen
  return null;
}

// ───────────────────────── Projekte ─────────────────────────

export function projektMoeglich(s: Spielstand, projektId: string, regionId: string): string | null {
  const def = PROJEKT_MAP[projektId];
  const region = land(s).regionen.find((r) => r.id === regionId);
  if (!def || !region) return 'Unbekannt.';
  if (s.phase !== 'regierung') return 'Du regierst gerade nicht.';
  if (!def.regionen.includes(region.typ)) return 'In dieser Region nicht möglich.';
  if (s.projekte.some((p) => p.region === regionId)) return 'In dieser Region wird bereits gebaut.';
  const anzahl = s.fertig.filter((p) => p.id === projektId).length + s.projekte.filter((p) => p.id === projektId).length;
  if (def.max && anzahl >= def.max) return `Maximal ${def.max}× möglich.`;
  if (def.bedingung && !def.bedingung(s)) return def.bedingungText ?? 'Voraussetzung fehlt.';
  if (s.pk < def.pk) return `Benötigt ${def.pk} politisches Kapital.`;
  return null;
}

export function projektStarten(s: Spielstand, projektId: string, regionId: string): string | null {
  const fehler = projektMoeglich(s, projektId, regionId);
  if (fehler) return fehler;
  const def = PROJEKT_MAP[projektId];
  s.pk -= def.pk;
  s.projekte.push({ uid: s.naechsteUid++, id: projektId, region: regionId, fortschritt: 0 });
  return null;
}

// ───────────────────────── Systemwechsel ─────────────────────────

export function systemWechselMoeglich(s: Spielstand, id: SystemId): string | null {
  const sys = SYSTEME[id];
  if (!sys?.spielbar) return 'Nicht wählbar.';
  if (s.phase !== 'regierung') return 'Du regierst gerade nicht.';
  if (s.system === id) return 'Bereits aktiv.';
  if ((s.flags.system_sperre ?? 0) > s.runde) return 'Nach einem gescheiterten Referendum musst du warten.';
  if (sys.voraussetzung && !sys.voraussetzung(s)) return sys.voraussetzungText ?? 'Voraussetzungen nicht erfüllt.';
  if (s.pk < (sys.wechselKosten ?? 10)) return `Benötigt ${sys.wechselKosten} politisches Kapital.`;
  return null;
}

export function referendumChance(s: Spielstand): number {
  const w = s.werte;
  const x = (w.zustimmung - 50) / 7 + (w.legitimitaet - 50) / 18 + (w.bewusstsein - 40) / 25;
  return clamp(1 / (1 + Math.exp(-x)), 0.05, 0.95);
}

export function systemWechseln(s: Spielstand, id: SystemId): { erfolg: boolean; text: string } {
  const fehler = systemWechselMoeglich(s, id);
  if (fehler) return { erfolg: false, text: fehler };
  const sys = SYSTEME[id];
  const alt = SYSTEME[s.system];
  const rnd = zufall(s);
  s.pk -= sys.wechselKosten ?? 10;

  const zuDemokratie = sys.wahlen && !alt.wahlen;
  if (sys.weg === 'referendum' && !zuDemokratie) {
    const chance = referendumChance(s);
    if (rnd() > chance) {
      wendeAn(s, { delta: { legitimitaet: -5 }, fraktionen: { partei: -6 } });
      s.flags.system_sperre = s.runde + 6;
      s.chronik.push({ runde: s.runde, text: `Referendum über „${sys.name}“ gescheitert.`, typ: 'schlecht' });
      return { erfolg: false, text: `Das Referendum über die ${sys.name} ist gescheitert (Chance war ${Math.round(chance * 100)} %). Deine Legitimität leidet.` };
    }
  }

  let strafe = 1;
  if (!sys.wahlen) strafe = mod(s, 'autoritaerStrafe');
  if (sys.wechsel) {
    const w = sys.wechsel;
    wendeAn(s, {
      ...w,
      delta: w.delta ? Object.fromEntries(Object.entries(w.delta).map(([k, v]) => [k, (v ?? 0) * strafe])) : undefined,
    });
  }
  s.system = id;
  s.spielerSystem = id;
  if (sys.wahlen && !alt.wahlen) s.naechsteWahl = s.runde + 2;
  else if (sys.wahlen && s.naechsteWahl === null) s.naechsteWahl = s.runde + land(s).wahlintervall;
  if (!sys.wahlen) s.naechsteWahl = null;
  if (sys.codex && !s.codex.includes(sys.codex)) s.codex.push(sys.codex);
  s.chronik.push({ runde: s.runde, text: `Neues politisches System: ${sys.name}.`, typ: 'system' });
  const wie = sys.weg === 'referendum' ? (zuDemokratie ? 'Die Rückkehr zur Demokratie ist beschlossen – Neuwahlen folgen bald.' : 'Das Referendum war erfolgreich!') : sys.weg === 'notstand' ? 'Der Ausnahmezustand ist ausgerufen.' : 'Die Partei hat die alleinige Macht übernommen.';
  return { erfolg: true, text: `${wie} ${sys.name} ist jetzt das politische System.` };
}

// ───────────────────────── Fraktionen direkt ansprechen ─────────────────────────

export type FraktionsAktion = 'verhandeln' | 'einbinden' | 'unterdruecken';

export function fraktionsAktionKosten(s: Spielstand, f: FraktionId, art: FraktionsAktion): number {
  const m = s.fraktionen[f].macht;
  if (art === 'verhandeln') return Math.round(2 + m / 35);
  if (art === 'einbinden') return Math.round(5 + m / 25);
  return Math.round(3 + m / 30);
}

export function fraktionsAktionMoeglich(s: Spielstand, f: FraktionId, art: FraktionsAktion): string | null {
  if (s.phase === 'regime' && art !== 'verhandeln') return 'Im Untergrund nicht möglich.';
  if (s.phase === 'opposition' && art === 'unterdruecken') return 'In der Opposition nicht möglich.';
  const key = `fa_${art}_${f}`;
  const sperre = art === 'verhandeln' ? 4 : art === 'einbinden' ? 10 : 6;
  if (s.runde - (s.flags[key] ?? -999) < sperre) return `Erst wieder in ${sperre - (s.runde - (s.flags[key] ?? 0))} Runden möglich.`;
  if (art === 'unterdruecken') {
    const repressiv = s.system === 'staatssozialismus' || s.system === 'autoritaer' || (s.politik.sicherheit ?? 2) <= 1;
    if (!repressiv) return 'Nur mit repressivem Sicherheitsapparat oder autoritärem System möglich.';
  }
  if (s.pk < fraktionsAktionKosten(s, f, art)) return 'Nicht genug politisches Kapital.';
  return null;
}

export function fraktionsAktion(s: Spielstand, f: FraktionId, art: FraktionsAktion): string {
  const fehler = fraktionsAktionMoeglich(s, f, art);
  if (fehler) return fehler;
  s.pk -= fraktionsAktionKosten(s, f, art);
  s.flags[`fa_${art}_${f}`] = s.runde;
  const name = FRAKTIONEN[f].kurz;
  if (art === 'verhandeln') {
    wendeAn(s, { fraktionen: { [f]: 7 } });
    return `Gespräche mit ${name}: Man fühlt sich gehört. Loyalität +7.`;
  }
  if (art === 'einbinden') {
    wendeAn(s, { fraktionen: { [f]: 14, partei: -4 } });
    return `Eine Person aus den Reihen von ${name} wird Teil der Regierung. Loyalität +14, deine Partei murrt.`;
  }
  wendeAn(s, { fraktionen: { [f]: -25 }, macht: { [f]: -12 }, delta: { buergerrechte: -4, legitimitaet: -3, unruhe: 4 } });
  return `${name} werden mit staatlicher Gewalt eingeschüchtert. Ihre Macht sinkt – ihr Hass wächst. Bürgerrechte und Legitimität leiden.`;
}

// ───────────────────────── Hilfen für die Oberfläche ─────────────────────────

export function aktuelleZielwerte(s: Spielstand) {
  return zielwerte(s);
}

export function wirkungDerStufe(dialId: string, stufe: number) {
  return POLITIK_MAP[dialId]?.stufen[stufe]?.effekte;
}

export function stellschraubenAnzahl() {
  return POLITIK.length;
}

// ───────────────────────── Aktionen ─────────────────────────

export function aktionMoeglich(s: Spielstand, id: string): string | null {
  const a = AKTION_MAP[id];
  if (!a) return 'Unbekannt.';
  if (!a.phase.includes(s.phase)) return 'In dieser Lage nicht möglich.';
  const letzt = s.flags[`akt_${id}`];
  if (letzt !== undefined && a.wiederholung && s.runde - letzt < a.wiederholung)
    return `Erst wieder in ${a.wiederholung - (s.runde - letzt)} Runde(n) möglich.`;
  if (a.bedingung && !a.bedingung(s)) return a.bedingungText ?? 'Voraussetzung fehlt.';
  if (s.pk < a.pk) return `Benötigt ${a.pk} politisches Kapital.`;
  return null;
}

export function aktionAusfuehren(s: Spielstand, id: string): string {
  const fehler = aktionMoeglich(s, id);
  if (fehler) return fehler;
  const a = AKTION_MAP[id];
  s.pk -= a.pk;
  s.flags[`akt_${id}`] = s.runde;
  const text = a.ausfuehren(s, zufall(s));
  s.chronik.push({ runde: s.runde, text: `${a.name}.` });
  return text;
}
