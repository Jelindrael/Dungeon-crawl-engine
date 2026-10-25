// Einmalige Aktionen, die der Spieler jederzeit (gegen politisches Kapital) ausführen kann.
import { wendeAn } from '../sim/effekte';
import type { Spielstand } from '../sim/types';
import { clamp } from '../sim/util';
import type { AktionDef } from './schema';

const widerstand = (s: Spielstand, v: number) => {
  s.widerstand = clamp(s.widerstand + v, 0, 100);
};

export const AKTIONEN: AktionDef[] = [
  // ───── Regierung: Innenpolitik ─────
  {
    id: 'rede',
    name: 'Rede an die Nation',
    icon: '🎙️',
    text: 'Eine große Fernsehansprache erklärt deine Politik und beruhigt die Gemüter.',
    phase: ['regierung'],
    pk: 3,
    kategorie: 'innen',
    wiederholung: 4,
    ausfuehren: (s) => {
      wendeAn(s, { delta: { legitimitaet: 3, unruhe: -4 }, fraktionen: { partei: 2, mittelstand: 2, religion: 2 } });
      return 'Millionen sehen zu. Deine Worte erreichen auch Menschen, die dir skeptisch gegenüberstehen.';
    },
  },
  {
    id: 'bildungskampagne',
    name: 'Aufklärungskampagne',
    icon: '📚',
    text: 'Politische Bildung in Schulen, Betrieben und Medien: Wie funktioniert unsere Wirtschaft? Wem nützt sie?',
    phase: ['regierung'],
    pk: 4,
    kategorie: 'innen',
    wiederholung: 6,
    ausfuehren: (s) => {
      wendeAn(s, { delta: { bewusstsein: 3, faschismus: -2 }, ziele: { bewusstsein: 0.5 }, schuldenEinmalig: 0.2 });
      return 'Volkshochschulen, Podcasts und Betriebsversammlungen – die Menschen diskutieren über Wirtschaft und Demokratie.';
    },
  },
  {
    id: 'faktencheck',
    name: 'Offensive gegen Desinformation',
    icon: '🔍',
    text: 'Unabhängige Faktenchecks, Medienkompetenz und Transparenzpflichten für Plattformen.',
    phase: ['regierung'],
    pk: 3,
    kategorie: 'innen',
    wiederholung: 6,
    ausfuehren: (s) => {
      wendeAn(s, { delta: { techmacht: -3, faschismus: -2 }, fraktionen: { tech: -4, wissenschaft: 3 } });
      return 'Lügen verbreiten sich langsamer, wenn viele sie erkennen.';
    },
  },
  {
    id: 'investitionsprogramm',
    name: 'Investitionsprogramm',
    icon: '🏗️',
    text: 'Ein kreditfinanziertes Programm für Schienen, Schulen, Netze und Wohnungen.',
    phase: ['regierung'],
    pk: 4,
    kategorie: 'innen',
    wiederholung: 8,
    ausfuehren: (s) => {
      s.modifikatoren.push({
        id: `invest_${s.runde}`,
        name: 'Investitionsprogramm',
        runden: 6,
        effekte: { haushalt: 2, wachstum: 0.8, ziele: { arbeitslosigkeit: -1, anpassung: 1 } },
        gut: true,
      });
      return 'Bagger rollen im ganzen Land. Die Schulden steigen – aber auch Wachstum und Beschäftigung.';
    },
  },
  {
    id: 'sparprogramm',
    name: 'Sparprogramm',
    icon: '✂️',
    text: 'Ausgaben werden gekürzt, um das Defizit zu senken und die Finanzmärkte zu beruhigen.',
    phase: ['regierung'],
    pk: 3,
    kategorie: 'innen',
    wiederholung: 8,
    ausfuehren: (s) => {
      s.modifikatoren.push({
        id: `spar_${s.runde}`,
        name: 'Sparprogramm',
        runden: 6,
        effekte: { haushalt: -2, wachstum: -0.4, ziele: { unruhe: 3 } },
      });
      wendeAn(s, { beziehungen: { maerkte: 10 }, fraktionen: { arbeiter: -5, partei: -4, mittelstand: 2 } });
      return 'Die Märkte sind zufrieden. Deine Basis weniger.';
    },
  },
  {
    id: 'neuwahl',
    name: 'Vorgezogene Neuwahl',
    icon: '🗳️',
    text: 'Wenn du populär bist, kannst du dir ein frisches Mandat holen. Wenn nicht, riskierst du alles.',
    phase: ['regierung'],
    pk: 4,
    kategorie: 'innen',
    bedingung: (s) => s.naechsteWahl !== null && s.naechsteWahl - s.runde > 3,
    bedingungText: 'Nur in Systemen mit Wahlen und nicht kurz vor einer regulären Wahl.',
    ausfuehren: (s) => {
      s.naechsteWahl = s.runde + 1;
      return 'Das Parlament wird aufgelöst. In einem halben Jahr wird gewählt.';
    },
  },
  // ───── Regierung: Außenpolitik ─────
  {
    id: 'handel_westen',
    name: 'Handelsabkommen mit dem Westen',
    icon: '🦅',
    text: 'Verhandlungen über Zölle, Investitionen und Standards.',
    phase: ['regierung'],
    pk: 4,
    kategorie: 'aussen',
    wiederholung: 8,
    ausfuehren: (s) => {
      wendeAn(s, { beziehungen: { westen: 10, maerkte: 4 }, fraktionen: { kapital: 3 } });
      return 'Ein Abkommen wird unterzeichnet. Die Beziehungen entspannen sich.';
    },
  },
  {
    id: 'handel_china',
    name: 'Partnerschaft mit China',
    icon: '🐉',
    text: 'Investitionen in Infrastruktur und Solarindustrie, Zugang zu Märkten.',
    phase: ['regierung'],
    pk: 4,
    kategorie: 'aussen',
    wiederholung: 8,
    ausfuehren: (s) => {
      wendeAn(s, { beziehungen: { china: 12, westen: -4 } });
      return 'Peking zeigt sich interessiert. Washington beobachtet misstrauisch.';
    },
  },
  {
    id: 'sued_allianz',
    name: 'Süd-Süd-Gipfel',
    icon: '🌍',
    text: 'Ein Treffen mit Regierungen aus Afrika, Asien und Lateinamerika – für eine gerechtere Weltordnung.',
    phase: ['regierung'],
    pk: 4,
    kategorie: 'aussen',
    wiederholung: 8,
    ausfuehren: (s) => {
      wendeAn(s, { beziehungen: { sueden: 12 }, delta: { weltbewegung: 2 } });
      return 'Eine neue Allianz der Länder des Südens nimmt Gestalt an.';
    },
  },
  {
    id: 'klimagipfel_ausrichten',
    name: 'Klimagipfel ausrichten',
    icon: '🌐',
    text: 'Dein Land lädt die Welt ein, um ehrgeizigere Klimaziele zu verhandeln.',
    phase: ['regierung'],
    pk: 5,
    kategorie: 'aussen',
    wiederholung: 10,
    ausfuehren: (s) => {
      const vorbild = s.werte.co2 < s.basis.co2 * 0.8 ? 2 : 0;
      wendeAn(s, { delta: { weltklima: 3 + vorbild }, beziehungen: { sueden: 6 }, fraktionen: { klima: 4 }, schuldenEinmalig: 0.2 });
      return vorbild ? 'Weil dein Land mit gutem Beispiel vorangeht, hören dir alle zu. Ein ehrgeiziges Abkommen wird beschlossen.' : 'Der Gipfel bringt Fortschritte – aber die anderen fragen, was dein Land selbst tut.';
    },
  },
  {
    id: 'internationale',
    name: 'Konferenz progressiver Kräfte',
    icon: '🌹',
    text: 'Bewegungen, Gewerkschaften und linke Parteien aus aller Welt treffen sich in deinem Land.',
    phase: ['regierung'],
    pk: 5,
    kategorie: 'aussen',
    wiederholung: 10,
    ausfuehren: (s) => {
      wendeAn(s, { delta: { weltbewegung: 5, bewusstsein: 1 }, beziehungen: { westen: -4, sueden: 4 }, fraktionen: { partei: 3 } });
      return 'Eine neue Internationale entsteht: vernetzt, vielfältig und entschlossen.';
    },
  },
  {
    id: 'schulden_verhandeln',
    name: 'Mit Gläubigern verhandeln',
    icon: '🤝',
    text: 'Gespräche mit Finanzmärkten und Ratingagenturen, um das Vertrauen zu stärken.',
    phase: ['regierung'],
    pk: 3,
    kategorie: 'aussen',
    wiederholung: 6,
    ausfuehren: (s) => {
      wendeAn(s, { beziehungen: { maerkte: 10 }, delta: { kapitalflucht: -3 } });
      return 'Die Märkte beruhigen sich etwas.';
    },
  },
  // ───── Opposition: Bewegung ─────
  {
    id: 'demo',
    name: 'Massendemonstration',
    icon: '📣',
    text: 'Hunderttausende auf die Straße bringen.',
    phase: ['opposition'],
    pk: 2,
    kategorie: 'bewegung',
    wiederholung: 2,
    ausfuehren: (s) => {
      wendeAn(s, { delta: { bewusstsein: 2, unruhe: 4 }, fraktionen: { arbeiter: 2, klima: 3, feministisch: 2, minderheiten: 2 } });
      return 'Die Straßen sind voll. Die Regierung spürt den Druck.';
    },
  },
  {
    id: 'generalstreik',
    name: 'Generalstreik',
    icon: '✊',
    text: 'Das Land lahmlegen, um weitere Rückschritte zu verhindern.',
    phase: ['opposition'],
    pk: 5,
    kategorie: 'bewegung',
    wiederholung: 6,
    bedingung: (s) => s.fraktionen.arbeiter.loyalitaet >= 55,
    bedingungText: 'Die Arbeiterschaft muss hinter dir stehen (Loyalität ≥ 55).',
    ausfuehren: (s) => {
      s.flags.blockade = s.runde + 3;
      wendeAn(s, { delta: { unruhe: 12, bewusstsein: 4 }, fraktionen: { arbeiter: 5, mittelstand: -3 } });
      s.modifikatoren.push({ id: `gs_${s.runde}`, name: 'Generalstreik', runden: 1, effekte: { wachstum: -1.5 } });
      return 'Nichts geht mehr. Die Regierung legt ihre Rückbaupläne vorerst auf Eis.';
    },
  },
  {
    id: 'genossenschaften_gruenden',
    name: 'Genossenschaften gründen',
    icon: '🤝',
    text: 'Was die Regierung privatisiert, bauen wir selbst auf – als Genossenschaft.',
    phase: ['opposition', 'regierung'],
    pk: 3,
    kategorie: 'bewegung',
    wiederholung: 4,
    ausfuehren: (s) => {
      wendeAn(s, { ziele: { gemeineigentum: 1.5, betriebsdemokratie: 2 }, delta: { bewusstsein: 1 }, fraktionen: { arbeiter: 2, mittelstand: 1 } });
      return 'Neue Genossenschaften entstehen: Bäckereien, Wohnprojekte, Energiekooperativen.';
    },
  },
  {
    id: 'gegenoeffentlichkeit',
    name: 'Gegenöffentlichkeit aufbauen',
    icon: '📻',
    text: 'Eigene Medien, Podcasts, Zeitungen und Netzwerke.',
    phase: ['opposition'],
    pk: 3,
    kategorie: 'bewegung',
    wiederholung: 4,
    ausfuehren: (s) => {
      wendeAn(s, { delta: { bewusstsein: 2, techmacht: -2 }, fraktionen: { wissenschaft: 2 } });
      return 'Eure Stimme erreicht Menschen jenseits der Konzernmedien.';
    },
  },
  {
    id: 'buendnis',
    name: 'Breites Bündnis schmieden',
    icon: '🌈',
    text: 'Gemeinsam mit Kirchen, Mittelstand, Wissenschaft und Bürgerrechtsgruppen.',
    phase: ['opposition'],
    pk: 4,
    kategorie: 'bewegung',
    wiederholung: 6,
    ausfuehren: (s) => {
      wendeAn(s, { fraktionen: { mittelstand: 5, religion: 5, wissenschaft: 5, feministisch: 3, minderheiten: 3 } });
      return 'Ein Bündnis, das weit über die eigene Basis hinausreicht.';
    },
  },
  {
    id: 'antifa',
    name: 'Antifaschistische Netzwerke',
    icon: '🛡️',
    text: 'Aufklärung, Nachbarschaftsschutz und Gegenproteste gegen die extreme Rechte.',
    phase: ['opposition', 'regierung'],
    pk: 3,
    kategorie: 'bewegung',
    wiederholung: 4,
    ausfuehren: (s) => {
      wendeAn(s, { delta: { faschismus: -3, unruhe: 1 }, fraktionen: { minderheiten: 3 } });
      return 'Wo die Rechte aufmarschiert, sind mehr Menschen dagegen.';
    },
  },
  {
    id: 'wahlkampf_opp',
    name: 'Wahlkampf',
    icon: '🗳️',
    text: 'Von Tür zu Tür – für die nächste Wahl.',
    phase: ['opposition'],
    pk: 3,
    kategorie: 'bewegung',
    wiederholung: 2,
    bedingung: (s) => s.naechsteWahl !== null && s.naechsteWahl - s.runde <= 3,
    bedingungText: 'Nur kurz vor einer Wahl.',
    ausfuehren: (s) => {
      s.flags.wahlkampf = (s.flags.wahlkampf ?? 0) + 3;
      return 'Freiwillige klingeln an Millionen Türen.';
    },
  },
  // ───── Regime: Widerstand ─────
  {
    id: 'untergrund',
    name: 'Untergrundnetzwerk',
    icon: '🕸️',
    text: 'Geheime Zellen in Betrieben, Universitäten und Gemeinden aufbauen.',
    phase: ['regime'],
    pk: 3,
    kategorie: 'bewegung',
    wiederholung: 1,
    ausfuehren: (s) => {
      widerstand(s, 7);
      wendeAn(s, { delta: { bewusstsein: 1 } });
      return 'Das Netzwerk wächst – im Verborgenen.';
    },
  },
  {
    id: 'massenprotest',
    name: 'Massenproteste',
    icon: '🔥',
    text: 'Gefährlich – aber nur so wankt ein Regime.',
    phase: ['regime'],
    pk: 4,
    kategorie: 'bewegung',
    wiederholung: 2,
    ausfuehren: (s, rnd) => {
      const bonus = s.werte.unruhe > 50 ? 6 : 0;
      widerstand(s, 9 + bonus);
      wendeAn(s, { delta: { unruhe: 8, bewusstsein: 3 } });
      if (rnd() < 0.3) {
        widerstand(s, -5);
        return 'Das Regime schlägt brutal zurück. Viele werden verhaftet. Doch die Wut wächst.';
      }
      return 'Hunderttausende trotzen der Angst.';
    },
  },
  {
    id: 'exil',
    name: 'Internationale Kampagne',
    icon: '🌐',
    text: 'Aus dem Exil internationalen Druck auf das Regime organisieren.',
    phase: ['regime'],
    pk: 3,
    kategorie: 'bewegung',
    wiederholung: 3,
    ausfuehren: (s) => {
      widerstand(s, 5);
      wendeAn(s, { delta: { sanktionen: 6, weltbewegung: 1 } });
      return 'Die Welt schaut hin. Das Regime wird isoliert.';
    },
  },
  {
    id: 'soldaten',
    name: 'Soldaten überzeugen',
    icon: '🎖️',
    text: 'Kontakt zu Offizieren, die an der Diktatur zweifeln.',
    phase: ['regime'],
    pk: 5,
    kategorie: 'bewegung',
    wiederholung: 4,
    ausfuehren: (s, rnd) => {
      if (rnd() < 0.4 + s.fraktionen.militaer.loyalitaet / 200) {
        widerstand(s, 12);
        wendeAn(s, { fraktionen: { militaer: 6 } });
        return 'Mehrere Offiziere sichern zu, nicht auf das Volk schießen zu lassen.';
      }
      widerstand(s, -3);
      return 'Der Kontaktmann war ein Spitzel. Ein Rückschlag.';
    },
  },
];

export const AKTION_MAP: Record<string, AktionDef> = Object.fromEntries(AKTIONEN.map((a) => [a.id, a]));
