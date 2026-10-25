import type {
  BlockId,
  Effekte,
  FraktionId,
  RegionTyp,
  Spielstand,
  SystemId,
  WertId,
} from '../sim/types';

export type Pruefung = (s: Spielstand) => boolean;

export interface WertMeta {
  name: string;
  einheit: string;
  gut: 1 | -1 | 0; // Richtung, in die der Wert "gut" ist
  min: number;
  max: number;
  dez: number;
  text: string;
  kategorie: 'wirtschaft' | 'umwelt' | 'gesellschaft' | 'staat' | 'welt';
}

export interface FraktionDef {
  id: FraktionId;
  name: string;
  kurz: string;
  icon: string;
  farbe: string;
  text: string;
  /** Wie stark der Zustand des Landes die Loyalität beeinflusst (Gewicht je Werteinheit). */
  anliegen: Partial<Record<WertId, number>>;
  /** Wofür sich die Fraktion besonders interessiert – für Tooltips. */
  wuensche: string;
}

export interface BlockDef {
  id: BlockId;
  name: string;
  icon: string;
  text: string;
}

export interface Stufe {
  name: string;
  text: string;
  effekte: Effekte;
  /** Einmalige Effekte, wenn auf diese Stufe gewechselt wird (von niedrigerer Stufe). */
  wechsel?: Effekte;
  bedingung?: Pruefung;
  bedingungText?: string;
  codex?: string;
}

export interface Stellschraube {
  id: string;
  sektor: string;
  name: string;
  text: string;
  kosten: number;
  stufen: Stufe[];
}

export interface Sektor {
  id: string;
  name: string;
  icon: string;
  text: string;
}

export interface SystemDef {
  id: SystemId;
  name: string;
  kurz: string;
  icon: string;
  text: string;
  staerken: string[];
  schwaechen: string[];
  wahlen: boolean;
  pkBasis: number;
  kostenFaktor: number; // Faktor auf Reformkosten (Entscheidungsgeschwindigkeit)
  infoQualitaet: number; // 0–1, wie genau die angezeigten Statistiken sind
  putschResistenz: number; // 0–1
  effekte: Effekte;
  spielbar: boolean;
  /** Voraussetzungen für den Wechsel in dieses System. */
  voraussetzung?: Pruefung;
  voraussetzungText?: string;
  weg?: 'referendum' | 'machtuebernahme' | 'notstand';
  wechselKosten?: number;
  wechsel?: Effekte;
  codex?: string;
}

export interface MerkmalDef {
  id: string;
  name: string;
  icon: string;
  text: string;
  effekte: Effekte;
  mods?: {
    putsch?: number;
    reformKosten?: number;
    kulturWiderstand?: number;
    autoritaerStrafe?: number;
    kapitalflucht?: number;
    sanktionen?: number;
    klimaSchaden?: number;
    strukturwandel?: number;
    migrationNutzen?: number;
    rohstoffe?: number;
    raten?: Partial<Record<WertId, number>>;
    dialKosten?: Record<string, number>;
  };
}

export interface TechDef {
  id: string;
  name: string;
  icon: string;
  text: string;
  kosten: number; // Forschungspunkte
  jahr: number; // frühestes Jahr
  effekte: Effekte;
  gefahr?: string; // Hinweis auf Risiken
  codex?: string;
}

export interface ProjektDef {
  id: string;
  name: string;
  icon: string;
  text: string;
  regionen: RegionTyp[];
  dauer: number; // Runden
  kosten: number; // % BIP pro Jahr während des Baus
  pk: number;
  effekte: Effekte;
  bedingung?: Pruefung;
  bedingungText?: string;
  modell: string;
  max?: number; // maximale Anzahl landesweit
  codex?: string;
}

export interface RegionDef {
  id: string;
  name: string;
  typ: RegionTyp;
  x: number; // -1..1
  y: number; // -1..1
}

export interface LandForm {
  typ: 'kompakt' | 'lang' | 'inseln' | 'dreieck' | 'breit';
  rotation?: number;
  seed?: number;
}

export interface LandDef {
  id: string;
  name: string;
  flagge: string;
  hauptstadt: string;
  bevoelkerung: number; // Millionen
  schwierigkeit: number; // 1–5
  kurz: string;
  szenario: string[];
  system: SystemId;
  wahlintervall: number; // Runden (Halbjahre)
  potenzial: number; // Grundwachstum % p.a.
  klimaVerwundbarkeit: number; // 0–2
  reformFaktor: number; // Vetopunkte, Föderalismus …
  start: Werte0;
  politik: Record<string, number>;
  fraktionen: Record<FraktionId, { anteil: number; macht: number; loyalitaet: number }>;
  beziehungen: Record<BlockId, number>;
  handel: Record<BlockId, number>; // Handelsabhängigkeit 0–1
  merkmale: string[];
  regionen: RegionDef[];
  form: LandForm;
  tags: string[];
  farben?: { land?: string };
}

/** Startwerte – Welt- und abgeleitete Werte werden automatisch gesetzt. */
export type Werte0 = Omit<
  Record<WertId, number>,
  | 'temperatur'
  | 'weltemissionen'
  | 'weltklima'
  | 'weltbewegung'
  | 'sanktionen'
  | 'lebensqualitaet'
  | 'zustimmung'
  | 'wachstum'
  | 'co2'
> & { co2: number };

export interface EreignisOption {
  text: string;
  hinweis?: string; // kurze Erklärung der Folgen
  effekte?: Effekte;
  modifikator?: { name: string; runden: number; effekte: Effekte; gut?: boolean; text?: string };
  folge?: { id: string; in: number };
  bedingung?: Pruefung;
  bedingungText?: string;
  ergebnis?: string;
  codex?: string;
  /** Erlaubt komplexe Folgen, z. B. Zufall oder Phasenwechsel. */
  aktion?: (s: Spielstand, rnd: () => number) => string | void;
  pkKosten?: number;
}

export interface EreignisDef {
  id: string;
  titel: string;
  text: string;
  bild: string; // Emoji
  kategorie:
    | 'wirtschaft'
    | 'umwelt'
    | 'gesellschaft'
    | 'politik'
    | 'welt'
    | 'technik'
    | 'krise'
    | 'fraktion'
    | 'land';
  wenn?: Pruefung;
  gewicht?: number | ((s: Spielstand) => number);
  einmalig?: boolean;
  abstand?: number; // Mindestabstand in Runden bis zur Wiederholung
  jahr?: [number, number];
  laender?: string[];
  phasen?: ('regierung' | 'opposition' | 'regime')[];
  fraktion?: FraktionId; // Protest/Unterstützungs-Ereignis einer Fraktion
  art?: 'protest' | 'unterstuetzung';
  optionen: EreignisOption[];
  codex?: string;
}

export interface CodexEintrag {
  id: string;
  titel: string;
  kategorie: string;
  text: string[];
  quellen?: string[];
}

export interface ErfolgDef {
  id: string;
  name: string;
  icon: string;
  text: string;
  pruef: Pruefung;
}

export interface AktionDef {
  id: string;
  name: string;
  icon: string;
  text: string;
  phase: ('regierung' | 'opposition' | 'regime')[];
  pk: number;
  kategorie: 'innen' | 'aussen' | 'bewegung';
  bedingung?: Pruefung;
  bedingungText?: string;
  wiederholung?: number; // Mindestabstand in Runden
  ausfuehren: (s: Spielstand, rnd: () => number) => string;
}
