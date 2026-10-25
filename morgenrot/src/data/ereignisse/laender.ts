// Länderspezifische Ereignisse: Sie greifen die konkreten Konflikte jedes Landes auf.
import type { EreignisDef } from '../schema';
import { o } from './helfer';

export const LAENDER_EREIGNISSE: EreignisDef[] = [
  // ─────────────── Deutschland ───────────────
  {
    id: 'de_schuldenbremse',
    laender: ['deutschland'],
    titel: 'Die Schuldenbremse',
    bild: '🧱',
    kategorie: 'land',
    einmalig: true,
    jahr: [2026, 2032],
    text: 'Die im Grundgesetz verankerte Schuldenbremse blockiert die Investitionen, die Schulen, Bahn und Energiewende dringend brauchen. Für eine Reform braucht es eine Zweidrittelmehrheit – und die Opposition stellt Bedingungen.',
    codex: 'schuldenbremse',
    optionen: [
      o('Schuldenbremse reformieren – Investitionen ausnehmen', { pk: -5, fraktionen: { arbeiter: 4, klima: 4, wissenschaft: 3, mittelstand: -2 }, beziehungen: { maerkte: -4 } }, {
        modifikator: { name: 'Investitionsoffensive', runden: 16, effekte: { wachstum: 0.4, haushalt: 1.2, ziele: { anpassung: 3, effizienz: 2 } }, gut: true },
        ergebnis: 'Ein historischer Kompromiss: Zukunftsinvestitionen werden von der Schuldenbremse ausgenommen.',
      }),
      o('Ein Sondervermögen für Klima und Infrastruktur', { pk: -3, schuldenEinmalig: 6, fraktionen: { klima: 3 } }, {
        modifikator: { name: 'Sondervermögen', runden: 10, effekte: { wachstum: 0.3, ziele: { erneuerbar: 3 } }, gut: true },
        ergebnis: '500 Milliarden für die Zukunft – außerhalb des regulären Haushalts.',
      }),
      o('Die Schuldenbremse einhalten', { fraktionen: { mittelstand: 3, kapital: 3, arbeiter: -4, klima: -4 }, beziehungen: { maerkte: 5 } }, { ergebnis: 'Der Haushalt bleibt solide. Die Brücken bröckeln weiter.' }),
    ],
  },
  {
    id: 'de_autoindustrie',
    laender: ['deutschland'],
    titel: 'Die Autoindustrie in der Krise',
    bild: '🚗',
    kategorie: 'land',
    einmalig: true,
    text: 'Ein großer Autokonzern kündigt an, 30.000 Stellen zu streichen und drei Werke zu schließen. Er hat den Wandel zur Elektromobilität verschlafen. Die IG Metall fordert staatliche Hilfe.',
    optionen: [
      o('Werke übernehmen und zu Bahn- und Busfabriken umbauen', { schuldenEinmalig: 2, ziele: { gemeineigentum: 2, effizienz: 2 }, fraktionen: { arbeiter: 8, klima: 6, kapital: -6 } }, { ergebnis: 'Wo früher SUVs vom Band liefen, entstehen jetzt Straßenbahnen und E-Busse.', codex: 'konversion' }),
      o('Staatshilfen ohne Bedingungen', { schuldenEinmalig: 2.5, fraktionen: { kapital: 6, arbeiter: 3, klima: -5 } }, { ergebnis: 'Die Arbeitsplätze sind vorerst gerettet. Die Dividenden auch.' }),
      o('Den Markt entscheiden lassen', { fraktionen: { arbeiter: -10, kapital: 2 }, ziele: { arbeitslosigkeit: 0.8 }, delta: { faschismus: 2 } }, { ergebnis: 'In den Autoregionen wächst die Wut – und die Rechte.' }),
    ],
  },
  {
    id: 'de_mietendeckel',
    laender: ['deutschland'],
    titel: 'Deutsche Wohnen & Co. enteignen',
    bild: '🏘️',
    kategorie: 'land',
    einmalig: true,
    wenn: (s) => s.politik.wohnen < 3,
    text: 'In Berlin hat ein Volksentscheid zur Vergesellschaftung großer Wohnkonzerne eine klare Mehrheit bekommen. Die Initiative fordert, dass deine Regierung den Weg dafür bundesweit freimacht.',
    codex: 'enteignen',
    optionen: [
      o('Ein Vergesellschaftungsgesetz vorlegen', { fraktionen: { arbeiter: 6, minderheiten: 3, kapital: -8 }, delta: { bewusstsein: 3 } }, {
        aktion: (s) => {
          s.politik.wohnen = 3;
          s.bonus.gemeineigentum = (s.bonus.gemeineigentum ?? 0) + 2;
        },
        ergebnis: 'Artikel 15 des Grundgesetzes wird zum ersten Mal angewendet. 240.000 Wohnungen gehen in Gemeineigentum über.',
      }),
      o('Mietendeckel statt Enteignung', { fraktionen: { arbeiter: 3, kapital: -3 }, ziele: { wohnen: 3 } }, { ergebnis: 'Ein Kompromiss, der die Initiative nur halb zufriedenstellt.' }),
    ],
  },
  {
    id: 'de_afd',
    laender: ['deutschland'],
    titel: 'Verbotsverfahren?',
    bild: '⚖️',
    kategorie: 'land',
    einmalig: true,
    wenn: (s) => s.werte.faschismus > 18,
    text: 'Der Verfassungsschutz stuft die größte rechtsextreme Partei als „gesichert rechtsextremistisch“ ein. Hunderttausende fordern ein Verbotsverfahren vor dem Verfassungsgericht. Andere warnen: Ein Verbot mache sie zu Märtyrern.',
    codex: 'wehrhafte_demokratie',
    optionen: [
      o('Verbotsverfahren einleiten', { fraktionen: { minderheiten: 6, feministisch: 4 }, delta: { faschismus: -3, unruhe: 3 } }, {
        aktion: (s, rnd) => {
          if (rnd() < 0.55) {
            s.bonus.faschismus = (s.bonus.faschismus ?? 0) - 5;
            return 'Nach zwei Jahren erklärt das Verfassungsgericht die Partei für verfassungswidrig. Ihre Strukturen werden aufgelöst – doch ihre Wählerinnen sind noch da.';
          }
          s.werte.faschismus = Math.min(100, s.werte.faschismus + 4);
          return 'Das Gericht lehnt das Verbot ab. Die Partei feiert sich als Siegerin.';
        },
      }),
      o('Politisch bekämpfen – mit sozialer Politik', { delta: { faschismus: -1 }, fraktionen: { arbeiter: 2 } }, { ergebnis: 'Du setzt darauf, der Rechten den Nährboden zu entziehen.' }),
    ],
  },

  // ─────────────── USA ───────────────
  {
    id: 'us_medicare',
    laender: ['usa'],
    titel: 'Medicare for All',
    bild: '🏥',
    kategorie: 'land',
    einmalig: true,
    wenn: (s) => s.politik.gesundheit < 2,
    text: 'Millionen Amerikanerinnen haben keine Krankenversicherung, medizinische Schulden sind die häufigste Ursache für Privatinsolvenzen. Deine Bewegung hat „Medicare for All“ versprochen. Die Versicherungskonzerne mobilisieren Milliarden dagegen.',
    codex: 'nhs',
    optionen: [
      o('Medicare for All durchsetzen', { pk: -6, fraktionen: { arbeiter: 10, minderheiten: 6, kapital: -10 } }, {
        aktion: (s) => {
          s.politik.gesundheit = 2;
        },
        ergebnis: 'Ein historischer Moment: Gesundheit wird in den USA zum Recht für alle.',
      }),
      o('Eine öffentliche Option neben privaten Versicherungen', { pk: -3, fraktionen: { arbeiter: 4, kapital: -3 } }, {
        aktion: (s) => {
          s.politik.gesundheit = Math.max(1, s.politik.gesundheit);
        },
        ergebnis: 'Ein Kompromiss – besser als nichts.',
      }),
    ],
  },
  {
    id: 'us_supreme_court',
    laender: ['usa'],
    titel: 'Der Oberste Gerichtshof',
    bild: '⚖️',
    kategorie: 'land',
    abstand: 20,
    text: 'Der konservativ dominierte Supreme Court erklärt eines deiner zentralen Gesetze für verfassungswidrig. Deine Basis fordert, das Gericht zu erweitern.',
    codex: 'gewaltenteilung',
    optionen: [
      o('Das Gericht um vier Sitze erweitern', { pk: -5, delta: { legitimitaet: -4 }, fraktionen: { partei: 6, arbeiter: 3, mittelstand: -5, religion: -6 } }, { ergebnis: 'Ein politisches Erdbeben. Die Mehrheit am Gericht kippt.' }),
      o('Eine Amtszeitbegrenzung für Richter vorschlagen', { pk: -3, delta: { legitimitaet: 2 }, fraktionen: { wissenschaft: 3 } }, { ergebnis: 'Eine Reform, die langfristig wirkt.' }),
      o('Das Urteil hinnehmen', { fraktionen: { partei: -5, arbeiter: -3 } }, {
        aktion: (s) => {
          for (const d of ['gesundheit', 'steuern', 'betriebe']) if (s.politik[d] >= 2) { s.politik[d] -= 1; break; }
        },
        ergebnis: 'Eine deiner Reformen wird rückgängig gemacht.',
      }),
    ],
  },
  {
    id: 'us_militaerbudget',
    laender: ['usa'],
    titel: 'Das Pentagon-Budget',
    bild: '🎖️',
    kategorie: 'land',
    einmalig: true,
    text: 'Das Militärbudget der USA ist größer als das der nächsten neun Länder zusammen. Deine Basis fordert eine Halbierung zugunsten von Gesundheit, Bildung und Klimaschutz. Die Rüstungsindustrie und das Militär sind alarmiert.',
    codex: 'antimilitarismus',
    optionen: [
      o('Um ein Drittel kürzen', { schuldenEinmalig: -3, ziele: { militaermacht: -8 }, fraktionen: { militaer: -15, klima: 6, arbeiter: 3, kapital: -4 }, beziehungen: { westen: -6 } }, { ergebnis: 'Hunderte Milliarden für zivile Zwecke. Die Generäle sind empört.' }),
      o('Behutsam umschichten', { ziele: { militaermacht: -3 }, fraktionen: { militaer: -4, klima: 2 } }, { ergebnis: 'Ein kleiner Anfang.' }),
      o('Nicht anrühren', { fraktionen: { militaer: 4, klima: -4, partei: -3 } }, { ergebnis: 'Der militärisch-industrielle Komplex bleibt unangetastet.' }),
    ],
  },
  {
    id: 'us_union_drive',
    laender: ['usa'],
    titel: 'Union Drive',
    bild: '📦',
    kategorie: 'land',
    einmalig: true,
    text: 'Beschäftigte in den Lagern des größten Onlinehändlers versuchen, eine Gewerkschaft zu gründen. Der Konzern setzt Detektive und Anwälte ein. Die Arbeiterinnen bitten um ein Gesetz, das Gewerkschaftsgründungen erleichtert.',
    codex: 'mitbestimmung',
    optionen: [
      o('PRO Act: Gewerkschaftsgründung per Unterschrift', { pk: -4, ziele: { betriebsdemokratie: 6 }, fraktionen: { arbeiter: 10, tech: -8, kapital: -8 }, macht: { arbeiter: 6 } }, { ergebnis: 'Eine Welle von Gewerkschaftsgründungen erfasst das Land.' }),
      o('Symbolische Unterstützung', { fraktionen: { arbeiter: 2 } }, { ergebnis: 'Die Kampagne scheitert knapp.' }),
    ],
  },

  // ─────────────── Brasilien ───────────────
  {
    id: 'br_amazonas',
    laender: ['brasilien'],
    titel: 'Der Amazonas am Kipppunkt',
    bild: '🌳',
    kategorie: 'land',
    abstand: 20,
    text: 'Satellitenbilder zeigen: Die illegale Abholzung im Amazonas hat wieder zugenommen. Forschende warnen, dass der Regenwald bei 20–25 % Verlust in eine Savanne kippen könnte – mit katastrophalen Folgen für das Weltklima.',
    codex: 'kipppunkte',
    optionen: [
      o('Null Abholzung durchsetzen – mit Militär und Satellitenüberwachung', { schuldenEinmalig: 0.5, ziele: { natur: 5 }, fraktionen: { klima: 10, kapital: -8, land: -4, militaer: 3 }, delta: { weltklima: 3 } }, { ergebnis: 'Die Abholzung sinkt um 80 %. Agrarbarone toben.' }),
      o('Indigene Territorien anerkennen und schützen', { ziele: { natur: 4, minderheitenrechte: 3 }, fraktionen: { minderheiten: 8, klima: 8, kapital: -6 }, delta: { weltklima: 2 } }, { ergebnis: 'Indigene Völker sind die besten Hüter des Waldes.', codex: 'rechte_der_natur' }),
      o('Die Agrarlobby gewähren lassen', { fraktionen: { kapital: 6, klima: -12 }, ziele: { natur: -5 } }, {
        aktion: (s) => {
          if (s.werte.natur < 48) {
            s.flags.amazonas_kipp = 1;
            return 'Der Amazonas hat den Kipppunkt überschritten. Er beginnt zu sterben.';
          }
        },
        ergebnis: 'Die Bulldozer rollen weiter.',
      }),
    ],
  },
  {
    id: 'br_mst',
    laender: ['brasilien'],
    titel: 'Die Landlosen',
    bild: '🌾',
    kategorie: 'land',
    einmalig: true,
    text: 'Die Landlosenbewegung MST besetzt brachliegende Großgrundbesitze. Sie fordert die überfällige Landreform: 1 % der Eigentümer besitzen fast die Hälfte des Landes.',
    codex: 'agraroekologie',
    optionen: [
      o('Eine umfassende Landreform beschließen', { pk: -5, ziele: { ungleichheit: -2, natur: 2 }, fraktionen: { land: 12, arbeiter: 4, kapital: -12, militaer: -3 } }, {
        aktion: (s) => {
          s.politik.landwirtschaft = 2;
        },
        ergebnis: 'Hunderttausende Familien erhalten Land. Sie bauen ökologisch an und ernähren die Städte.',
      }),
      o('Besetzungen legalisieren, wo Land brachliegt', { fraktionen: { land: 6, kapital: -5 } }, { ergebnis: 'Ein pragmatischer Schritt.' }),
      o('Räumen lassen', { fraktionen: { land: -10, kapital: 5, arbeiter: -4 } }, { ergebnis: 'Die Bilder der Räumungen spalten deine Bewegung.' }),
    ],
  },
  {
    id: 'br_militaer',
    laender: ['brasilien'],
    titel: 'Die Erinnerung an 1964',
    bild: '🪖',
    kategorie: 'land',
    einmalig: true,
    text: 'Eine Wahrheitskommission legt neue Beweise über Folter und Morde der Militärdiktatur vor. Einige der Verantwortlichen sind noch in hohen Positionen. Das Militär warnt vor einer „Hexenjagd“.',
    codex: 'putsch',
    optionen: [
      o('Die Verantwortlichen vor Gericht stellen', { delta: { legitimitaet: 4 }, ziele: { militaermacht: -4 }, fraktionen: { militaer: -12, minderheiten: 4, feministisch: 3 } }, { ergebnis: 'Gerechtigkeit nach 60 Jahren. Die Kasernen brodeln.' }),
      o('Gedenken ja, Prozesse nein', { fraktionen: { militaer: 3, partei: -3 } }, { ergebnis: 'Ein fauler Frieden.' }),
    ],
  },
  {
    id: 'br_bolsa',
    laender: ['brasilien'],
    titel: 'Hunger ist zurück',
    bild: '🍲',
    kategorie: 'land',
    einmalig: true,
    text: 'Nach Jahren der Krise hungern wieder Millionen Brasilianerinnen. In den Favelas organisieren Nachbarschaftsküchen die Versorgung. Sie bitten den Staat um Unterstützung.',
    optionen: [
      o('Ein umfassendes Null-Hunger-Programm', { schuldenEinmalig: 1.5, ziele: { ungleichheit: -2, gesundheit: 2 }, fraktionen: { arbeiter: 6, minderheiten: 4, religion: 4 } }, { ergebnis: 'Brasilien verlässt erneut die Welthungerkarte.' }),
      o('Die Volksküchen fördern', { schuldenEinmalig: 0.4, delta: { bewusstsein: 3 }, fraktionen: { arbeiter: 3 } }, { ergebnis: 'Selbstorganisation wird gestärkt.' }),
    ],
  },

  // ─────────────── Indien ───────────────
  {
    id: 'in_hitze',
    laender: ['indien'],
    titel: 'Tödliche Feuchtigkeit',
    bild: '🥵',
    kategorie: 'land',
    abstand: 12,
    wenn: (s) => s.werte.temperatur > 1.55,
    text: 'In Uttar Pradesh steigt die Feuchtkugeltemperatur auf lebensgefährliche Werte. Bauarbeiter und Landarbeiterinnen sterben auf Feldern und Baustellen. Die meisten von ihnen arbeiten ohne Vertrag und ohne Schutz.',
    codex: 'klimakrise',
    optionen: [
      o('Gesetzliches Hitzeschutzrecht für alle, auch informell Beschäftigte', { schuldenEinmalig: 0.6, ziele: { anpassung: 3, informell: -2 }, fraktionen: { arbeiter: 8, land: 4, kapital: -3 } }, { ergebnis: 'Arbeitsverbot bei Extremhitze mit Lohnfortzahlung aus einem staatlichen Fonds.' }),
      o('Kühle Dächer und Bäume in allen Städten', { schuldenEinmalig: 0.8, ziele: { anpassung: 4 } }, { ergebnis: 'Weiße Dächer und Millionen Bäume senken die Temperatur in den Städten.' }),
    ],
  },
  {
    id: 'in_bauern',
    laender: ['indien'],
    titel: 'Der Bauernaufstand',
    bild: '🚜',
    kategorie: 'land',
    einmalig: true,
    text: 'Hunderttausende Bäuerinnen und Bauern aus Punjab und Haryana kampieren vor Delhi. Sie fordern garantierte Mindestpreise für ihre Ernte und Schutz vor Agrarkonzernen. Schon einmal haben sie eine Regierung in die Knie gezwungen.',
    optionen: [
      o('Mindestpreise gesetzlich garantieren', { schuldenEinmalig: 1, fraktionen: { land: 14, kapital: -6 } }, { ergebnis: 'Ein Sieg für die Bauernbewegung – und für dich.' }),
      o('Genossenschaften und Agrarökologie fördern', { schuldenEinmalig: 0.6, ziele: { natur: 2, gemeineigentum: 1 }, fraktionen: { land: 8, klima: 4 } }, { ergebnis: 'Ein Weg aus der Abhängigkeit von Konzernen und Krediten.' }),
    ],
  },
  {
    id: 'in_kerala',
    laender: ['indien'],
    titel: 'Das Kerala-Modell',
    bild: '🌴',
    kategorie: 'land',
    einmalig: true,
    text: 'Kerala hat trotz geringen Einkommens eine Lebenserwartung, Alphabetisierung und Gesundheitsversorgung wie reiche Länder. Ein Expertenteam schlägt vor, das Modell landesweit zu übertragen: Bildung, Gesundheit, lokale Selbstverwaltung, Landreform.',
    codex: 'kerala',
    optionen: [
      o('Das Kerala-Modell landesweit einführen', { pk: -5, schuldenEinmalig: 1.5, ziele: { bildung: 4, gesundheit: 4, partizipation: 4, frauenrechte: 2 }, fraktionen: { arbeiter: 5, feministisch: 4, wissenschaft: 4 } }, { ergebnis: 'Ein Jahrzehnteprojekt beginnt.' }),
      o('Pilotregionen auswählen', { schuldenEinmalig: 0.5, ziele: { bildung: 1.5, gesundheit: 1.5 } }, { ergebnis: 'Ein vorsichtiger Anfang.' }),
    ],
  },
  {
    id: 'in_kommunal',
    laender: ['indien'],
    titel: 'Gewalt zwischen den Gemeinschaften',
    bild: '🕯️',
    kategorie: 'land',
    abstand: 20,
    wenn: (s) => s.werte.faschismus > 30,
    text: 'Nach Gerüchten in sozialen Medien greifen nationalistische Mobs ein muslimisches Viertel an. Häuser brennen. Die Polizei schaut zu.',
    codex: 'faschismus',
    optionen: [
      o('Sofort Bundespolizei schicken und Täter verfolgen', { delta: { faschismus: -2, unruhe: -3 }, fraktionen: { minderheiten: 10, religion: -4 } }, { ergebnis: 'Die Gewalt wird gestoppt, die Täter angeklagt.' }),
      o('Interreligiöse Friedenskomitees in allen Städten', { ziele: { integration: 3 }, delta: { bewusstsein: 2 }, fraktionen: { minderheiten: 5, religion: 3 } }, { ergebnis: 'Hindus, Muslime, Sikhs und Christen schützen gemeinsam ihre Nachbarschaften.' }),
    ],
  },

  // ─────────────── Südafrika ───────────────
  {
    id: 'za_loadshedding',
    laender: ['suedafrika'],
    titel: 'Load Shedding',
    bild: '🔌',
    kategorie: 'land',
    abstand: 12,
    wenn: (s) => s.werte.erneuerbar < 40,
    text: 'Das staatliche Energieunternehmen ist marode und korrupt. Täglich fällt für Stunden der Strom aus. Krankenhäuser, Schulen und Betriebe leiden. Private Investoren bieten an, das Netz zu übernehmen.',
    optionen: [
      o('Eskom sanieren und mit Solarparks in Bürgerhand ergänzen', { schuldenEinmalig: 2, ziele: { erneuerbar: 5, korruption: -2 }, fraktionen: { arbeiter: 5, klima: 6 } }, { ergebnis: 'Ein öffentliches, erneuerbares Stromsystem entsteht.' }),
      o('Privatisieren', { schuldenEinmalig: -2, ziele: { gemeineigentum: -3, erneuerbar: 2 }, fraktionen: { kapital: 6, arbeiter: -8 } }, { ergebnis: 'Der Strom kommt zurück – zu höheren Preisen.' }),
    ],
  },
  {
    id: 'za_land',
    laender: ['suedafrika'],
    titel: 'Die Landfrage',
    bild: '🗺️',
    kategorie: 'land',
    einmalig: true,
    text: 'Drei Jahrzehnte nach der Apartheid besitzt eine kleine weiße Minderheit noch immer den Großteil des Agrarlands. Die Landlosen werden ungeduldig. Ein Gesetz zur Enteignung ohne Entschädigung liegt auf dem Tisch.',
    codex: 'agraroekologie',
    optionen: [
      o('Landreform mit Entschädigung zum Ertragswert', { pk: -4, schuldenEinmalig: 2, ziele: { ungleichheit: -2 }, fraktionen: { land: 10, kapital: -6 }, beziehungen: { westen: -4 } }, {
        aktion: (s) => { s.politik.landwirtschaft = 2; },
        ergebnis: 'Millionen Hektar werden umverteilt – geordnet und mit Unterstützung für die neuen Bäuerinnen.',
      }),
      o('Enteignung ohne Entschädigung', { pk: -5, ziele: { ungleichheit: -3 }, fraktionen: { land: 14, kapital: -15, mittelstand: -6 }, beziehungen: { westen: -15, maerkte: -15 }, delta: { kapitalflucht: 10 } }, {
        aktion: (s) => { s.politik.landwirtschaft = 2; },
        ergebnis: 'Ein radikaler Bruch mit dem kolonialen Erbe. Die Märkte reagieren panisch.',
      }),
      o('Aufschieben', { fraktionen: { land: -8 }, delta: { unruhe: 4 } }, { ergebnis: 'Die Geduld der Landlosen ist erschöpft.' }),
    ],
  },
  {
    id: 'za_jugendarbeitslosigkeit',
    laender: ['suedafrika'],
    titel: 'Eine verlorene Generation?',
    bild: '🧑🏿‍🎓',
    kategorie: 'land',
    einmalig: true,
    text: 'Fast jeder zweite junge Mensch ist arbeitslos. In den Townships wächst die Verzweiflung. Eine Jugendbewegung fordert eine Jobgarantie für alle unter 35.',
    codex: 'jobgarantie',
    optionen: [
      o('Ein Jugend-Beschäftigungsprogramm in Pflege, Bildung und Renaturierung', { schuldenEinmalig: 2, ziele: { arbeitslosigkeit: -3, anpassung: 2 }, fraktionen: { arbeiter: 6, klima: 4 }, delta: { unruhe: -4 } }, { ergebnis: 'Eine Million junge Menschen bekommen sinnvolle Arbeit.' }),
      o('Ausbildungsplätze subventionieren', { schuldenEinmalig: 0.8, ziele: { arbeitslosigkeit: -1, bildung: 1 } }, { ergebnis: 'Ein bescheidener, aber realistischer Schritt.' }),
    ],
  },
  {
    id: 'za_xenophobie',
    laender: ['suedafrika'],
    titel: 'Angriffe auf Migranten',
    bild: '🔥',
    kategorie: 'land',
    abstand: 20,
    text: 'In Johannesburg greifen Mobs Läden von Migranten aus Simbabwe, Mosambik und Nigeria an. „Sie nehmen uns die Jobs weg“, rufen die Angreifer. Nachbarländer protestieren.',
    optionen: [
      o('Schutz für Migrantinnen und eine Kampagne gegen Fremdenhass', { delta: { faschismus: -2 }, ziele: { integration: 3 }, fraktionen: { minderheiten: 8 }, beziehungen: { sueden: 6 } }, { ergebnis: 'Ubuntu – ich bin, weil wir sind.' }),
      o('Grenzkontrollen verschärfen', { fraktionen: { minderheiten: -8, arbeiter: 2 }, beziehungen: { sueden: -8 } }, { ergebnis: 'Die Spannungen in der Region wachsen.' }),
    ],
  },

  // ─────────────── Chile ───────────────
  {
    id: 'cl_lithium',
    laender: ['chile'],
    titel: 'Das weiße Gold',
    bild: '⚪',
    kategorie: 'land',
    einmalig: true,
    text: 'In der Atacama liegen die größten Lithiumreserven der Welt – unverzichtbar für Batterien. Private Konzerne fördern es mit gewaltigem Wasserverbrauch, die indigenen Gemeinden leiden unter Dürre. Die Konzessionen laufen aus.',
    codex: 'rohstoffe',
    optionen: [
      o('Ein staatliches Lithiumunternehmen gründen – mit indigener Mitbestimmung', { pk: -4, ziele: { gemeineigentum: 3, natur: 1 }, fraktionen: { arbeiter: 5, minderheiten: 6, kapital: -8 }, beziehungen: { westen: -5, china: 3 } }, {
        modifikator: { name: 'Öffentliches Lithium', runden: 16, effekte: { wachstum: 0.3, haushalt: -0.8 }, gut: true },
        ergebnis: 'Die Gewinne fließen in Bildung und Gesundheit. Die Gemeinden entscheiden über den Wasserverbrauch.',
      }),
      o('Konzessionen verlängern – gegen höhere Abgaben', { schuldenEinmalig: -2, fraktionen: { kapital: 4, minderheiten: -4 } }, { ergebnis: 'Mehr Geld für den Staat. Die Wüste trocknet weiter aus.' }),
    ],
  },
  {
    id: 'cl_afp',
    laender: ['chile'],
    titel: 'Die Rentenfrage',
    bild: '👴',
    kategorie: 'land',
    einmalig: true,
    text: 'Das unter Pinochet privatisierte Rentensystem zahlt Millionen Rentnerinnen weniger als den Mindestlohn. „No más AFP“ war der Schlachtruf der Proteste von 2019. Die privaten Rentenfonds kontrollieren riesige Vermögen.',
    optionen: [
      o('Ein öffentliches, solidarisches Rentensystem schaffen', { pk: -5, schuldenEinmalig: 2, ziele: { ungleichheit: -3, gemeineigentum: 3 }, fraktionen: { arbeiter: 10, feministisch: 4, kapital: -12 }, beziehungen: { maerkte: -10 } }, { ergebnis: 'Ein historischer Bruch mit dem Erbe der Diktatur.' }),
      o('Eine staatliche Mindestrente einführen', { schuldenEinmalig: 1, ziele: { ungleichheit: -1 }, fraktionen: { arbeiter: 5, kapital: -3 } }, { ergebnis: 'Keine Rente mehr unter dem Existenzminimum.' }),
    ],
  },
  {
    id: 'cl_verfassung',
    laender: ['chile'],
    titel: 'Eine neue Verfassung',
    bild: '📜',
    kategorie: 'land',
    einmalig: true,
    text: 'Chile lebt noch immer mit der Verfassung der Pinochet-Diktatur. Zwei Anläufe für eine neue sind gescheitert. Die Bewegungen wollen einen dritten Versuch – diesmal mit breiterer Beteiligung.',
    codex: 'buergerraete',
    optionen: [
      o('Einen gewählten Verfassungskonvent mit Geschlechterparität einberufen', { pk: -4, ziele: { partizipation: 5, frauenrechte: 2, minderheitenrechte: 2 }, delta: { legitimitaet: 5 }, fraktionen: { feministisch: 6, minderheiten: 5, klima: 4, kapital: -5 } }, {
        aktion: (s, rnd) => {
          if (rnd() < 0.35 + s.werte.zustimmung / 200) {
            s.bonus.legitimitaet = (s.bonus.legitimitaet ?? 0) + 5;
            return 'Diesmal klappt es: Die neue Verfassung wird angenommen – mit Rechten der Natur, sozialen Grundrechten und Parität.';
          }
          return 'Auch dieser Entwurf scheitert im Referendum. Die Spaltung des Landes wird sichtbar.';
        },
      }),
      o('Die alte Verfassung schrittweise reformieren', { delta: { legitimitaet: 1 } }, { ergebnis: 'Kleine Schritte statt großem Wurf.' }),
    ],
  },
  {
    id: 'cl_allende',
    laender: ['chile'],
    titel: 'Der 11. September',
    bild: '🌹',
    kategorie: 'land',
    abstand: 20,
    text: 'Jahrestag des Putsches gegen Salvador Allende. Tausende ziehen zum Moneda-Palast. Historikerinnen erinnern daran, wie Konzerne, Opposition und eine fremde Großmacht die Regierung damals destabilisierten.',
    codex: 'allende',
    optionen: [
      o('Eine bewegende Gedenkrede halten', { delta: { bewusstsein: 3, legitimitaet: 2 }, fraktionen: { partei: 3, militaer: -2 } }, { ergebnis: '„Die Geschichte gehört uns, und die Völker machen sie.“' }),
      o('Lehren ziehen: Die Armee verfassungstreu reformieren', { ziele: { militaermacht: -3 }, fraktionen: { militaer: -5, partei: 3 } }, { ergebnis: 'Nie wieder sollen Panzer gegen eine gewählte Regierung rollen.', codex: 'zivile_kontrolle' }),
    ],
  },

  // ─────────────── Polen ───────────────
  {
    id: 'pl_kohle',
    laender: ['polen'],
    titel: 'Schlesiens Zukunft',
    bild: '⛏️',
    kategorie: 'land',
    einmalig: true,
    text: 'Polen gewinnt noch immer den Großteil seines Stroms aus Kohle. In Schlesien hängen Zehntausende Jobs daran. Die EU drängt auf den Ausstieg, die Bergleute auf Garantien.',
    codex: 'gerechter_uebergang',
    optionen: [
      o('Ein Gesellschaftsvertrag: Ausstieg bis 2040 mit Jobgarantie', { pk: -4, ziele: { erneuerbar: 4, arbeitslosigkeit: -0.5 }, fraktionen: { arbeiter: 6, klima: 6 } }, {
        aktion: (s) => { if (s.politik.jobgarantie < 1) s.politik.jobgarantie = 1; },
        ergebnis: 'Gewerkschaften und Regierung unterzeichnen einen historischen Vertrag.',
      }),
      o('Kohle so lange wie möglich behalten', { fraktionen: { arbeiter: 4, klima: -10 }, beziehungen: { westen: -4 } }, { ergebnis: 'Die Kumpel atmen auf. Die Luft in Krakau nicht.' }),
    ],
  },
  {
    id: 'pl_abtreibung',
    laender: ['polen'],
    titel: 'Der Frauenstreik',
    bild: '⚡',
    kategorie: 'land',
    einmalig: true,
    wenn: (s) => s.politik.reproduktion <= 1,
    text: 'Mit roten Blitzen auf Plakaten gehen Hunderttausende Polinnen auf die Straße – wie schon 2020. Sie fordern endlich ein liberales Abtreibungsrecht. Die Kirche mobilisiert dagegen.',
    codex: 'selbstbestimmung',
    optionen: [
      o('Legalisierung bis zur 12. Woche', { pk: -4, fraktionen: { feministisch: 14, religion: -12, klima: 3 } }, {
        aktion: (s) => { s.politik.reproduktion = 2; },
        ergebnis: 'Ein Sieg der Frauenbewegung nach Jahrzehnten des Kampfes.',
      }),
      o('Ein Referendum ansetzen', { pk: -2, delta: { partizipation: 2 } }, {
        aktion: (s, rnd) => {
          if (rnd() < 0.55) { s.politik.reproduktion = 2; return 'Eine Mehrheit stimmt für die Legalisierung.'; }
          return 'Das Referendum scheitert knapp.';
        },
      }),
      o('Nicht anrühren', { fraktionen: { feministisch: -10, religion: 4 } }, { ergebnis: 'Die Frauen fühlen sich verraten.' }),
    ],
  },
  {
    id: 'pl_solidarnosc',
    laender: ['polen'],
    titel: 'Das Erbe der Solidarność',
    bild: '🔴',
    kategorie: 'land',
    einmalig: true,
    text: 'Zum Jahrestag der Streiks auf der Danziger Werft fragen Historiker: Was ist aus dem Traum der Solidarność geworden – von Arbeiterselbstverwaltung und einer „Selbstverwalteten Republik“?',
    codex: 'mitbestimmung',
    optionen: [
      o('An die Ideale der Selbstverwaltung anknüpfen', { delta: { bewusstsein: 4 }, ziele: { betriebsdemokratie: 3 }, fraktionen: { arbeiter: 6, religion: 2 } }, { ergebnis: 'Viele erinnern sich: Die Solidarność wollte Demokratie auch in den Betrieben.' }),
      o('Eine Gedenkfeier ohne politische Botschaft', { fraktionen: { religion: 2 } }, { ergebnis: 'Ein Tag der Erinnerung.' }),
    ],
  },
  {
    id: 'pl_aufruestung',
    laender: ['polen'],
    titel: 'Angst im Osten',
    bild: '🛡️',
    kategorie: 'land',
    einmalig: true,
    text: 'Angesichts des Kriegs jenseits der Grenze fordern Opposition und NATO, die Militärausgaben auf 5 % der Wirtschaftsleistung zu erhöhen. Das Geld würde bei Schulen, Krankenhäusern und Klimaschutz fehlen.',
    codex: 'antimilitarismus',
    optionen: [
      o('Aufrüsten', { schuldenEinmalig: 3, ziele: { militaermacht: 5 }, fraktionen: { militaer: 10, klima: -5, arbeiter: -3 }, beziehungen: { westen: 10 } }, { ergebnis: 'Polen wird zur größten Landarmee Europas.' }),
      o('Verteidigung ja – aber mit Zivilschutz und Resilienz statt Panzerkäufen', { schuldenEinmalig: 1.5, ziele: { anpassung: 3 }, fraktionen: { militaer: 2, klima: 3 }, beziehungen: { westen: 3 } }, { ergebnis: 'Bunker, Netze, Notvorräte und eine Bürgerverteidigung.' }),
    ],
  },

  // ─────────────── Indonesien ───────────────
  {
    id: 'id_jakarta',
    laender: ['indonesien'],
    titel: 'Die sinkende Hauptstadt',
    bild: '🌊',
    kategorie: 'land',
    einmalig: true,
    text: 'Jakarta sinkt jedes Jahr bis zu 25 Zentimeter – durch Grundwasserentnahme und steigende Meere. Die alte Regierung wollte eine neue Hauptstadt im Regenwald Borneos bauen. Was nun?',
    optionen: [
      o('Jakarta retten: Wasserversorgung und Küstenschutz', { schuldenEinmalig: 3, ziele: { anpassung: 6 }, fraktionen: { arbeiter: 4 } }, { ergebnis: 'Ein gewaltiges Rettungsprogramm für 30 Millionen Menschen.' }),
      o('Die neue Hauptstadt weiterbauen', { schuldenEinmalig: 4, ziele: { natur: -3 }, fraktionen: { kapital: 5, klima: -6 } }, { ergebnis: 'Eine glänzende Stadt im Regenwald – für die Elite.' }),
    ],
  },
  {
    id: 'id_nickel',
    laender: ['indonesien'],
    titel: 'Nickelfieber',
    bild: '🔋',
    kategorie: 'land',
    einmalig: true,
    text: 'Indonesien besitzt die größten Nickelvorkommen der Welt. Chinesische und westliche Konzerne bauen Schmelzhütten, betrieben mit Kohlestrom. Regenwald wird gerodet, Flüsse vergiftet. Doch es entstehen auch Hunderttausende Jobs.',
    codex: 'rohstoffe',
    optionen: [
      o('Strenge Umweltauflagen und Ökostrom für die Hütten', { ziele: { natur: 2, verschmutzung: -2, erneuerbar: 2 }, fraktionen: { klima: 6, kapital: -5 }, beziehungen: { china: -4 } }, {
        modifikator: { name: 'Sauberes Nickel', runden: 12, effekte: { wachstum: 0.2 }, gut: true },
        ergebnis: 'Langsamer, aber nachhaltiger.',
      }),
      o('Volle Kraft voraus', { ziele: { natur: -4, verschmutzung: 3 }, fraktionen: { kapital: 6, klima: -8 }, beziehungen: { china: 6 } }, {
        modifikator: { name: 'Nickelboom', runden: 12, effekte: { wachstum: 0.6 } },
        ergebnis: 'Ein Boom – mit verwüsteten Landschaften.',
      }),
      o('Verarbeitung verstaatlichen und Gewinne teilen', { pk: -4, ziele: { gemeineigentum: 3 }, fraktionen: { arbeiter: 5, kapital: -8 }, beziehungen: { china: -5, westen: -5 } }, {
        modifikator: { name: 'Öffentliches Nickel', runden: 12, effekte: { wachstum: 0.3, haushalt: -0.6 }, gut: true },
        ergebnis: 'Die Bodenschätze gehören dem Volk.',
      }),
    ],
  },
  {
    id: 'id_1965',
    laender: ['indonesien'],
    titel: 'Das Schweigen brechen',
    bild: '🕯️',
    kategorie: 'land',
    einmalig: true,
    text: 'Überlebende und Angehörige der Opfer der Massaker von 1965/66 fordern eine offizielle Aufarbeitung. Bis zu einer Million Menschen wurden damals als vermeintliche Kommunisten ermordet. Das Militär und religiöse Hardliner warnen vor „Spaltung“.',
    codex: 'indonesien1965',
    optionen: [
      o('Eine Wahrheitskommission einsetzen', { delta: { legitimitaet: 3, bewusstsein: 4 }, ziele: { buergerrechte: 3 }, fraktionen: { militaer: -10, religion: -4, minderheiten: 4, wissenschaft: 5 } }, { ergebnis: 'Zum ersten Mal spricht der Staat über das Unaussprechliche.' }),
      o('Das Thema ruhen lassen', { fraktionen: { militaer: 3, partei: -3 } }, { ergebnis: 'Das Schweigen geht weiter.' }),
    ],
  },
  {
    id: 'id_palmoel',
    laender: ['indonesien'],
    titel: 'Palmöl und Regenwald',
    bild: '🌴',
    kategorie: 'land',
    abstand: 24,
    text: 'Riesige Brände auf Sumatra und Borneo: Konzerne roden Regenwald für Palmölplantagen. Der Rauch legt halb Südostasien lahm. Kleinbauern hängen vom Palmöl ab.',
    optionen: [
      o('Moratorium für neue Plantagen, Hilfe für Kleinbauern', { schuldenEinmalig: 0.5, ziele: { natur: 4 }, fraktionen: { klima: 8, land: 2, kapital: -8 }, delta: { weltklima: 2 } }, { ergebnis: 'Der Wald bekommt eine Atempause.' }),
      o('Torfmoore wiedervernässen', { schuldenEinmalig: 0.8, ziele: { natur: 3, anpassung: 2 }, fraktionen: { klima: 5 } }, { ergebnis: 'Nasse Moore brennen nicht.' }),
    ],
  },
];
