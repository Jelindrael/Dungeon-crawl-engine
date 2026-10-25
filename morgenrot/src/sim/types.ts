// Zentrale Typen der Simulation. Die Simulation ist reines TypeScript ohne DOM,
// damit sie testbar ist und unabhängig vom Rendering läuft.

export type FraktionId =
  | 'arbeiter'
  | 'klima'
  | 'partei'
  | 'land'
  | 'mittelstand'
  | 'kapital'
  | 'tech'
  | 'militaer'
  | 'religion'
  | 'feministisch'
  | 'minderheiten'
  | 'wissenschaft';

export type BlockId = 'westen' | 'china' | 'sueden' | 'maerkte';

export type SystemId =
  | 'parlamentarisch'
  | 'praesidial'
  | 'partizipativ'
  | 'raete'
  | 'staatssozialismus'
  | 'autoritaer'
  // Systeme, in denen der Spieler nicht regiert:
  | 'rechtsregierung'
  | 'faschistisch'
  | 'junta';

export type Phase = 'regierung' | 'opposition' | 'regime';

export type RegionTyp = 'metropole' | 'industrie' | 'agrar' | 'kueste' | 'wald' | 'berge' | 'bergbau';

export type Schwierigkeit = 'leicht' | 'normal' | 'schwer';

export interface Werte {
  // Wirtschaft
  bip: number; // BIP pro Kopf, Tsd. $ (Kaufkraft)
  wachstum: number; // % pro Jahr
  arbeitslosigkeit: number; // %
  inflation: number; // %
  schulden: number; // % des BIP
  defizit: number; // % des BIP pro Jahr (negativ = Überschuss)
  steuerquote: number; // Staatseinnahmen in % des BIP
  ungleichheit: number; // Gini 0–100
  gemeineigentum: number; // % der Wirtschaft in öffentlicher/genossenschaftlicher Hand
  betriebsdemokratie: number; // 0–100
  kapitalflucht: number; // 0–100
  informell: number; // % informelle Wirtschaft
  arbeitszeit: number; // Stunden pro Woche
  // Energie & Umwelt
  erneuerbar: number; // % am Energieverbrauch
  kernkraft: number; // % am Energieverbrauch
  effizienz: number; // 0–60, Einsparung durch Effizienz & Suffizienz
  co2: number; // t pro Kopf und Jahr
  natur: number; // Biodiversität 0–100
  verschmutzung: number; // 0–100
  anpassung: number; // Klimaanpassung 0–100
  // Gesellschaft
  gesundheit: number;
  bildung: number;
  wohnen: number;
  lebensqualitaet: number;
  frauenrechte: number;
  minderheitenrechte: number;
  pressefreiheit: number;
  buergerrechte: number;
  integration: number;
  zuwanderung: number; // Netto-Zuwanderung ‰ pro Jahr
  bewusstsein: number; // Solidarität & Klassenbewusstsein
  unruhe: number;
  faschismus: number; // Stärke der extremen Rechten
  // Staat
  zustimmung: number;
  legitimitaet: number;
  partizipation: number;
  ueberwachung: number;
  korruption: number;
  buerokratie: number;
  techmacht: number; // Macht der Tech-Oligarchie
  militaermacht: number; // Eigenständige Macht des Militärs
  // Welt
  temperatur: number; // °C über vorindustriell (global)
  weltemissionen: number; // Index, 2026 = 100
  weltklima: number; // Globaler Klimaschutz-Wille 0–100
  weltbewegung: number; // Globale progressive Welle 0–100
  sanktionen: number; // 0–100
}

export type WertId = keyof Werte;

/** Effekte – Bedeutung hängt vom Kontext ab:
 *  - Politik-Stufen, Projekte, Systeme, Merkmale, Technologien: dauerhafte Beiträge
 *    (ziele = Zielwert-Beitrag, fraktionen = Loyalitäts-Ziel, beziehungen = Ziel).
 *  - Ereignis-Optionen & einmalige Wechsel-Effekte: sofortige Änderungen
 *    (delta = Sprung, fraktionen = Loyalitäts-Sprung, beziehungen = Sprung).
 */
export interface Effekte {
  ziele?: Partial<Record<WertId, number>>;
  delta?: Partial<Record<WertId, number>>;
  wachstum?: number; // Beitrag zum Wachstum (%-Punkte p.a.)
  haushalt?: number; // Ausgaben in % des BIP p.a. (negativ = Einnahmen)
  fraktionen?: Partial<Record<FraktionId, number>>;
  macht?: Partial<Record<FraktionId, number>>;
  beziehungen?: Partial<Record<BlockId, number>>;
  pk?: number;
  schuldenEinmalig?: number; // einmalige Änderung der Schulden in % BIP
  flags?: Record<string, number>;
}

export interface Modifikator {
  id: string;
  name: string;
  text?: string;
  runden: number; // verbleibende Runden
  effekte: Effekte; // ziele/wachstum/haushalt dauerhaft während Laufzeit, delta jede Runde
  gut?: boolean;
}

export interface Forderung {
  id: string;
  fraktion: FraktionId;
  politik: string; // Stellschraube
  stufe: number; // geforderte Stufe
  richtung: 'min' | 'max'; // mindestens / höchstens diese Stufe
  frist: number; // Runde, bis zu der erfüllt werden muss
  belohnung: number;
  strafe: number;
}

export interface LaufendesProjekt {
  uid: number;
  id: string;
  region: string;
  fortschritt: number; // Runden bereits gebaut
}

export interface FertigesProjekt {
  uid: number;
  id: string;
  region: string;
  runde: number;
}

export interface FraktionsZustand {
  loyalitaet: number; // 0–100
  macht: number; // 0–100
  anteil: number; // Bevölkerungsanteil (Gewicht für Zustimmung)
}

export interface Bericht {
  runde: number;
  titel: string;
  aenderungen: { id: WertId; vorher: number; nachher: number }[];
  meldungen: Meldung[];
}

export interface Meldung {
  typ: 'gut' | 'schlecht' | 'neutral' | 'wahl' | 'forderung' | 'projekt' | 'technik' | 'system';
  text: string;
}

export interface Verlaufspunkt {
  r: number;
  w: Partial<Record<WertId, number>>;
}

export interface OffenesEreignis {
  id: string;
  quelle?: FraktionId;
  vars?: Record<string, string>;
}

export interface ChronikEintrag {
  runde: number;
  text: string;
  typ?: Meldung['typ'];
}

export interface Spielstand {
  version: number;
  seed: number;
  rng: number; // Zustand des Zufallsgenerators
  land: string;
  schwierigkeit: Schwierigkeit;
  runde: number; // 0 = 1. Halbjahr 2026
  phase: Phase;
  system: SystemId;
  spielerSystem: SystemId; // letztes eigenes System (für Rückkehr)
  werte: Werte;
  offsets: Partial<Record<WertId, number>>;
  fraktionen: Record<FraktionId, FraktionsZustand>;
  fraktionOffsets: Record<FraktionId, number>;
  beziehungen: Record<BlockId, number>;
  beziehungOffsets: Record<BlockId, number>;
  politik: Record<string, number>;
  programm: Record<string, number>; // eigenes Programm (in der Opposition)
  geaendert: string[]; // in dieser Runde geänderte Stellschrauben
  pk: number;
  forschung: number;
  technologien: string[];
  modifikatoren: Modifikator[];
  projekte: LaufendesProjekt[];
  fertig: FertigesProjekt[];
  naechsteUid: number;
  forderungen: Forderung[];
  ereignisse: OffenesEreignis[];
  ereignisHistorie: Record<string, number>; // id -> letzte Runde
  geplanteEreignisse: { id: string; runde: number }[];
  flags: Record<string, number>;
  naechsteWahl: number | null;
  widerstand: number; // in Regime-Phase
  aktionenGenutzt: string[]; // diese Runde
  verlauf: Verlaufspunkt[];
  chronik: ChronikEintrag[];
  codex: string[];
  berichte: Bericht[];
  letzterBericht: Bericht | null;
  /** Kalibrierungs- und Ausgangswerte (vom Spielstart). */
  basis: {
    bip: number;
    co2: number;
    fossil: number;
    effizienz: number;
    ausgaben: number;
    wachstumStatisch: number;
    haushaltStatisch: number;
    lebensqualitaet: number;
    werte: Werte;
  };
  /** Dauerhafte Zielwert-Boni aus Ereignissen und Aktionen. */
  bonus: Partial<Record<WertId, number>>;
  machtBonus: Partial<Record<FraktionId, number>>;
  anliegenBasis: Partial<Record<FraktionId, number>>;
  /** Gewöhnung: Menschen gewöhnen sich an Verbesserungen, Erwartungen steigen. */
  anliegenRef: Partial<Record<FraktionId, number>>;
  anliegenStart: Partial<Record<FraktionId, number>>;
  amtszeit: number; // Runden an der Regierung seit dem letzten Machtwechsel
  weltRest: number;
  strukturwandel: number; // aktueller Strukturwandel-Schock auf Arbeitslosigkeit
  wahlergebnisse: { runde: number; spieler: number; rechte: number; extrem: number; gewonnen: boolean }[];
  erfolgeLauf: string[];
  beendet: boolean; // 2100 erreicht & Bilanz gesehen
}
