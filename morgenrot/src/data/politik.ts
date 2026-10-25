// Politische Stellschrauben. Alle Zahlen sind relative Beiträge: Das Spiel kalibriert
// beim Start, sodass die Ausgangslage eines Landes ein Gleichgewicht ist. Es zählt also
// der Unterschied zwischen den Stufen.
import type { Effekte } from '../sim/types';
import type { Sektor, Stellschraube, Stufe } from './schema';

const s = (name: string, text: string, effekte: Effekte, extra: Partial<Stufe> = {}): Stufe => ({
  name,
  text,
  effekte,
  ...extra,
});

export const SEKTOREN: Sektor[] = [
  { id: 'wirtschaft', name: 'Wirtschaft', icon: '🏭', text: 'Eigentum, Finanzen, Steuern und Handel – wem gehört die Wirtschaft, und wem dient sie?' },
  { id: 'arbeit', name: 'Arbeit & Soziales', icon: '✊', text: 'Arbeitszeit, Löhne, soziale Sicherheit und Sorgearbeit.' },
  { id: 'versorgung', name: 'Daseinsvorsorge', icon: '🏥', text: 'Gesundheit, Bildung, Wohnen und Mobilität für alle.' },
  { id: 'umwelt', name: 'Energie & Umwelt', icon: '🌿', text: 'Energiewende, Klimaschutz, Landwirtschaft und Natur.' },
  { id: 'gesellschaft', name: 'Rechte & Gesellschaft', icon: '⚖️', text: 'Gleichstellung, Selbstbestimmung, Migration und das Verhältnis von Staat und Religion.' },
  { id: 'staat', name: 'Staat & Demokratie', icon: '🏛️', text: 'Medien, Beteiligung, Sicherheit, Militär und der Umgang mit Feinden der Demokratie.' },
  { id: 'digital', name: 'Technologie', icon: '💡', text: 'Plattformen, künstliche Intelligenz und Forschung.' },
  { id: 'welt', name: 'Außenpolitik', icon: '🌍', text: 'Bündnisse, Klimadiplomatie und der Umgang mit Schulden.' },
];

export const POLITIK: Stellschraube[] = [
  // ───────────────────────── WIRTSCHAFT ─────────────────────────
  {
    id: 'industrie',
    sektor: 'wirtschaft',
    name: 'Schlüsselindustrien',
    text: 'Wem gehören Energie, Stahl, Chemie, Infrastruktur und Rohstoffe?',
    kosten: 6,
    stufen: [
      s('Privatwirtschaft', 'Schlüsselindustrien sind in privater Hand und folgen dem Profitprinzip.', {
        ziele: { gemeineigentum: -10, ungleichheit: 2, steuerquote: -1 },
        fraktionen: { kapital: 10, mittelstand: 2, arbeiter: -6, partei: -4 },
        beziehungen: { maerkte: 6, westen: 4 },
      }),
      s('Staatsbeteiligungen', 'Der Staat hält Anteile an wichtigen Unternehmen und nimmt Einfluss.', {}),
      s('Verstaatlichung', 'Energie, Bahn, Rohstoffe und Grundstoffindustrie werden verstaatlicht und dem Gemeinwohl verpflichtet.', {
        ziele: { gemeineigentum: 18, steuerquote: 2.5, ungleichheit: -3, kapitalflucht: 14, buerokratie: 4, korruption: 2 },
        wachstum: -0.15,
        haushalt: 0.8,
        fraktionen: { kapital: -20, arbeiter: 8, partei: 5, mittelstand: -3, wissenschaft: 1 },
        beziehungen: { westen: -10, maerkte: -15 },
      }, {
        wechsel: { delta: { kapitalflucht: 10 }, fraktionen: { kapital: -12 }, beziehungen: { maerkte: -10 }, schuldenEinmalig: 4 },
        codex: 'verstaatlichung',
      }),
      s('Vergesellschaftung', 'Schlüsselindustrien gehen in Gemeineigentum über – verwaltet von Beschäftigten, Kommunen und Verbraucherinnen gemeinsam.', {
        ziele: { gemeineigentum: 32, betriebsdemokratie: 12, steuerquote: 3.5, ungleichheit: -6, kapitalflucht: 22, korruption: -2, bewusstsein: 4 },
        wachstum: -0.25,
        haushalt: 1,
        fraktionen: { kapital: -30, arbeiter: 15, partei: 3, mittelstand: -5, wissenschaft: 3 },
        beziehungen: { westen: -18, maerkte: -22 },
      }, {
        wechsel: { delta: { kapitalflucht: 12 }, fraktionen: { kapital: -15, arbeiter: 5 }, beziehungen: { maerkte: -12 }, schuldenEinmalig: 5 },
        bedingung: (st) => st.politik.betriebe >= 2,
        bedingungText: 'Benötigt mindestens paritätische Mitbestimmung in den Betrieben.',
        codex: 'vergesellschaftung',
      }),
    ],
  },
  {
    id: 'finanzen',
    sektor: 'wirtschaft',
    name: 'Banken & Kapital',
    text: 'Wie frei darf Kapital fließen – und wer entscheidet über Kredite?',
    kosten: 5,
    stufen: [
      s('Freier Kapitalverkehr', 'Geld kann frei ins Land und wieder hinaus fließen. Investoren lieben es – und fliehen schnell.', {
        ziele: { kapitalflucht: 6, ungleichheit: 1 },
        wachstum: 0.1,
        fraktionen: { kapital: 8, arbeiter: -2 },
        beziehungen: { maerkte: 10, westen: 3 },
      }),
      s('Strenge Bankenregulierung', 'Eigenkapitalregeln, Trennbanken, Finanztransaktionssteuer.', {
        ziele: { ungleichheit: -1 },
        fraktionen: { kapital: -2 },
      }),
      s('Kapitalverkehrskontrollen', 'Der Abfluss von Kapital wird begrenzt und genehmigungspflichtig.', {
        ziele: { kapitalflucht: -25, ungleichheit: -1, inflation: 0.3 },
        wachstum: -0.15,
        fraktionen: { kapital: -12, mittelstand: -2, partei: 2 },
        beziehungen: { maerkte: -20, westen: -8 },
      }, { codex: 'kapitalkontrollen' }),
      s('Öffentliches Bankwesen', 'Große Banken werden öffentlich und demokratisch kontrolliert. Kredite fließen in Wohnungen, Energiewende und Genossenschaften.', {
        ziele: { kapitalflucht: -18, gemeineigentum: 8, steuerquote: 1, ungleichheit: -2 },
        wachstum: 0.2,
        fraktionen: { kapital: -18, mittelstand: 4, arbeiter: 3, wissenschaft: 1 },
        beziehungen: { maerkte: -15, westen: -6 },
      }, {
        wechsel: { delta: { kapitalflucht: 8 }, fraktionen: { kapital: -8 }, schuldenEinmalig: 3 },
        codex: 'oeffentliche_banken',
      }),
    ],
  },
  {
    id: 'betriebe',
    sektor: 'wirtschaft',
    name: 'Betriebsdemokratie',
    text: 'Wie viel Mitbestimmung haben Beschäftigte in ihren Betrieben?',
    kosten: 4,
    stufen: [
      s('Keine Mitbestimmung', 'Die Eigentümer entscheiden allein.', {
        ziele: { betriebsdemokratie: -15, ungleichheit: 1 },
        fraktionen: { arbeiter: -8, kapital: 8 },
      }),
      s('Betriebsräte', 'Beschäftigte wählen Vertretungen mit Informations- und Mitspracherechten.', {}),
      s('Paritätische Mitbestimmung', 'Die Hälfte der Aufsichtsräte wird von Beschäftigten gewählt.', {
        ziele: { betriebsdemokratie: 20, ungleichheit: -2, bewusstsein: 3 },
        fraktionen: { arbeiter: 8, kapital: -10, mittelstand: -2 },
      }, { codex: 'mitbestimmung' }),
      s('Selbstverwaltung', 'Betriebe gehören den Beschäftigten und werden demokratisch geführt. Übernahmen in Genossenschaften werden gefördert.', {
        ziele: { betriebsdemokratie: 45, gemeineigentum: 12, ungleichheit: -5, bewusstsein: 8, partizipation: 4 },
        wachstum: -0.1,
        fraktionen: { arbeiter: 14, kapital: -22, mittelstand: -1, wissenschaft: 2 },
        beziehungen: { maerkte: -6 },
      }, { wechsel: { delta: { kapitalflucht: 6 } }, codex: 'genossenschaften' }),
    ],
  },
  {
    id: 'planung',
    sektor: 'wirtschaft',
    name: 'Wirtschaftslenkung',
    text: 'Markt, Plan oder etwas dazwischen?',
    kosten: 5,
    stufen: [
      s('Freier Markt', 'Der Staat hält sich heraus. Preise und Profite lenken die Wirtschaft.', {
        ziele: { ungleichheit: 2, effizienz: -2, buerokratie: -4 },
        wachstum: 0.1,
        fraktionen: { kapital: 8, mittelstand: 3, klima: -3 },
      }),
      s('Aktive Industriepolitik', 'Der Staat fördert gezielt Zukunftsbranchen.', {}),
      s('Demokratische Rahmenplanung', 'Gewählte Räte legen Investitionsprioritäten fest – für Klima, Versorgung und Arbeitsplätze. Märkte bleiben für Konsumgüter.', {
        ziele: { effizienz: 6, ungleichheit: -2, buerokratie: 3, partizipation: 4, kapitalflucht: 5, arbeitslosigkeit: -0.6 },
        fraktionen: { kapital: -10, wissenschaft: 5, klima: 4, arbeiter: 3, mittelstand: -2 },
      }, {
        bedingung: (st) => st.werte.gemeineigentum >= 22,
        bedingungText: 'Benötigt mindestens 22 % Gemeineigentum.',
        codex: 'demokratische_planung',
      }),
      s('Zentrale Planwirtschaft', 'Eine Planbehörde legt Produktion und Preise fest.', {
        ziele: { effizienz: 3, ungleichheit: -6, buerokratie: 20, korruption: 8, arbeitslosigkeit: -3, inflation: -1, kapitalflucht: 18, partizipation: -6 },
        wachstum: -0.6,
        fraktionen: { kapital: -25, mittelstand: -18, partei: 8, wissenschaft: -5, arbeiter: 2, land: -4 },
        beziehungen: { westen: -12, maerkte: -15 },
      }, {
        bedingung: (st) => st.werte.gemeineigentum >= 45,
        bedingungText: 'Benötigt mindestens 45 % Gemeineigentum.',
        codex: 'planwirtschaft',
      }),
    ],
  },
  {
    id: 'steuern',
    sektor: 'wirtschaft',
    name: 'Steuern',
    text: 'Wer trägt die Lasten des Gemeinwesens?',
    kosten: 5,
    stufen: [
      s('Niedrige Steuern', 'Niedrige Unternehmens- und Spitzensteuern, wenig Umverteilung.', {
        ziele: { steuerquote: -5, ungleichheit: 4 },
        wachstum: 0.15,
        fraktionen: { kapital: 10, mittelstand: 5, tech: 5, arbeiter: -4 },
        beziehungen: { maerkte: 5 },
      }),
      s('Moderate Progression', 'Wer mehr verdient, zahlt einen höheren Anteil.', {}),
      s('Vermögensteuer', 'Starke Progression, Vermögen- und Erbschaftsteuer auf große Vermögen.', {
        ziele: { steuerquote: 4, ungleichheit: -5, kapitalflucht: 9 },
        wachstum: -0.1,
        fraktionen: { kapital: -14, tech: -6, mittelstand: -1, arbeiter: 6, partei: 3 },
        beziehungen: { maerkte: -6 },
      }, { codex: 'vermoegensteuer' }),
      s('Maximaleinkommen', 'Einkommen über dem Zwanzigfachen des Mindestlohns werden nahezu vollständig besteuert, Erbschaften gedeckelt.', {
        ziele: { steuerquote: 7, ungleichheit: -10, kapitalflucht: 18 },
        wachstum: -0.2,
        fraktionen: { kapital: -25, tech: -12, mittelstand: -3, arbeiter: 9, partei: 2 },
        beziehungen: { maerkte: -12 },
      }, { codex: 'maximaleinkommen' }),
    ],
  },
  {
    id: 'handel',
    sektor: 'wirtschaft',
    name: 'Handel',
    text: 'Wie offen ist die Wirtschaft gegenüber dem Weltmarkt?',
    kosten: 4,
    stufen: [
      s('Freihandel', 'Zölle und Handelsschranken werden abgebaut.', {
        ziele: { arbeitslosigkeit: 0.4, ungleichheit: 1 },
        wachstum: 0.2,
        fraktionen: { kapital: 6, land: -5, arbeiter: -3 },
        beziehungen: { westen: 6, maerkte: 6, china: 3 },
      }),
      s('Fairer Handel', 'Lieferkettengesetze und Sozial- und Umweltstandards im Handel.', {
        ziele: { verschmutzung: -1 },
        beziehungen: { sueden: 2 },
      }),
      s('Strategischer Schutz', 'Schutz wichtiger Branchen und Versorgungssicherheit bei Energie, Medizin und Nahrung.', {
        ziele: { arbeitslosigkeit: -0.4, inflation: 0.4 },
        wachstum: -0.15,
        fraktionen: { land: 5, arbeiter: 3, kapital: -4, mittelstand: 2 },
        beziehungen: { westen: -5, china: -3 },
      }),
      s('Autarkie', 'Das Land versucht, sich weitgehend selbst zu versorgen.', {
        ziele: { arbeitslosigkeit: -0.8, inflation: 1.5 },
        wachstum: -0.6,
        fraktionen: { land: 3, kapital: -10, mittelstand: -5, wissenschaft: -3 },
        beziehungen: { westen: -8, china: -6, sueden: -3 },
      }, { codex: 'autarkie' }),
    ],
  },

  // ───────────────────────── ARBEIT & SOZIALES ─────────────────────────
  {
    id: 'arbeitszeit',
    sektor: 'arbeit',
    name: 'Arbeitszeit',
    text: 'Wie viel Lebenszeit gehört der Arbeit?',
    kosten: 5,
    stufen: [
      s('Keine Begrenzung', 'Lange Arbeitstage sind normal, Überstunden unbezahlt.', {
        ziele: { arbeitszeit: 4, arbeitslosigkeit: 0.6, gesundheit: -2 },
        wachstum: 0.15,
        fraktionen: { arbeiter: -8, kapital: 6, mittelstand: 2, feministisch: -3 },
      }),
      s('40-Stunden-Woche', 'Der Achtstundentag – erkämpft vor über hundert Jahren.', {}),
      s('35-Stunden-Woche', 'Kürzere Arbeitszeit bei vollem Lohnausgleich.', {
        ziele: { arbeitszeit: -4, arbeitslosigkeit: -0.6, partizipation: 2, frauenrechte: 1, bewusstsein: 1, gesundheit: 1 },
        wachstum: -0.15,
        fraktionen: { arbeiter: 6, kapital: -6, mittelstand: -3, feministisch: 3 },
      }),
      s('4-Tage-Woche', '32 Stunden bei vollem Lohn. Mehr Zeit für Familie, Ehrenamt, Erholung und Demokratie.', {
        ziele: { arbeitszeit: -8, arbeitslosigkeit: -1.2, partizipation: 4, frauenrechte: 3, bewusstsein: 3, gesundheit: 3, effizienz: 1 },
        wachstum: -0.3,
        fraktionen: { arbeiter: 12, kapital: -12, mittelstand: -6, feministisch: 6, klima: 2 },
      }, { codex: 'vier_tage_woche' }),
      s('28-Stunden-Woche', 'Automatisierung macht es möglich: Die Produktivitätsgewinne gehen an alle als freie Zeit.', {
        ziele: { arbeitszeit: -12, arbeitslosigkeit: -1.8, partizipation: 6, frauenrechte: 4, bewusstsein: 5, gesundheit: 4, effizienz: 2 },
        wachstum: -0.45,
        fraktionen: { arbeiter: 16, kapital: -18, mittelstand: -9, feministisch: 8, klima: 3 },
      }, {
        bedingung: (st) => st.technologien.includes('automatisierung'),
        bedingungText: 'Benötigt die Technologie „Breite Automatisierung“.',
      }),
    ],
  },
  {
    id: 'loehne',
    sektor: 'arbeit',
    name: 'Löhne',
    text: 'Wovon sollen Menschen leben können?',
    kosten: 4,
    stufen: [
      s('Kein Mindestlohn', 'Löhne werden allein am Markt bestimmt.', {
        ziele: { ungleichheit: 3, informell: 3 },
        wachstum: 0.05,
        fraktionen: { arbeiter: -8, kapital: 5, mittelstand: 3 },
      }),
      s('Niedriger Mindestlohn', 'Eine Lohnuntergrenze, die vor dem Schlimmsten schützt.', {}),
      s('Existenzsichernder Mindestlohn', 'Ein Mindestlohn, von dem man in Würde leben kann.', {
        ziele: { ungleichheit: -3, informell: -3, inflation: 0.3, arbeitslosigkeit: 0.2 },
        fraktionen: { arbeiter: 8, kapital: -5, mittelstand: -5, feministisch: 2, minderheiten: 2 },
      }),
      s('Allgemeine Tarifbindung', 'Tarifverträge gelten für alle Beschäftigten, mit Lohnrahmen von unten bis oben.', {
        ziele: { ungleichheit: -6, informell: -6, inflation: 0.5, arbeitslosigkeit: 0.4, bewusstsein: 3 },
        fraktionen: { arbeiter: 13, kapital: -10, mittelstand: -7, feministisch: 3, minderheiten: 3 },
      }, {
        bedingung: (st) => st.politik.betriebe >= 1,
        bedingungText: 'Benötigt mindestens Betriebsräte.',
        codex: 'tarifbindung',
      }),
    ],
  },
  {
    id: 'sicherung',
    sektor: 'arbeit',
    name: 'Soziale Sicherung',
    text: 'Wie schützt die Gesellschaft Menschen vor Armut?',
    kosten: 5,
    stufen: [
      s('Minimal', 'Wer arm ist, ist selbst schuld – und auf Almosen angewiesen.', {
        ziele: { ungleichheit: 4, gesundheit: -2, wohnen: -3, faschismus: 2 },
        haushalt: -3,
        fraktionen: { arbeiter: -7, kapital: 5, mittelstand: 2, religion: -2, minderheiten: -3 },
      }),
      s('Grundsicherung', 'Ein bescheidenes Existenzminimum mit Bedingungen.', {}),
      s('Starker Sozialstaat', 'Gute Renten, Arbeitslosen- und Krankengeld, Kindergeld.', {
        ziele: { ungleichheit: -4, wohnen: 3, gesundheit: 2, faschismus: -2 },
        haushalt: 3,
        fraktionen: { arbeiter: 5, kapital: -5, minderheiten: 3, religion: 2, feministisch: 2 },
      }),
      s('Grundeinkommen', 'Jede Person erhält monatlich ein bedingungsloses Grundeinkommen.', {
        ziele: { ungleichheit: -8, arbeitslosigkeit: 1, faschismus: -3, informell: -5, inflation: 0.5, frauenrechte: 2 },
        haushalt: 9,
        fraktionen: { arbeiter: 3, feministisch: 5, klima: 3, kapital: -8, mittelstand: -4, tech: 5 },
      }, { codex: 'grundeinkommen' }),
      s('Universelle Grunddienste', 'Wohnen, Mobilität, Energie, Internet, Gesundheit und Bildung werden für alle kostenlos garantiert.', {
        ziele: { ungleichheit: -7, wohnen: 5, gesundheit: 3, bildung: 2, faschismus: -4, bewusstsein: 4, effizienz: 2 },
        haushalt: 6,
        fraktionen: { arbeiter: 8, partei: 3, kapital: -8, religion: 2, minderheiten: 3, klima: 2 },
      }, { codex: 'grunddienste' }),
    ],
  },
  {
    id: 'jobgarantie',
    sektor: 'arbeit',
    name: 'Jobgarantie & gerechter Übergang',
    text: 'Was passiert mit Menschen, deren Arbeit wegfällt – etwa im Kohlebergbau?',
    kosten: 4,
    stufen: [
      s('Keine', 'Wer seinen Job verliert, muss selbst sehen, wo er bleibt.', {
        ziele: { arbeitslosigkeit: 0.5 },
        fraktionen: { arbeiter: -4, kapital: 2 },
      }),
      s('Umschulung & Strukturhilfen', 'Qualifizierung und Regionalförderung für Branchen im Umbruch.', {
        ziele: { arbeitslosigkeit: -0.4 },
        haushalt: 0.5,
        fraktionen: { arbeiter: 2 },
      }, { codex: 'gerechter_uebergang' }),
      s('Öffentliche Jobgarantie', 'Jeder Mensch, der arbeiten will, bekommt eine sinnvolle, tariflich bezahlte Stelle – in Pflege, Renaturierung, Kultur oder Infrastruktur.', {
        ziele: { arbeitslosigkeit: -3, informell: -8, faschismus: -3, bewusstsein: 3, anpassung: 2 },
        haushalt: 1.2,
        fraktionen: { arbeiter: 10, land: 4, kapital: -6, mittelstand: -3, minderheiten: 2 },
      }, { codex: 'jobgarantie' }),
    ],
  },
  {
    id: 'care',
    sektor: 'arbeit',
    name: 'Sorgearbeit',
    text: 'Kinderbetreuung, Pflege, Haushalt – meist unbezahlt und meist von Frauen geleistet.',
    kosten: 4,
    stufen: [
      s('Privatsache', 'Sorgearbeit bleibt Aufgabe der Familien.', {
        ziele: { frauenrechte: -4 },
        haushalt: -0.7,
        fraktionen: { feministisch: -7, religion: 3 },
      }),
      s('Kita-Ausbau', 'Öffentliche Kinderbetreuung wird ausgebaut.', {}),
      s('Care-Ökonomie', 'Kostenlose Kitas, gut bezahlte Pflege, bezahlte Pflegezeiten und eine faire Aufteilung der Sorgearbeit.', {
        ziele: { frauenrechte: 8, gesundheit: 3, bildung: 3, arbeitslosigkeit: -0.8, ungleichheit: -2 },
        wachstum: 0.1,
        haushalt: 2,
        fraktionen: { feministisch: 12, arbeiter: 4, religion: -2, kapital: -2 },
      }, { codex: 'care' }),
    ],
  },

  // ───────────────────────── DASEINSVORSORGE ─────────────────────────
  {
    id: 'gesundheit',
    sektor: 'versorgung',
    name: 'Gesundheit',
    text: 'Ist Gesundheit eine Ware oder ein Recht?',
    kosten: 5,
    stufen: [
      s('Privat', 'Wer zahlen kann, wird behandelt.', {
        ziele: { gesundheit: -8, ungleichheit: 2 },
        haushalt: -2,
        fraktionen: { kapital: 5, arbeiter: -6 },
      }),
      s('Gemischtes System', 'Versicherungspflicht mit privaten und öffentlichen Anbietern.', {}),
      s('Universelle Gesundheitsversorgung', 'Ein öffentlicher, steuerfinanzierter Gesundheitsdienst für alle – ohne Zuzahlung.', {
        ziele: { gesundheit: 10, ungleichheit: -2 },
        haushalt: 2.5,
        fraktionen: { arbeiter: 7, feministisch: 3, minderheiten: 4, kapital: -5, wissenschaft: 2 },
      }, { codex: 'nhs' }),
    ],
  },
  {
    id: 'bildung',
    sektor: 'versorgung',
    name: 'Bildung',
    text: 'Bildung als Privileg oder als Grundrecht?',
    kosten: 4,
    stufen: [
      s('Gebührenpflichtig', 'Gute Bildung kostet – Schulgeld und Studiengebühren.', {
        ziele: { bildung: -8, ungleichheit: 2 },
        haushalt: -1.5,
        fraktionen: { kapital: 3, arbeiter: -4, wissenschaft: -3 },
      }),
      s('Gebührenfrei', 'Kostenlose Schulen und Hochschulen.', {}),
      s('Bildungsoffensive', 'Kleine Klassen, Gemeinschaftsschulen, kostenlose Weiterbildung ein Leben lang.', {
        ziele: { bildung: 12, ungleichheit: -2, bewusstsein: 3 },
        wachstum: 0.2,
        haushalt: 2,
        fraktionen: { wissenschaft: 8, arbeiter: 4, klima: 3 },
      }),
    ],
  },
  {
    id: 'wohnen',
    sektor: 'versorgung',
    name: 'Wohnen',
    text: 'Wohnraum als Spekulationsobjekt oder als Menschenrecht?',
    kosten: 5,
    stufen: [
      s('Freier Markt', 'Mieten und Preise bestimmt der Markt.', {
        ziele: { wohnen: -6, ungleichheit: 2 },
        fraktionen: { kapital: 6, arbeiter: -5 },
      }),
      s('Mietpreisbremse', 'Mieterhöhungen werden begrenzt.', {}),
      s('Mietendeckel & Sozialbau', 'Mieten werden gedeckelt, der Staat baut massiv bezahlbare Wohnungen.', {
        ziele: { wohnen: 10, ungleichheit: -2 },
        haushalt: 1.2,
        fraktionen: { arbeiter: 6, minderheiten: 3, klima: 1, kapital: -8, mittelstand: -2 },
      }, { codex: 'wien' }),
      s('Vergesellschaftung großer Wohnkonzerne', 'Wohnkonzerne mit mehr als 3.000 Wohnungen werden gegen Entschädigung in Gemeineigentum überführt.', {
        ziele: { wohnen: 16, ungleichheit: -3, gemeineigentum: 4, bewusstsein: 3 },
        haushalt: 1,
        fraktionen: { arbeiter: 9, minderheiten: 4, kapital: -15, mittelstand: -4 },
        beziehungen: { maerkte: -6 },
      }, { wechsel: { schuldenEinmalig: 4, fraktionen: { kapital: -8 } }, codex: 'enteignen' }),
    ],
  },
  {
    id: 'verkehr',
    sektor: 'versorgung',
    name: 'Mobilität',
    text: 'Auto oder Bahn, Stau oder Takt?',
    kosten: 4,
    stufen: [
      s('Autozentriert', 'Straßenbau hat Vorrang, öffentlicher Verkehr ist Nebensache.', {
        ziele: { effizienz: -4, verschmutzung: 4 },
        fraktionen: { land: 3, kapital: 3, klima: -8 },
      }),
      s('ÖPNV-Ausbau', 'Mehr Busse und Bahnen, bessere Takte.', {}),
      s('Kostenloser ÖPNV & Bahnoffensive', 'Bus und Bahn sind kostenlos, das Schienennetz wird massiv ausgebaut – auch auf dem Land.', {
        ziele: { effizienz: 7, verschmutzung: -5, ungleichheit: -1 },
        haushalt: 1.5,
        fraktionen: { klima: 8, arbeiter: 3, land: 1, kapital: -3 },
      }, { codex: 'oepnv' }),
    ],
  },

  // ───────────────────────── ENERGIE & UMWELT ─────────────────────────
  {
    id: 'energie',
    sektor: 'umwelt',
    name: 'Energiepolitik',
    text: 'Woher kommt die Energie – und wem gehört sie?',
    kosten: 6,
    stufen: [
      s('Fossiler Ausbau', 'Neue Öl-, Gas- und Kohleprojekte sichern kurzfristig Einnahmen und Jobs.', {
        ziele: { erneuerbar: -12, verschmutzung: 5 },
        wachstum: 0.15,
        haushalt: -0.3,
        fraktionen: { kapital: 8, klima: -15, arbeiter: 2 },
      }),
      s('Gemischter Übergang', 'Langsamer Ausbau der Erneuerbaren, fossile Energie bleibt lange wichtig.', {}),
      s('Erneuerbare-Offensive', 'Massiver Ausbau von Wind, Sonne, Speichern und Netzen. Kohleausstieg in zehn Jahren.', {
        ziele: { erneuerbar: 28, verschmutzung: -6, arbeitslosigkeit: -0.3 },
        wachstum: 0.1,
        haushalt: 1.5,
        fraktionen: { klima: 10, wissenschaft: 3, kapital: -3 },
      }, { codex: 'energiewende' }),
      s('100 % Erneuerbar in Bürgerhand', 'Energie wird zum Gemeingut: Stadtwerke und Energiegenossenschaften bauen ein vollständig erneuerbares System.', {
        ziele: { erneuerbar: 55, verschmutzung: -10, gemeineigentum: 5, partizipation: 3, bewusstsein: 2 },
        wachstum: 0.15,
        haushalt: 2.5,
        fraktionen: { klima: 16, land: 4, kapital: -10, wissenschaft: 3 },
      }, {
        bedingung: (st) => st.technologien.includes('speicher'),
        bedingungText: 'Benötigt die Technologie „Günstige Speicher“.',
        codex: 'energiegenossenschaften',
      }),
    ],
  },
  {
    id: 'kernkraft',
    sektor: 'umwelt',
    name: 'Kernkraft',
    text: 'CO₂-arm, aber teuer und langsam – und das Müllproblem ist ungelöst.',
    kosten: 4,
    stufen: [
      s('Ausstieg', 'Bestehende Kraftwerke werden abgeschaltet.', {
        haushalt: -0.2,
        fraktionen: { klima: 3, wissenschaft: -2 },
      }),
      s('Weiterbetrieb', 'Bestehende Kraftwerke laufen weiter, neue werden nicht gebaut.', {}),
      s('Ausbau', 'Neue Reaktoren werden geplant. Bis sie laufen, vergehen viele Jahre.', {
        haushalt: 1.5,
        fraktionen: { klima: -4, wissenschaft: 3, kapital: 2, militaer: 2 },
      }, { codex: 'kernkraft' }),
    ],
  },
  {
    id: 'co2preis',
    sektor: 'umwelt',
    name: 'CO₂-Bepreisung',
    text: 'Soll Verschmutzung etwas kosten – und wer zahlt?',
    kosten: 4,
    stufen: [
      s('Keine', 'Emissionen sind kostenlos.', {
        ziele: { effizienz: -3 },
        fraktionen: { kapital: 4, klima: -6 },
      }),
      s('Moderate CO₂-Steuer', 'Ein moderater Preis pro Tonne CO₂.', {
        ziele: { effizienz: 3, inflation: 0.3 },
        haushalt: -0.5,
        fraktionen: { land: -3, mittelstand: -2, kapital: -2, klima: 4 },
      }),
      s('CO₂-Preis mit Klimadividende', 'Ein hoher CO₂-Preis – alle Einnahmen gehen als gleiche Pro-Kopf-Dividende zurück an die Bevölkerung.', {
        ziele: { effizienz: 8, inflation: 0.5, ungleichheit: -1 },
        haushalt: -0.3,
        fraktionen: { land: -2, mittelstand: -3, kapital: -5, klima: 10, arbeiter: 1 },
      }, { codex: 'klimadividende' }),
      s('Verbindliches Emissionsbudget', 'Feste, sinkende Obergrenzen für jede Branche – ordnungsrechtlich durchgesetzt.', {
        ziele: { effizienz: 14, erneuerbar: 5, inflation: 0.6, verschmutzung: -5 },
        wachstum: -0.3,
        fraktionen: { klima: 16, kapital: -12, mittelstand: -6, land: -5, arbeiter: -2 },
      }, {
        bedingung: (st) => st.politik.planung >= 1,
        bedingungText: 'Benötigt mindestens aktive Industriepolitik.',
      }),
    ],
  },
  {
    id: 'landwirtschaft',
    sektor: 'umwelt',
    name: 'Landwirtschaft',
    text: 'Agrarkonzerne oder bäuerliche Landwirtschaft?',
    kosten: 4,
    stufen: [
      s('Agrarindustrie', 'Große Monokulturen, Pestizide, Exportorientierung.', {
        ziele: { natur: -6, verschmutzung: 4 },
        wachstum: 0.05,
        fraktionen: { kapital: 5, land: -2, klima: -6 },
      }),
      s('Bio-Förderung', 'Subventionen für ökologischen Landbau.', {}),
      s('Agrarökologie & Landreform', 'Land für die, die es bearbeiten: Umverteilung von Großgrundbesitz, vielfältige ökologische Landwirtschaft.', {
        ziele: { natur: 8, verschmutzung: -4, ungleichheit: -3, effizienz: 2, gemeineigentum: 2 },
        haushalt: 0.8,
        fraktionen: { land: 12, klima: 6, kapital: -8 },
      }, { wechsel: { fraktionen: { kapital: -8, land: 5 } }, codex: 'agraroekologie' }),
    ],
  },
  {
    id: 'naturschutz',
    sektor: 'umwelt',
    name: 'Naturschutz',
    text: 'Wie viel Raum lassen wir der Natur?',
    kosten: 4,
    stufen: [
      s('Minimal', 'Natur ist Ressource.', {
        ziele: { natur: -8 },
        wachstum: 0.05,
        fraktionen: { kapital: 4, klima: -8, land: 2 },
      }),
      s('Schutzgebiete', 'Einige Gebiete stehen unter Schutz.', {}),
      s('30 % Renaturierung', 'Ein Drittel der Fläche wird renaturiert und geschützt.', {
        ziele: { natur: 12, anpassung: 4 },
        haushalt: 0.6,
        fraktionen: { klima: 8, wissenschaft: 3, land: -4, kapital: -3 },
      }, { codex: 'dreissig_prozent' }),
      s('Rechte der Natur', 'Flüsse, Wälder und Ökosysteme erhalten eigene Rechte und können vor Gericht vertreten werden.', {
        ziele: { natur: 20, anpassung: 6, verschmutzung: -6 },
        wachstum: -0.1,
        haushalt: 0.8,
        fraktionen: { klima: 12, minderheiten: 2, land: -5, kapital: -8 },
      }, { codex: 'rechte_der_natur' }),
    ],
  },

  // ───────────────────────── RECHTE & GESELLSCHAFT ─────────────────────────
  {
    id: 'reproduktion',
    sektor: 'gesellschaft',
    name: 'Reproduktive Rechte',
    text: 'Wer entscheidet über den Körper einer Frau?',
    kosten: 4,
    stufen: [
      s('Abtreibungsverbot', 'Schwangerschaftsabbrüche sind verboten und werden bestraft.', {
        ziele: { frauenrechte: -15, gesundheit: -2 },
        fraktionen: { religion: 12, feministisch: -20 },
      }),
      s('Stark eingeschränkt', 'Abbrüche nur in wenigen Ausnahmefällen.', {
        ziele: { frauenrechte: -7, gesundheit: -1 },
        fraktionen: { religion: 6, feministisch: -10 },
      }),
      s('Legal mit Fristen', 'Abbrüche sind in den ersten Wochen legal.', {}),
      s('Volle Selbstbestimmung', 'Entkriminalisiert, kostenlos, mit guter Aufklärung und Verhütung für alle.', {
        ziele: { frauenrechte: 8, gesundheit: 1 },
        haushalt: 0.1,
        fraktionen: { feministisch: 10, religion: -8 },
      }, { codex: 'selbstbestimmung' }),
    ],
  },
  {
    id: 'gleichstellung',
    sektor: 'gesellschaft',
    name: 'Gleichstellung',
    text: 'Gleiche Rechte auf dem Papier – oder auch im Leben?',
    kosten: 4,
    stufen: [
      s('Patriarchale Gesetze', 'Frauen sind rechtlich benachteiligt – bei Erbe, Ehe und Arbeit.', {
        ziele: { frauenrechte: -12 },
        fraktionen: { religion: 5, feministisch: -15 },
      }),
      s('Formale Gleichheit', 'Gleiche Rechte im Gesetz.', {}),
      s('Lohntransparenz & Quoten', 'Gleicher Lohn für gleiche Arbeit wird durchgesetzt, Quoten in Führungspositionen.', {
        ziele: { frauenrechte: 7, ungleichheit: -1 },
        fraktionen: { feministisch: 8, kapital: -3, religion: -2 },
      }),
      s('Volle Parität & Gewaltschutz', 'Parität in Parlamenten und Vorständen, flächendeckende Frauenhäuser, konsequente Verfolgung von Gewalt.', {
        ziele: { frauenrechte: 14, ungleichheit: -1 },
        haushalt: 0.4,
        fraktionen: { feministisch: 14, kapital: -4, religion: -4, militaer: -2 },
      }, { codex: 'paritaet' }),
    ],
  },
  {
    id: 'minderheiten',
    sektor: 'gesellschaft',
    name: 'Minderheiten & LGBTQ+',
    text: 'Gleiche Würde für alle – unabhängig von Herkunft, Glauben, Sexualität und Geschlecht?',
    kosten: 4,
    stufen: [
      s('Diskriminierende Gesetze', 'Minderheiten und queere Menschen werden rechtlich benachteiligt oder verfolgt.', {
        ziele: { minderheitenrechte: -15, faschismus: 3 },
        fraktionen: { religion: 6, feministisch: -10, minderheiten: -15 },
      }),
      s('Duldung', 'Keine Verfolgung, aber auch kein Schutz.', {
        ziele: { minderheitenrechte: -5 },
        fraktionen: { religion: 2, minderheiten: -6, feministisch: -5 },
      }),
      s('Antidiskriminierungsgesetz', 'Schutz vor Diskriminierung bei Arbeit, Wohnen und Behörden.', {}),
      s('Volle Gleichstellung', 'Ehe für alle, Selbstbestimmung, aktiver Schutz vor Hass und Gewalt.', {
        ziele: { minderheitenrechte: 10, faschismus: -1 },
        fraktionen: { feministisch: 8, minderheiten: 8, religion: -6 },
      }),
    ],
  },
  {
    id: 'migration',
    sektor: 'gesellschaft',
    name: 'Migration',
    text: 'Wie offen ist das Land für Menschen, die kommen wollen oder fliehen müssen?',
    kosten: 5,
    stufen: [
      s('Abschottung', 'Grenzzäune, Pushbacks, Abschiebungen.', {
        ziele: { zuwanderung: -4, minderheitenrechte: -6, buergerrechte: -3, faschismus: 2 },
        wachstum: -0.15,
        haushalt: 0.3,
        fraktionen: { militaer: 5, religion: 2, minderheiten: -14, feministisch: -4, kapital: -2, arbeiter: 1 },
        beziehungen: { sueden: -8 },
      }),
      s('Restriktiv', 'Hohe Hürden für Einwanderung und Asyl.', {
        ziele: { zuwanderung: -2, minderheitenrechte: -2 },
        fraktionen: { minderheiten: -6, militaer: 2 },
      }),
      s('Geregelte Einwanderung', 'Klare Wege für Arbeit, Familie und Schutzsuchende.', {}),
      s('Solidarische Migration', 'Sichere Fluchtwege, offene Arbeitsmigration, Bleiberecht für alle, die hier leben.', {
        ziele: { zuwanderung: 3, minderheitenrechte: 4, faschismus: 2 },
        wachstum: 0.15,
        haushalt: 0.4,
        fraktionen: { minderheiten: 12, feministisch: 3, klima: 2, kapital: 2, arbeiter: -3, religion: -1, militaer: -4 },
        beziehungen: { sueden: 10, westen: -3 },
      }, { codex: 'migration' }),
    ],
  },
  {
    id: 'integration',
    sektor: 'gesellschaft',
    name: 'Integration & Teilhabe',
    text: 'Werden Zugewanderte Teil der Gesellschaft?',
    kosten: 3,
    stufen: [
      s('Keine', 'Zugewanderte sind auf sich gestellt.', {
        ziele: { integration: -10 },
        fraktionen: { minderheiten: -6 },
      }),
      s('Sprachkurse', 'Kostenlose Sprach- und Orientierungskurse.', {}),
      s('Umfassende Integration', 'Schnelle Arbeitserlaubnis, Anerkennung von Abschlüssen, Wohnraum, Beratung.', {
        ziele: { integration: 12, faschismus: -1 },
        haushalt: 0.4,
        fraktionen: { minderheiten: 6, wissenschaft: 1 },
      }),
      s('Volle Teilhabe', 'Kommunales Wahlrecht nach drei Jahren, schnelle Einbürgerung, Mehrsprachigkeit in Behörden.', {
        ziele: { integration: 20, partizipation: 3, minderheitenrechte: 4 },
        haushalt: 0.5,
        fraktionen: { minderheiten: 12, feministisch: 2, religion: -1, militaer: -2 },
      }),
    ],
  },
  {
    id: 'religion',
    sektor: 'gesellschaft',
    name: 'Staat & Religion',
    text: 'Wie eng sind Staat und Religion verbunden?',
    kosten: 4,
    stufen: [
      s('Staatsreligion', 'Eine Religion genießt staatliche Vorrechte und prägt die Gesetze.', {
        ziele: { minderheitenrechte: -6, frauenrechte: -3 },
        fraktionen: { religion: 12, minderheiten: -8, feministisch: -6, wissenschaft: -4 },
      }),
      s('Privilegierte Kirchen', 'Religionsgemeinschaften erhalten Steuermittel und Sonderrechte.', {
        fraktionen: { religion: 4, minderheiten: -2 },
      }),
      s('Kooperative Trennung', 'Staat und Religion sind getrennt, arbeiten aber in Sozialem und Bildung zusammen.', {}),
      s('Strikter Laizismus', 'Religion ist reine Privatsache, ohne Einfluss auf Staat und Schule.', {
        ziele: { frauenrechte: 2 },
        fraktionen: { religion: -10, wissenschaft: 3, feministisch: 3, minderheiten: -2 },
      }),
    ],
  },

  // ───────────────────────── STAAT & DEMOKRATIE ─────────────────────────
  {
    id: 'medien',
    sektor: 'staat',
    name: 'Medien',
    text: 'Wer kontrolliert, was die Menschen erfahren?',
    kosten: 5,
    stufen: [
      s('Unregulierte Konzernmedien', 'Wenige Milliardäre besitzen die großen Medien.', {
        ziele: { pressefreiheit: -2, techmacht: 8, faschismus: 3, bewusstsein: -3 },
        fraktionen: { kapital: 6, tech: 6, wissenschaft: -2 },
      }),
      s('Duales System', 'Öffentlich-rechtliche und private Medien nebeneinander.', {}),
      s('Öffentliche & genossenschaftliche Medien', 'Starke unabhängige öffentliche Medien, Förderung von Lokaljournalismus und Medien-Genossenschaften, Begrenzung von Konzentration.', {
        ziele: { pressefreiheit: 6, techmacht: -5, faschismus: -2, bewusstsein: 4 },
        haushalt: 0.4,
        fraktionen: { wissenschaft: 4, klima: 2, kapital: -6, tech: -5 },
      }, { codex: 'medienvielfalt' }),
      s('Staatsmedien & Zensur', 'Medien werden auf Regierungslinie gebracht, kritische Stimmen zum Schweigen.', {
        ziele: { pressefreiheit: -40, buergerrechte: -15, faschismus: -6, legitimitaet: -8, techmacht: -10 },
        fraktionen: { partei: 6, militaer: 3, wissenschaft: -12, feministisch: -6, minderheiten: -4, klima: -4, kapital: -6 },
        beziehungen: { westen: -15 },
      }, { codex: 'zensur' }),
    ],
  },
  {
    id: 'partizipation',
    sektor: 'staat',
    name: 'Bürgerbeteiligung',
    text: 'Entscheiden die Menschen nur alle paar Jahre – oder ständig mit?',
    kosten: 4,
    stufen: [
      s('Nur Wahlen', 'Beteiligung beschränkt sich auf den Wahltag.', {}),
      s('Bürgerhaushalte', 'Einwohnerinnen entscheiden direkt über einen Teil der kommunalen Budgets.', {
        ziele: { partizipation: 8, legitimitaet: 2, korruption: -2, bewusstsein: 2 },
        haushalt: 0.1,
        fraktionen: { arbeiter: 2, klima: 2, partei: -1 },
      }, { codex: 'porto_alegre' }),
      s('Bürgerräte & Volksentscheide', 'Ausgeloste Bürgerräte beraten große Fragen, Volksentscheide auf allen Ebenen.', {
        ziele: { partizipation: 16, legitimitaet: 4, korruption: -3, bewusstsein: 4, faschismus: -1 },
        haushalt: 0.2,
        fraktionen: { klima: 5, feministisch: 3, wissenschaft: 2, partei: -3, kapital: -2 },
      }, { codex: 'buergerraete' }),
      s('Rätestrukturen', 'Gewählte Räte in Betrieben, Nachbarschaften und Regionen entscheiden mit – mit imperativem Mandat und Abwählbarkeit.', {
        ziele: { partizipation: 30, legitimitaet: 6, korruption: -5, bewusstsein: 8, buerokratie: -4 },
        haushalt: 0.4,
        fraktionen: { arbeiter: 6, klima: 4, partei: -6, kapital: -6, mittelstand: -2 },
      }, {
        bedingung: (st) => st.werte.partizipation >= 30 && st.werte.bewusstsein >= 40,
        bedingungText: 'Benötigt Beteiligung ≥ 30 und Solidarität ≥ 40.',
        codex: 'raete',
      }),
    ],
  },
  {
    id: 'sicherheit',
    sektor: 'staat',
    name: 'Polizei & Überwachung',
    text: 'Sicherheit durch Kontrolle oder durch Vertrauen?',
    kosten: 4,
    stufen: [
      s('Überwachungsstaat', 'Massenüberwachung, Gesichtserkennung, militarisierte Polizei.', {
        ziele: { ueberwachung: 35, buergerrechte: -20, pressefreiheit: -10, unruhe: -8, legitimitaet: -6, militaermacht: 8 },
        haushalt: 0.8,
        fraktionen: { militaer: 12, partei: 3, tech: 5, minderheiten: -12, feministisch: -8, wissenschaft: -6, klima: -6 },
      }, { codex: 'ueberwachung' }),
      s('Harte Sicherheitspolitik', 'Mehr Befugnisse und Personal für Polizei und Geheimdienste.', {
        ziele: { ueberwachung: 12, buergerrechte: -6, unruhe: -3, militaermacht: 3 },
        haushalt: 0.3,
        fraktionen: { militaer: 5, minderheiten: -5, feministisch: -2 },
      }),
      s('Rechtsstaatliche Polizei', 'Klassische Polizeiarbeit mit Datenschutz.', {}),
      s('Bürgernahe Polizei & Prävention', 'Sozialarbeit statt Repression, unabhängige Beschwerdestellen, starker Datenschutz.', {
        ziele: { ueberwachung: -10, buergerrechte: 6, unruhe: -1, techmacht: -3, militaermacht: -3, korruption: -2 },
        fraktionen: { minderheiten: 6, feministisch: 3, klima: 2, militaer: -6 },
      }),
    ],
  },
  {
    id: 'opposition',
    sektor: 'staat',
    name: 'Feinde der Demokratie',
    text: 'Wie geht der Staat mit der extremen Rechten und anderer Opposition um?',
    kosten: 5,
    stufen: [
      s('Volle Freiheit für alle', 'Auch offen faschistische Gruppen dürfen sich frei organisieren.', {
        ziele: { faschismus: 2, buergerrechte: 2 },
        fraktionen: { minderheiten: -4, feministisch: -2 },
      }),
      s('Wehrhafte Demokratie', 'Prävention, politische Bildung, Beobachtung extremistischer Gruppen.', {}),
      s('Verbot rechtsextremer Organisationen', 'Faschistische Parteien und Netzwerke werden verboten und aufgelöst.', {
        ziele: { faschismus: -7, buergerrechte: -4, unruhe: 2, legitimitaet: -1 },
        fraktionen: { minderheiten: 6, feministisch: 3, klima: 1, militaer: -3, religion: -1 },
      }, { wechsel: { delta: { faschismus: -5, unruhe: 6 } }, codex: 'wehrhafte_demokratie' }),
      s('Unterdrückung jeder Opposition', 'Alle oppositionellen Parteien und Gruppen werden verboten.', {
        ziele: { faschismus: -10, buergerrechte: -30, pressefreiheit: -15, legitimitaet: -12, unruhe: 5, korruption: 6 },
        fraktionen: { partei: 4, militaer: 4, wissenschaft: -10, feministisch: -6, minderheiten: -2, klima: -6, kapital: -6, mittelstand: -6 },
        beziehungen: { westen: -20, sueden: -5 },
      }, { codex: 'autoritarismus' }),
    ],
  },
  {
    id: 'militaer',
    sektor: 'staat',
    name: 'Militär',
    text: 'Wie groß, wie mächtig und wie demokratisch sind die Streitkräfte?',
    kosten: 5,
    stufen: [
      s('Aufrüstung', 'Mehr Geld, mehr Waffen, mehr Einfluss für das Militär.', {
        ziele: { militaermacht: 12 },
        wachstum: 0.05,
        haushalt: 1.5,
        fraktionen: { militaer: 12, kapital: 3, klima: -4 },
        beziehungen: { westen: 4 },
      }),
      s('Verteidigungsarmee', 'Eine Armee zur Landesverteidigung.', {}),
      s('Demokratisierte Streitkräfte', 'Strikte zivile Kontrolle, gewählte Soldatenvertretungen, Ausbildung in Verfassungstreue.', {
        ziele: { militaermacht: -12, legitimitaet: 1 },
        haushalt: -0.3,
        fraktionen: { militaer: -10, arbeiter: 2, klima: 2 },
      }, { wechsel: { fraktionen: { militaer: -8 } }, codex: 'zivile_kontrolle' }),
      s('Abrüstung & Zivilschutz', 'Die Armee wird stark verkleinert und in einen Katastrophenschutz umgebaut.', {
        ziele: { militaermacht: -22, anpassung: 5 },
        haushalt: -1.2,
        fraktionen: { militaer: -20, klima: 6, feministisch: 2 },
        beziehungen: { westen: -8 },
      }, { wechsel: { fraktionen: { militaer: -15 } } }),
    ],
  },
  {
    id: 'korruption',
    sektor: 'staat',
    name: 'Korruptionsbekämpfung',
    text: 'Wie sauber ist der Staat?',
    kosten: 4,
    stufen: [
      s('Status quo', 'Keine besonderen Maßnahmen.', {}),
      s('Transparenz & Lobbyregister', 'Offenlegung von Nebeneinkünften und Lobbykontakten.', {
        ziele: { korruption: -6 },
        haushalt: 0.1,
        fraktionen: { partei: -2, kapital: -3, wissenschaft: 3 },
      }),
      s('Unabhängige Antikorruptionsbehörde', 'Eine mächtige, unabhängige Behörde ermittelt auch gegen Regierung und Partei.', {
        ziele: { korruption: -14, buerokratie: -3, legitimitaet: 3 },
        haushalt: 0.2,
        fraktionen: { partei: -5, kapital: -5, militaer: -2, wissenschaft: 5, mittelstand: 3 },
      }),
    ],
  },

  // ───────────────────────── TECHNOLOGIE ─────────────────────────
  {
    id: 'plattformen',
    sektor: 'digital',
    name: 'Plattformen & Big Tech',
    text: 'Wem gehören die digitalen Marktplätze und Öffentlichkeiten?',
    kosten: 5,
    stufen: [
      s('Unreguliert', 'Plattformen machen ihre eigenen Regeln.', {
        ziele: { techmacht: 10, faschismus: 2 },
        fraktionen: { tech: 12, kapital: 2, wissenschaft: -2 },
      }),
      s('Regulierung & Kartellrecht', 'Transparenzpflichten und Wettbewerbsregeln für Plattformen.', {}),
      s('Zerschlagung der Monopole', 'Marktbeherrschende Konzerne werden aufgespalten.', {
        ziele: { techmacht: -15, pressefreiheit: 2, faschismus: -1 },
        wachstum: -0.05,
        fraktionen: { tech: -18, mittelstand: 4, wissenschaft: 2 },
        beziehungen: { westen: -6 },
      }, { codex: 'monopole' }),
      s('Digitale Gemeingüter', 'Öffentliche und genossenschaftliche Plattformen, offene Standards, Daten als Gemeingut.', {
        ziele: { techmacht: -25, gemeineigentum: 3, ueberwachung: -3, bewusstsein: 2, faschismus: -2 },
        haushalt: 0.8,
        fraktionen: { tech: -25, wissenschaft: 5, klima: 1, mittelstand: 2 },
        beziehungen: { westen: -10 },
      }, { codex: 'digitale_gemeingueter' }),
    ],
  },
  {
    id: 'ki',
    sektor: 'digital',
    name: 'KI & Automatisierung',
    text: 'Wer profitiert von Maschinen, die denken? Die Wirkung wächst mit dem technischen Fortschritt.',
    kosten: 5,
    stufen: [
      s('Freier Einsatz', 'Unternehmen setzen KI ein, wie sie wollen.', {
        ziele: { arbeitslosigkeit: 1, techmacht: 6, ungleichheit: 2, ueberwachung: 5 },
        wachstum: 0.25,
        fraktionen: { tech: 10, kapital: 5, arbeiter: -6, wissenschaft: 1 },
      }),
      s('Strenge Regulierung', 'Risikobasierte Regeln, Verbot gefährlicher Anwendungen.', {}),
      s('Automatisierungsdividende', 'Gewinne aus Automatisierung fließen über eine Maschinensteuer an die Allgemeinheit.', {
        ziele: { arbeitslosigkeit: -0.5, ungleichheit: -3, techmacht: -5, arbeitszeit: -1 },
        wachstum: 0.15,
        haushalt: -0.5,
        fraktionen: { arbeiter: 6, tech: -10, kapital: -5, wissenschaft: 3 },
      }, { codex: 'automatisierungsdividende' }),
      s('Moratorium', 'Der Einsatz fortgeschrittener KI wird ausgesetzt.', {
        ziele: { arbeitslosigkeit: -0.5, techmacht: -8 },
        wachstum: -0.2,
        fraktionen: { arbeiter: 3, tech: -15, wissenschaft: -6, kapital: -4 },
      }),
    ],
  },
  {
    id: 'forschung',
    sektor: 'digital',
    name: 'Forschung',
    text: 'Wie viel investiert das Land in Wissen und Zukunft?',
    kosten: 3,
    stufen: [
      s('Minimal', 'Forschung wird der Privatwirtschaft überlassen.', {
        haushalt: -0.5,
        fraktionen: { wissenschaft: -8 },
      }),
      s('Solide', 'Öffentliche Grundlagenforschung auf solidem Niveau.', {}),
      s('Forschungsoffensive', 'Massive Investitionen in Wissenschaft – mit offenem Zugang zu den Ergebnissen.', {
        ziele: { bildung: 2 },
        wachstum: 0.1,
        haushalt: 1,
        fraktionen: { wissenschaft: 10, klima: 2 },
      }),
    ],
  },

  // ───────────────────────── AUSSENPOLITIK ─────────────────────────
  {
    id: 'buendnis',
    sektor: 'welt',
    name: 'Bündnisausrichtung',
    text: 'Mit wem verbündet sich das Land?',
    kosten: 5,
    stufen: [
      s('Westbindung', 'Enge Partnerschaft mit den USA und der EU.', {
        fraktionen: { kapital: 5, militaer: 4, partei: -4, arbeiter: -2 },
        beziehungen: { westen: 25, china: -10, sueden: -5, maerkte: 8 },
      }),
      s('Blockfreiheit', 'Gute Beziehungen in alle Richtungen, keine Blockbindung.', {}),
      s('Süd-Süd-Kooperation', 'Enge Zusammenarbeit mit Ländern des globalen Südens.', {
        fraktionen: { minderheiten: 2, partei: 2 },
        beziehungen: { sueden: 20, westen: -10, china: 8 },
      }),
      s('Sozialistische Internationale', 'Ein Bündnis progressiver Regierungen und Bewegungen weltweit.', {
        ziele: { weltbewegung: 8 },
        fraktionen: { partei: 6, arbeiter: 3, kapital: -6, militaer: -3 },
        beziehungen: { sueden: 15, westen: -20, china: 3, maerkte: -10 },
      }, { codex: 'internationalismus' }),
    ],
  },
  {
    id: 'klimadiplomatie',
    sektor: 'welt',
    name: 'Klimadiplomatie',
    text: 'Die Klimakrise kennt keine Grenzen. Wie stark setzt sich das Land international ein?',
    kosten: 4,
    stufen: [
      s('Passiv', 'Internationale Klimapolitik ist keine Priorität.', {
        fraktionen: { klima: -4 },
      }),
      s('Engagiert', 'Aktive Mitarbeit an internationalen Abkommen.', {
        ziele: { weltklima: 3 },
        haushalt: 0.2,
        fraktionen: { klima: 3 },
        beziehungen: { sueden: 3 },
      }),
      s('Klimaallianz anführen', 'Das Land führt eine Allianz für schnellen Klimaschutz an und finanziert Klimaschutz im globalen Süden.', {
        ziele: { weltklima: 8 },
        haushalt: 0.8,
        fraktionen: { klima: 8, wissenschaft: 2, kapital: -2 },
        beziehungen: { sueden: 15 },
      }, { codex: 'klimagerechtigkeit' }),
    ],
  },
  {
    id: 'schulden',
    sektor: 'welt',
    name: 'Auslandsschulden',
    text: 'Zahlen um jeden Preis – oder die Legitimität von Schulden infrage stellen?',
    kosten: 5,
    stufen: [
      s('Vollständig bedienen', 'Alle Schulden werden pünktlich bedient.', {
        beziehungen: { maerkte: 5 },
      }),
      s('Umschuldung verhandeln', 'Längere Laufzeiten und niedrigere Zinsen werden verhandelt.', {
        fraktionen: { kapital: -4 },
        beziehungen: { maerkte: -10 },
      }, { wechsel: { schuldenEinmalig: -8, beziehungen: { maerkte: -10 } } }),
      s('Schuldenstreik', 'Illegitime Schulden aus Diktaturzeiten und Spekulation werden nicht bezahlt.', {
        ziele: { kapitalflucht: 15, inflation: 2, sanktionen: 15 },
        fraktionen: { kapital: -15, partei: 3, arbeiter: 3 },
        beziehungen: { maerkte: -40, westen: -15, sueden: 5 },
      }, { wechsel: { schuldenEinmalig: -25, fraktionen: { kapital: -10 } }, codex: 'schuldenstreik' }),
    ],
  },
];

export const POLITIK_MAP: Record<string, Stellschraube> = Object.fromEntries(POLITIK.map((p) => [p.id, p]));
