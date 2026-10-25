import type { EreignisDef } from '../schema';
import { o } from './helfer';

export const WIRTSCHAFT_EREIGNISSE: EreignisDef[] = [
  {
    id: 'investitionsstreik',
    titel: 'Investitionsstreik',
    bild: '🏦',
    kategorie: 'wirtschaft',
    gewicht: (s) => (s.fraktionen.kapital.loyalitaet < 25 ? 3 : 0.5),
    text: 'Die Arbeitgeberverbände verkünden, dass ihre Mitglieder „angesichts der unsicheren Lage“ Investitionen auf Eis legen. Analysten sprechen offen von einem Investitionsstreik – einer Machtdemonstration gegen deine Politik.',
    codex: 'kapitalstreik',
    optionen: [
      o('Öffentliche Investitionen erhöhen', { schuldenEinmalig: 3, fraktionen: { arbeiter: 3 } }, {
        modifikator: { name: 'Öffentliches Investitionsprogramm', runden: 6, effekte: { wachstum: 0.8, haushalt: 1.5, ziele: { arbeitslosigkeit: -0.8 } }, gut: true },
        ergebnis: 'Wo private Investoren streiken, springt der Staat ein: Schienen, Schulen, Solaranlagen.',
      }),
      o('Mit Steuersenkungen locken', { fraktionen: { kapital: 12, mittelstand: 4, arbeiter: -6, partei: -5 }, delta: { kapitalflucht: -6 } }, {
        modifikator: { name: 'Steuergeschenke', runden: 8, effekte: { ziele: { steuerquote: -1.5, ungleichheit: 1 } } },
        ergebnis: 'Die Investoren kehren zurück – und lachen sich ins Fäustchen. Deine Basis ist empört.',
      }),
      o('Stillgelegte Betriebe an Belegschaften übergeben', { delta: { gemeineigentum: 3, betriebsdemokratie: 4, kapitalflucht: 5 }, ziele: { gemeineigentum: 2 }, fraktionen: { arbeiter: 8, kapital: -10 } }, {
        bedingung: (s) => s.politik.betriebe >= 2,
        bedingungText: 'Benötigt mindestens paritätische Mitbestimmung.',
        codex: 'genossenschaften',
        ergebnis: 'Ein neues Gesetz erlaubt Beschäftigten, Betriebe zu übernehmen, die stillgelegt werden sollen. Hunderte Genossenschaften entstehen.',
      }),
    ],
  },
  {
    id: 'rating',
    titel: 'Herabstufung',
    bild: '📉',
    kategorie: 'wirtschaft',
    gewicht: (s) => (s.beziehungen.maerkte < -10 || s.werte.schulden > 90 ? 2 : 0.3),
    text: 'Eine große Ratingagentur stuft die Kreditwürdigkeit von {land} herab. Die Zinsen auf Staatsanleihen steigen. Die Opposition spricht von „Misswirtschaft“, Ökonominnen von politischem Druck.',
    optionen: [
      o('Ruhe bewahren – wir lassen uns nicht erpressen', { beziehungen: { maerkte: -5 }, fraktionen: { partei: 3, arbeiter: 2 }, delta: { kapitalflucht: 4 } }, { ergebnis: 'Du bleibst standhaft. Die Märkte bleiben nervös.' }),
      o('Sparprogramm ankündigen', { beziehungen: { maerkte: 15 }, fraktionen: { arbeiter: -8, partei: -6, minderheiten: -3 } }, {
        modifikator: { name: 'Sparprogramm', runden: 6, effekte: { haushalt: -2, wachstum: -0.4, ziele: { unruhe: 4 } } },
        ergebnis: 'Die Märkte beruhigen sich. Auf den Straßen wächst die Wut.',
      }),
      o('Staatsanleihen an die Bevölkerung verkaufen', { beziehungen: { maerkte: 3 }, delta: { bewusstsein: 2 }, fraktionen: { mittelstand: 3 } }, {
        hinweis: '„Volksanleihen“ machen unabhängiger von internationalen Gläubigern.',
        ergebnis: 'Millionen Bürgerinnen kaufen Volksanleihen. Die Abhängigkeit von den Finanzmärkten sinkt.',
      }),
    ],
  },
  {
    id: 'konzern_abwanderung',
    titel: 'Drohung mit Abwanderung',
    bild: '🏭',
    kategorie: 'wirtschaft',
    gewicht: (s) => (s.politik.steuern >= 2 || s.politik.betriebe >= 2 ? 1.8 : 0.6),
    text: 'Der größte Industriekonzern des Landes droht, seine Produktion ins Ausland zu verlagern – 40.000 Arbeitsplätze in {region:industrie} stehen auf dem Spiel. Der Vorstand fordert die Rücknahme deiner Reformen.',
    optionen: [
      o('Nachgeben', { fraktionen: { kapital: 8, arbeiter: -8, partei: -5 }, delta: { kapitalflucht: -4, legitimitaet: -3 } }, { ergebnis: 'Der Konzern bleibt – und weiß jetzt, dass Erpressung funktioniert.' }),
      o('Standortgarantie gegen Staatsbeteiligung', { schuldenEinmalig: 2, delta: { gemeineigentum: 2 }, ziele: { gemeineigentum: 1.5 }, fraktionen: { arbeiter: 5, kapital: -5 } }, { ergebnis: 'Der Staat steigt mit 25 % ein und sichert sich ein Vetorecht gegen Verlagerungen.' }),
      o('„Dann übernehmen eben die Beschäftigten“', { delta: { gemeineigentum: 4, betriebsdemokratie: 5, kapitalflucht: 8 }, ziele: { gemeineigentum: 3 }, fraktionen: { arbeiter: 10, kapital: -15, wissenschaft: 2 }, beziehungen: { maerkte: -8 } }, {
        bedingung: (s) => s.werte.gemeineigentum >= 20 || s.politik.industrie >= 2,
        bedingungText: 'Benötigt Gemeineigentum ≥ 20 % oder Verstaatlichung.',
        ergebnis: 'Die Werke werden vergesellschaftet. Die Belegschaft wählt ihre eigene Geschäftsführung. Der Konzern ist fort – die Arbeit bleibt.',
      }),
    ],
  },
  {
    id: 'immobilienblase',
    titel: 'Die Immobilienblase platzt',
    bild: '🏚️',
    kategorie: 'wirtschaft',
    gewicht: (s) => (s.politik.wohnen <= 1 && s.politik.finanzen <= 1 ? 1.4 : 0.3),
    abstand: 30,
    text: 'Jahrelang sind die Immobilienpreise gestiegen. Jetzt brechen sie ein. Banken wanken, Baustellen stehen still. Die großen Banken fordern einen Rettungsschirm.',
    codex: 'finanzkrise',
    optionen: [
      o('Banken retten – ohne Bedingungen', { schuldenEinmalig: 8, fraktionen: { kapital: 8, arbeiter: -8, partei: -6 }, delta: { legitimitaet: -6 } }, { ergebnis: 'Gewinne privat, Verluste öffentlich – wie 2008.' }),
      o('Retten, aber Banken verstaatlichen', { schuldenEinmalig: 7, delta: { gemeineigentum: 5 }, ziele: { gemeineigentum: 3 }, fraktionen: { kapital: -10, arbeiter: 6 }, beziehungen: { maerkte: -8 } }, { ergebnis: 'Wer gerettet wird, gehört der Allgemeinheit. Die Banken werden öffentlich.' }),
      o('Leerstehende Wohnungen kaufen und günstig vermieten', { schuldenEinmalig: 4, ziele: { wohnen: 4 }, fraktionen: { arbeiter: 5, minderheiten: 3, kapital: -4 } }, { ergebnis: 'Der Staat kauft zu Tiefstpreisen und schafft Zehntausende bezahlbare Wohnungen.' }),
    ],
  },
  {
    id: 'energiepreisschock',
    titel: 'Energiepreisschock',
    bild: '⛽',
    kategorie: 'wirtschaft',
    gewicht: (s) => 1 + (100 - s.werte.erneuerbar) / 60,
    abstand: 16,
    text: 'Ein Konflikt in einer Förderregion lässt die Öl- und Gaspreise explodieren. Heizkosten verdoppeln sich, Spediteure blockieren Autobahnen. Wer fossil abhängig ist, zahlt jetzt drauf.',
    optionen: [
      o('Preisdeckel für Grundbedarf', { fraktionen: { arbeiter: 6, land: 5, kapital: -3 } }, {
        modifikator: { name: 'Energiepreisdeckel', runden: 4, effekte: { haushalt: 1.5, ziele: { inflation: -1 } }, gut: true },
        ergebnis: 'Die ersten Kilowattstunden sind für alle bezahlbar. Wer viel verbraucht, zahlt mehr.',
      }),
      o('Übergewinnsteuer für Energiekonzerne', { fraktionen: { arbeiter: 5, kapital: -8 }, delta: { ungleichheit: -1 } }, {
        modifikator: { name: 'Übergewinnsteuer', runden: 4, effekte: { haushalt: -1, ziele: { inflation: -0.5 } } },
        ergebnis: 'Die Krisengewinne der Konzerne finanzieren die Entlastung der Bevölkerung.',
      }),
      o('Nichts tun – der Markt regelt das', { fraktionen: { arbeiter: -6, land: -6, kapital: 3 } }, {
        modifikator: { name: 'Energiekrise', runden: 4, effekte: { ziele: { inflation: 2.5, unruhe: 6 }, wachstum: -0.5 } },
        ergebnis: 'Viele Familien können ihre Rechnungen nicht mehr bezahlen.',
      }),
    ],
  },
  {
    id: 'steueroasen_leak',
    titel: 'Die Paradies-Akten',
    bild: '🏝️',
    kategorie: 'wirtschaft',
    abstand: 30,
    text: 'Ein internationales Journalistenteam veröffentlicht Millionen Dokumente: Hunderte Reiche und Konzerne aus {land} haben Milliarden in Steueroasen versteckt – darunter Unterstützer der Opposition.',
    codex: 'steueroasen',
    optionen: [
      o('Eine Steuerfahndungs-Offensive starten', { schuldenEinmalig: -2, fraktionen: { arbeiter: 5, kapital: -8, wissenschaft: 3 }, delta: { legitimitaet: 3 } }, { ergebnis: 'Tausend neue Steuerfahnderinnen holen Milliarden zurück.' }),
      o('Eine globale Mindeststeuer vorantreiben', { beziehungen: { sueden: 8, westen: 3 }, delta: { weltbewegung: 2 }, fraktionen: { kapital: -4 } }, { ergebnis: 'Du schmiedest eine internationale Allianz gegen Steuerflucht.' }),
      o('Diskret bleiben', { fraktionen: { kapital: 3, partei: -3 } }, { ergebnis: 'Die Geschichte verschwindet aus den Schlagzeilen. Die Wut bleibt.' }),
    ],
  },
  {
    id: 'genossenschaftsboom',
    titel: 'Genossenschaftsboom',
    bild: '🤝',
    kategorie: 'wirtschaft',
    wenn: (s) => s.werte.betriebsdemokratie > 40,
    gewicht: 1.2,
    abstand: 20,
    text: 'Immer mehr Beschäftigte übernehmen ihre Betriebe: Bäckereien, Software-Firmen, Pflegedienste. Die Genossenschaften sind produktiv und krisenfest. Sie bitten um besseren Zugang zu Krediten.',
    codex: 'genossenschaften',
    optionen: [
      o('Einen Genossenschaftsfonds einrichten', { schuldenEinmalig: 1.5, ziele: { gemeineigentum: 3, betriebsdemokratie: 4 }, fraktionen: { arbeiter: 5, mittelstand: 3 } }, { ergebnis: 'Der Fonds finanziert Belegschaftsübernahmen und Neugründungen.' }),
      o('Steuerliche Vorteile gewähren', { ziele: { gemeineigentum: 2, steuerquote: -0.5 }, fraktionen: { arbeiter: 3, mittelstand: 2, kapital: -2 } }, { ergebnis: 'Genossenschaften zahlen weniger Steuern auf reinvestierte Gewinne.' }),
    ],
  },
  {
    id: 'lieferdienst_streik',
    titel: 'Aufstand der Kuriere',
    bild: '🛵',
    kategorie: 'wirtschaft',
    abstand: 24,
    text: 'Tausende Fahrerinnen von Lieferplattformen streiken. Sie gelten als „selbstständig“, haben keine Krankenversicherung und verdienen weniger als den Mindestlohn. Die Plattformen drohen, sich zurückzuziehen.',
    optionen: [
      o('Plattformarbeit als Anstellung definieren', { fraktionen: { arbeiter: 7, tech: -8, minderheiten: 4 }, delta: { informell: -2 }, ziele: { informell: -2 } }, { ergebnis: 'Kuriere werden Angestellte mit allen Rechten.' }),
      o('Eine genossenschaftliche Lieferplattform fördern', { schuldenEinmalig: 0.5, ziele: { techmacht: -2, betriebsdemokratie: 2 }, fraktionen: { arbeiter: 5, tech: -4, mittelstand: 3 } }, { ergebnis: 'Die Kuriere gründen ihre eigene App – und die Restaurants zahlen weniger Provision.' }),
      o('Nicht eingreifen', { fraktionen: { tech: 4, arbeiter: -5, minderheiten: -3 } }, { ergebnis: 'Der Streik verläuft im Sand.' }),
    ],
  },
  {
    id: 'pflegenotstand',
    titel: 'Pflegenotstand',
    bild: '🩺',
    kategorie: 'gesellschaft',
    abstand: 20,
    gewicht: (s) => (s.werte.gesundheit < 65 ? 1.6 : 0.8),
    text: 'In den Krankenhäusern fehlen Zehntausende Pflegekräfte. Stationen schließen, Operationen werden verschoben. Die Pflegekräfte kündigen einen unbefristeten Streik an.',
    optionen: [
      o('30 % mehr Lohn und feste Personalschlüssel', { fraktionen: { arbeiter: 6, feministisch: 5 }, ziele: { gesundheit: 3 } }, {
        modifikator: { name: 'Pflegeoffensive', runden: 10, effekte: { haushalt: 0.8 }, gut: true },
        ergebnis: 'Pflege wird endlich angemessen bezahlt. Viele, die den Beruf verlassen hatten, kehren zurück.',
      }),
      o('Pflegekräfte im Ausland anwerben', { ziele: { gesundheit: 1.5 }, fraktionen: { arbeiter: -2 }, beziehungen: { sueden: -4 } }, { ergebnis: 'Die Lücken werden kleiner – aber in den Herkunftsländern fehlen die Pflegekräfte nun.' }),
      o('Den Streik verbieten', { fraktionen: { arbeiter: -12, feministisch: -6, partei: -5 }, delta: { buergerrechte: -3, legitimitaet: -4 } }, { ergebnis: 'Eine linke Regierung verbietet einen Streik. Die Bilder werden dich verfolgen.' }),
    ],
  },
  {
    id: 'vier_tage_pilot',
    titel: 'Das Experiment',
    bild: '🧪',
    kategorie: 'wirtschaft',
    einmalig: true,
    wenn: (s) => s.politik.arbeitszeit <= 2,
    text: 'Hundert Unternehmen haben ein Jahr lang die 4-Tage-Woche bei vollem Lohn getestet. Ergebnis: Produktivität stabil, Krankmeldungen halbiert, kaum jemand will zurück. Die Gewerkschaften fordern eine landesweite Einführung.',
    codex: 'vier_tage_woche',
    optionen: [
      o('Die Ergebnisse öffentlich feiern', { fraktionen: { arbeiter: 4, feministisch: 3 }, delta: { bewusstsein: 2 } }, { ergebnis: 'Die Debatte über die Arbeitszeit ist eröffnet.' }),
      o('Zurückhaltung – die Wirtschaft braucht Ruhe', { fraktionen: { kapital: 3, mittelstand: 2, arbeiter: -3 } }, { ergebnis: 'Die Studie landet in der Schublade.' }),
    ],
  },
  {
    id: 'lithiumfund',
    titel: 'Ein Rohstoffschatz',
    bild: '💎',
    kategorie: 'wirtschaft',
    einmalig: true,
    text: 'Geologen entdecken in {region:berge} große Vorkommen an Lithium und seltenen Erden – unverzichtbar für Batterien. Internationale Bergbaukonzerne stehen Schlange. Doch die Region ist ökologisch sensibel, und dort leben indigene Gemeinschaften.',
    optionen: [
      o('An Konzerne lizenzieren', { schuldenEinmalig: -3, fraktionen: { kapital: 6, klima: -8, minderheiten: -6 }, ziele: { natur: -3 }, wachstum: 0 }, {
        modifikator: { name: 'Rohstoffboom', runden: 10, effekte: { wachstum: 0.4 } },
        ergebnis: 'Das Geld fließt – größtenteils ins Ausland. Die Landschaft wird umgegraben.',
      }),
      o('Staatlicher Abbau mit strengen Auflagen', { fraktionen: { arbeiter: 4, klima: -3, kapital: -3 }, ziele: { gemeineigentum: 2, natur: -1.5 } }, {
        modifikator: { name: 'Öffentlicher Rohstoffabbau', runden: 12, effekte: { wachstum: 0.25, haushalt: -0.6 }, gut: true },
        ergebnis: 'Die Gewinne finanzieren Schulen und Krankenhäuser. Die Gemeinden vor Ort entscheiden mit.',
      }),
      o('Nicht abbauen – die Natur und die Menschen dort schützen', { fraktionen: { klima: 8, minderheiten: 6, kapital: -4 }, ziele: { natur: 1 } }, { ergebnis: 'Ein mutiger Verzicht. Manche nennen es naiv, andere visionär.', codex: 'rechte_der_natur' }),
    ],
  },
  {
    id: 'schuldenkrise',
    titel: 'Schuldenkrise',
    bild: '💸',
    kategorie: 'krise',
    wenn: (s) => s.werte.schulden > 110 && s.beziehungen.maerkte < -30 && s.politik.finanzen < 3,
    gewicht: 4,
    abstand: 16,
    text: 'Die Zinsen auf Staatsanleihen sind auf über zehn Prozent gestiegen. {land} kann seine Schulden kaum noch refinanzieren. Der IWF bietet einen Notkredit an – unter harten Bedingungen: Privatisierungen, Rentenkürzungen, Lohnsenkungen.',
    codex: 'schuldenstreik',
    optionen: [
      o('Das IWF-Programm annehmen', { schuldenEinmalig: -10, beziehungen: { maerkte: 30, westen: 10 }, fraktionen: { arbeiter: -15, partei: -12, minderheiten: -6 } }, {
        modifikator: { name: 'IWF-Auflagen', runden: 12, effekte: { haushalt: -3, ziele: { ungleichheit: 3, gesundheit: -4, unruhe: 8, gemeineigentum: -6 }, wachstum: -0.5 } },
        ergebnis: 'Die Pleite ist abgewendet. Die Troika übernimmt faktisch den Haushalt.',
      }),
      o('Schuldenstreik und Kapitalverkehrskontrollen', { schuldenEinmalig: -30, beziehungen: { maerkte: -40, westen: -15, sueden: 8 }, fraktionen: { kapital: -15, arbeiter: 5, partei: 5 } }, {
        modifikator: { name: 'Schuldenstreik', runden: 8, effekte: { ziele: { kapitalflucht: 10, inflation: 3, sanktionen: 10 }, wachstum: -1.2 } },
        aktion: (s) => {
          s.politik.schulden = 2;
          if (s.politik.finanzen < 2) s.politik.finanzen = 2;
        },
        ergebnis: 'Du verweigerst die Zahlung illegitimer Schulden. Es wird hart – aber das Land entscheidet wieder selbst.',
      }),
      o('Hilfe bei China und dem globalen Süden suchen', { schuldenEinmalig: -12, beziehungen: { china: 15, sueden: 10, westen: -15, maerkte: 5 }, fraktionen: { militaer: -4 } }, { ergebnis: 'Ein Kredit ohne Sparauflagen – aber mit neuen Abhängigkeiten.' }),
    ],
  },
  {
    id: 'arbeitskraeftemangel',
    titel: 'Fachkräfte gesucht',
    bild: '🧰',
    kategorie: 'wirtschaft',
    wenn: (s) => s.werte.arbeitslosigkeit < 5,
    abstand: 20,
    text: 'Handwerk, Pflege und Erneuerbare-Branche finden kaum noch Personal. Die Energiewende droht ins Stocken zu geraten.',
    optionen: [
      o('Einwanderung erleichtern', { ziele: { zuwanderung: 1.5 }, fraktionen: { minderheiten: 4, kapital: 3, mittelstand: 3 }, delta: { faschismus: 1 } }, { ergebnis: 'Neue Arbeitskräfte kommen – und mit ihnen neue Debatten.' }),
      o('Ausbildungsoffensive', { schuldenEinmalig: 1, ziele: { bildung: 2 }, fraktionen: { arbeiter: 3, wissenschaft: 2 } }, { ergebnis: 'Kostenlose Umschulungen mit Lohnfortzahlung.' }),
      o('Löhne in Mangelberufen anheben', { fraktionen: { arbeiter: 5, mittelstand: -3 }, delta: { inflation: 0.5 } }, { ergebnis: 'Wer gebraucht wird, verdient endlich mehr.' }),
    ],
  },
  {
    id: 'boersencrash',
    titel: 'Globaler Börsencrash',
    bild: '💥',
    kategorie: 'welt',
    abstand: 40,
    jahr: [2027, 2095],
    gewicht: 0.6,
    text: 'An den Weltbörsen bricht Panik aus: Eine überbewertete KI-Blase ist geplatzt. Billionen sind über Nacht vernichtet. Die Weltwirtschaft rutscht in die Rezession.',
    codex: 'finanzkrise',
    optionen: [
      o('Großes Konjunkturprogramm', { schuldenEinmalig: 5, fraktionen: { arbeiter: 4 } }, {
        modifikator: { name: 'Weltrezession (abgefedert)', runden: 4, effekte: { wachstum: -1, ziele: { arbeitslosigkeit: 1 } } },
        ergebnis: 'Massive öffentliche Investitionen dämpfen den Absturz.',
      }),
      o('Sparen und abwarten', { beziehungen: { maerkte: 5 }, fraktionen: { arbeiter: -5 } }, {
        modifikator: { name: 'Weltrezession', runden: 6, effekte: { wachstum: -2.2, ziele: { arbeitslosigkeit: 2.5, unruhe: 6 } } },
        ergebnis: 'Die Rezession schlägt voll durch.',
      }),
    ],
  },
  {
    id: 'mittelstand_pleiten',
    titel: 'Ladensterben',
    bild: '🏪',
    kategorie: 'wirtschaft',
    abstand: 20,
    wenn: (s) => s.fraktionen.mittelstand.loyalitaet < 40,
    text: 'In den Innenstädten schließt ein Geschäft nach dem anderen. Online-Riesen und Handelsketten drücken die Preise. Die Handwerkskammern werfen dir vor, nur an Konzerne und Arbeiter zu denken.',
    optionen: [
      o('Mittelstandsfonds und günstige Kredite', { schuldenEinmalig: 1, fraktionen: { mittelstand: 8 } }, { ergebnis: 'Kleine Betriebe bekommen Luft zum Atmen.' }),
      o('Online-Konzerne besteuern', { fraktionen: { mittelstand: 6, tech: -6 }, ziele: { techmacht: -2 } }, { ergebnis: 'Eine Digitalsteuer gleicht die Wettbewerbsbedingungen an.' }),
      o('Übergang in Genossenschaften anbieten', { fraktionen: { mittelstand: 3, arbeiter: 2 }, ziele: { betriebsdemokratie: 2 } }, { ergebnis: 'Wer keinen Nachfolger findet, kann den Betrieb an die Belegschaft übergeben.' }),
    ],
  },
  {
    id: 'inflation_hoch',
    titel: 'Die Preise galoppieren',
    bild: '🛒',
    kategorie: 'wirtschaft',
    wenn: (s) => s.werte.inflation > 7,
    gewicht: 3,
    abstand: 8,
    text: 'Die Inflation liegt bei {inflation} %. Lebensmittel und Mieten werden jeden Monat teurer. Wer wenig hat, leidet am meisten. Die Zentralbank fordert Haushaltsdisziplin.',
    optionen: [
      o('Preiskontrollen für Grundgüter', { fraktionen: { arbeiter: 5, mittelstand: -5, kapital: -4 } }, {
        modifikator: { name: 'Preiskontrollen', runden: 4, effekte: { ziele: { inflation: -2.5 }, wachstum: -0.3 } },
        ergebnis: 'Brot, Milch und Mieten werden eingefroren. Schwarzmärkte drohen.',
      }),
      o('Ausgaben kürzen', { fraktionen: { arbeiter: -6, kapital: 4 }, beziehungen: { maerkte: 8 } }, {
        modifikator: { name: 'Kürzungen', runden: 6, effekte: { haushalt: -2, ziele: { inflation: -1.5, arbeitslosigkeit: 1 } } },
        ergebnis: 'Die Inflation sinkt – auf Kosten von Jobs.',
      }),
      o('Löhne an die Inflation koppeln', { fraktionen: { arbeiter: 8, kapital: -5, mittelstand: -3 }, delta: { inflation: 0.5 } }, { ergebnis: 'Die Kaufkraft bleibt erhalten – doch die Lohn-Preis-Spirale dreht sich.' }),
    ],
  },
  {
    id: 'kapitalflucht_krise',
    titel: 'Kapital auf der Flucht',
    bild: '✈️',
    kategorie: 'krise',
    wenn: (s) => s.werte.kapitalflucht > 45,
    gewicht: 3,
    abstand: 10,
    text: 'Täglich verlassen Milliarden das Land. Die Währung verliert an Wert, Importe werden teuer. Die Reichen bringen ihr Vermögen in Sicherheit – auf Kosten aller anderen.',
    codex: 'kapitalkontrollen',
    optionen: [
      o('Notfall-Kapitalverkehrskontrollen', { delta: { kapitalflucht: -20 }, beziehungen: { maerkte: -15, westen: -5 }, fraktionen: { kapital: -10 } }, {
        aktion: (s) => {
          if (s.politik.finanzen < 2) s.politik.finanzen = 2;
        },
        ergebnis: 'Die Grenzen für Kapital werden geschlossen. Die Flucht stoppt.',
      }),
      o('Beruhigungssignale senden', { delta: { kapitalflucht: -8 }, fraktionen: { kapital: 6, partei: -5, arbeiter: -4 } }, { ergebnis: 'Du versprichst, keine weiteren Reformen anzugehen. Vorerst.' }),
    ],
  },
];

WIRTSCHAFT_EREIGNISSE.push({
  id: 'gelddrucken',
  titel: 'Die Notenpresse',
  bild: '🖨️',
  kategorie: 'krise',
  wenn: (s) => s.werte.schulden > 150 && s.werte.defizit > 4,
  gewicht: 4,
  abstand: 10,
  text: 'Die Staatsschulden liegen bei {schulden} % der Wirtschaftsleistung, das Defizit wächst weiter. Niemand will dem Staat noch Geld leihen – außer der eigenen Zentralbank. Die Ökonominnen sind gespalten: Gelddrucken oder Sparen?',
  codex: 'mmt',
  optionen: [
    o('Die Zentralbank finanziert den Staat', { delta: { inflation: 6 }, fraktionen: { kapital: -6, mittelstand: -6 } }, {
      modifikator: { name: 'Monetarisierung', runden: 6, effekte: { ziele: { inflation: 4 }, haushalt: -2 } },
      ergebnis: 'Die Ausgaben sind gesichert – doch die Preise steigen rasant.',
    }),
    o('Konsolidieren: Ausgaben kürzen, Steuern für Reiche erhöhen', { fraktionen: { arbeiter: -4, kapital: -6 }, beziehungen: { maerkte: 10 } }, {
      modifikator: { name: 'Haushaltskonsolidierung', runden: 8, effekte: { haushalt: -3, wachstum: -0.6, ziele: { unruhe: 4 } } },
      ergebnis: 'Schmerzhaft, aber die Schuldenlast beginnt zu sinken.',
    }),
    o('Einmalige Vermögensabgabe der reichsten 1 %', { schuldenEinmalig: -15, fraktionen: { kapital: -15, tech: -8, arbeiter: 5 }, delta: { kapitalflucht: 8 } }, {
      ergebnis: 'Wie nach dem Zweiten Weltkrieg: Große Vermögen tragen die Last. Die Schulden sinken deutlich.',
      codex: 'vermoegensteuer',
    }),
  ],
});
