import type { EreignisDef } from '../schema';
import { o } from './helfer';

export const TECHNIK_EREIGNISSE: EreignisDef[] = [
  {
    id: 'ki_jobverlust',
    titel: 'Die Maschinen kommen',
    bild: '🤖',
    kategorie: 'technik',
    abstand: 14,
    wenn: (s) => s.technologien.includes('fortgeschrittene_ki'),
    text: 'Eine große Versicherung ersetzt 12.000 Sachbearbeiterinnen durch KI. Andere Konzerne kündigen ähnliche Schritte an. Die Gewerkschaften warnen vor Massenarbeitslosigkeit, die Aktien steigen.',
    codex: 'automatisierungsdividende',
    optionen: [
      o('Maschinensteuer und Weiterbildungsgarantie', { ziele: { arbeitslosigkeit: -0.5, techmacht: -2 }, fraktionen: { arbeiter: 6, tech: -6, kapital: -3 } }, { ergebnis: 'Wer automatisiert, finanziert die Weiterbildung der Betroffenen.' }),
      o('Arbeitszeit verkürzen statt Stellen streichen', { fraktionen: { arbeiter: 5, kapital: -4 }, ziele: { arbeitszeit: -1 } }, { ergebnis: 'Die Produktivitätsgewinne werden als freie Zeit verteilt.' }),
      o('Fortschritt nicht aufhalten', { fraktionen: { tech: 6, kapital: 4, arbeiter: -8 } }, {
        modifikator: { name: 'Automatisierungswelle', runden: 6, effekte: { wachstum: 0.4, ziele: { arbeitslosigkeit: 1.5, ungleichheit: 1.5 } } },
        ergebnis: 'Die Gewinne steigen. Die Arbeitslosigkeit auch.',
      }),
    ],
  },
  {
    id: 'deepfake',
    titel: 'Gefälschte Wirklichkeit',
    bild: '🎭',
    kategorie: 'technik',
    abstand: 20,
    wenn: (s) => s.technologien.includes('fortgeschrittene_ki'),
    text: 'Ein gefälschtes Video zeigt angeblich, wie Soldaten Zivilisten erschießen. Es löst Unruhen aus, bevor es als Fälschung entlarvt wird. Niemand weiß mehr, was echt ist.',
    codex: 'desinformation',
    optionen: [
      o('Kennzeichnungspflicht für KI-Inhalte', { ziele: { techmacht: -2 }, fraktionen: { tech: -5, wissenschaft: 3 } }, { ergebnis: 'Ein digitales Wasserzeichen für jede KI-Erzeugung.' }),
      o('Medienkompetenz in allen Schulen', { schuldenEinmalig: 0.2, ziele: { bildung: 1 }, delta: { faschismus: -1 } }, { ergebnis: 'Eine Generation lernt, Quellen zu prüfen.' }),
    ],
  },
  {
    id: 'rechenzentrum_wasser',
    titel: 'Durstige Rechenzentren',
    bild: '🖥️',
    kategorie: 'technik',
    abstand: 24,
    wenn: (s) => s.technologien.includes('fortgeschrittene_ki'),
    text: 'Ein Tech-Konzern will in {region:agrar} ein riesiges KI-Rechenzentrum bauen. Es würde so viel Strom wie eine Großstadt und Millionen Liter Wasser täglich verbrauchen. Die Region hofft auf Jobs, die Bauern fürchten um ihr Wasser.',
    optionen: [
      o('Genehmigen – mit Auflagen für Ökostrom und Wasserrecycling', { fraktionen: { tech: 4, land: -2 }, ziele: { techmacht: 2 } }, {
        modifikator: { name: 'KI-Investition', runden: 8, effekte: { wachstum: 0.2 } },
        ergebnis: 'Das Rechenzentrum kommt – unter strengen Bedingungen.',
      }),
      o('Ablehnen', { fraktionen: { tech: -6, land: 5, klima: 3 } }, { ergebnis: 'Das Wasser bleibt bei den Menschen.' }),
      o('Ein öffentliches Rechenzentrum an seiner Stelle bauen', { schuldenEinmalig: 1.5, ziele: { techmacht: -3 }, fraktionen: { tech: -4, wissenschaft: 4 } }, { ergebnis: 'Rechenleistung als Gemeingut – für Forschung, Verwaltung, Planung.' }),
    ],
  },
  {
    id: 'algorithmus_radikal',
    titel: 'Der Algorithmus',
    bild: '📱',
    kategorie: 'technik',
    abstand: 18,
    gewicht: (s) => s.werte.techmacht / 40,
    text: 'Interne Dokumente einer Plattform belegen: Der Algorithmus verstärkt gezielt Wut und Hass, weil das mehr Werbeeinnahmen bringt. Jugendliche werden systematisch in rechtsextreme Inhalte gelenkt.',
    codex: 'techoligarchie',
    optionen: [
      o('Algorithmen offenlegen und auditieren lassen', { ziele: { techmacht: -3 }, delta: { faschismus: -1 }, fraktionen: { tech: -8, wissenschaft: 3 } }, { ergebnis: 'Unabhängige Prüferinnen bekommen Zugriff auf den Code.' }),
      o('Eine öffentliche Alternative fördern', { schuldenEinmalig: 0.4, ziele: { techmacht: -2 }, fraktionen: { tech: -4, wissenschaft: 2 } }, { ergebnis: 'Ein werbefreies, gemeinnütziges Netzwerk startet.' }),
      o('Nichts unternehmen', { ziele: { techmacht: 1 }, delta: { faschismus: 1 }, fraktionen: { tech: 3 } }, { ergebnis: 'Die Plattform macht weiter wie bisher.' }),
    ],
  },
  {
    id: 'datenleck',
    titel: 'Datenleck',
    bild: '🔓',
    kategorie: 'technik',
    abstand: 24,
    text: 'Hacker haben die Gesundheitsdaten von 30 Millionen Menschen erbeutet und bieten sie im Darknet an. Ein privater Dienstleister hatte die Daten unverschlüsselt gespeichert.',
    optionen: [
      o('Datenschutz drastisch verschärfen', { ziele: { ueberwachung: -2, techmacht: -2 }, fraktionen: { tech: -4, wissenschaft: 2 } }, { ergebnis: 'Strenge Regeln für sensible Daten.' }),
      o('Kritische Infrastruktur in öffentliche Hand', { ziele: { gemeineigentum: 1, techmacht: -2 }, schuldenEinmalig: 0.5 }, { ergebnis: 'Gesundheitsdaten werden nur noch öffentlich verwaltet.' }),
    ],
  },
  {
    id: 'geoengineering_angebot',
    titel: 'Den Himmel verdunkeln?',
    bild: '🛰️',
    kategorie: 'technik',
    einmalig: true,
    wenn: (s) => s.technologien.includes('geoengineering') && s.werte.temperatur > 1.9,
    gewicht: 3,
    text: 'Ein Konsortium aus Tech-Milliardären und Petrostaaten will Schwefelpartikel in die Stratosphäre bringen, um die Erde zu kühlen. Es könnte die Erwärmung bremsen – oder Monsune stören und Millionen Menschen die Ernten rauben. Sie bitten um deine Unterstützung bei den Vereinten Nationen.',
    codex: 'geoengineering',
    optionen: [
      o('Unterstützen – die Lage ist zu verzweifelt', { beziehungen: { sueden: -10 }, fraktionen: { tech: 6, klima: -6, wissenschaft: -3 } }, {
        aktion: (s) => {
          s.flags.geoengineering = 1;
        },
        ergebnis: 'Die Flugzeuge starten. Die Temperatur sinkt langsam. Was das für die Monsune bedeutet, wird sich zeigen.',
      }),
      o('Ablehnen – die Ursachen bekämpfen, nicht die Symptome', { fraktionen: { klima: 4, wissenschaft: 3 }, beziehungen: { sueden: 5 } }, { ergebnis: 'Ohne breite Unterstützung wird das Projekt auf Eis gelegt.' }),
    ],
  },
  {
    id: 'agi_durchbruch',
    titel: 'Die letzte Erfindung',
    bild: '🧠',
    kategorie: 'technik',
    einmalig: true,
    wenn: (s) => s.technologien.includes('allgemeine_ki'),
    gewicht: 5,
    text: 'Eine KI erreicht menschliche Fähigkeiten in fast allen Bereichen. Sie kann forschen, planen, programmieren. Wer sie kontrolliert, kontrolliert die Zukunft. Drei Konzerne besitzen die Modelle. Die Welt hält den Atem an.',
    codex: 'techoligarchie',
    optionen: [
      o('Vergesellschaften: KI als Gemeingut der Menschheit', { pk: -4, ziele: { techmacht: -15, gemeineigentum: 4 }, fraktionen: { tech: -25, arbeiter: 6, wissenschaft: 6 }, beziehungen: { westen: -15 } }, { ergebnis: 'Die Modelle werden offen und demokratisch kontrolliert. Die Produktivitätsgewinne gehören allen.' }),
      o('Strenge staatliche Aufsicht', { ziele: { techmacht: -6, ueberwachung: 3 }, fraktionen: { tech: -10 } }, { ergebnis: 'Die Konzerne bleiben, aber unter Kontrolle.' }),
      o('Den Konzernen freie Hand lassen', { ziele: { techmacht: 12, ungleichheit: 4 }, fraktionen: { tech: 15, arbeiter: -10 } }, {
        modifikator: { name: 'KI-Boom', runden: 10, effekte: { wachstum: 1.2 } },
        ergebnis: 'Ein ungeheurer Boom – und eine ungeheure Machtkonzentration.',
      }),
    ],
  },
  {
    id: 'open_source',
    titel: 'Offene Software',
    bild: '🐧',
    kategorie: 'technik',
    einmalig: true,
    text: 'Eine Gruppe Programmiererinnen schlägt vor, die gesamte Verwaltung auf freie, offene Software umzustellen – unabhängig von US-Konzernen, sicherer und günstiger.',
    codex: 'digitale_gemeingueter',
    optionen: [
      o('Umstellen', { schuldenEinmalig: 0.4, ziele: { techmacht: -3, buerokratie: -2 }, fraktionen: { tech: -5, wissenschaft: 5 }, beziehungen: { westen: -3 } }, { ergebnis: 'Ein mühsamer Umstieg, der sich langfristig auszahlt.' }),
      o('Bei bewährten Anbietern bleiben', { fraktionen: { tech: 2 } }, { ergebnis: 'Die Abhängigkeit bleibt.' }),
    ],
  },
  {
    id: 'gentechnik',
    titel: 'Gentechnik auf dem Acker',
    bild: '🧬',
    kategorie: 'technik',
    abstand: 40,
    wenn: (s) => s.werte.temperatur > 1.7,
    text: 'Neue gentechnische Verfahren versprechen dürreresistente Pflanzen. Agrarkonzerne wollen sie patentieren, Bauernverbände fürchten Abhängigkeit, Umweltgruppen sind gespalten.',
    optionen: [
      o('Zulassen – aber nur als patentfreies Gemeingut', { ziele: { anpassung: 3 }, fraktionen: { land: 4, wissenschaft: 4, kapital: -4 } }, { ergebnis: 'Öffentliche Forschung entwickelt freie Sorten für alle.' }),
      o('Den Konzernen überlassen', { ziele: { anpassung: 2 }, fraktionen: { kapital: 4, land: -5 } }, { ergebnis: 'Die Pflanzen helfen – die Lizenzgebühren nicht.' }),
      o('Verbieten', { fraktionen: { klima: 2, wissenschaft: -4 } }, { ergebnis: 'Das Vorsorgeprinzip siegt.' }),
    ],
  },
];
