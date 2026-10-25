import type { EreignisDef } from '../schema';
import { o } from './helfer';

export const POLITIK_EREIGNISSE: EreignisDef[] = [
  {
    id: 'korruption_partei',
    titel: 'Skandal in den eigenen Reihen',
    bild: '💼',
    kategorie: 'politik',
    abstand: 16,
    gewicht: (s) => 0.5 + s.werte.korruption / 40,
    text: 'Ein Minister deiner Partei hat Aufträge an die Firma seines Schwagers vergeben. Die Opposition fordert deinen Rücktritt, die Presse wittert Blut.',
    optionen: [
      o('Sofort entlassen und Anklage zulassen', { delta: { legitimitaet: 4, korruption: -2 }, fraktionen: { partei: -6, wissenschaft: 3 } }, { ergebnis: 'Schmerzhaft, aber glaubwürdig.' }),
      o('Ihn schützen', { delta: { legitimitaet: -6, korruption: 2 }, fraktionen: { partei: 4, wissenschaft: -4, mittelstand: -3 } }, { ergebnis: 'Die Partei hält zusammen – das Land verliert Vertrauen.' }),
      o('Eine unabhängige Antikorruptionsbehörde schaffen', { pk: -3, delta: { legitimitaet: 5 }, ziele: { korruption: -3 }, fraktionen: { partei: -4, wissenschaft: 4, mittelstand: 3 } }, { ergebnis: 'Aus dem Skandal wird eine Reform.' }),
    ],
  },
  {
    id: 'fluegelstreit',
    titel: 'Flügelkampf',
    bild: '🪶',
    kategorie: 'politik',
    abstand: 14,
    text: 'Auf dem Parteitag eskaliert der Streit: Der radikale Flügel wirft dir Verrat an den Grundsätzen vor, der pragmatische Flügel warnt vor Abenteuern, die Wahlen kosten. Beide wollen ein Bekenntnis von dir.',
    optionen: [
      o('Mit den Radikalen: Tempo und Klarheit', { fraktionen: { partei: 4, arbeiter: 3, klima: 3, mittelstand: -4 }, delta: { bewusstsein: 2 } }, { ergebnis: 'Die Basis ist begeistert. Die Mitte ist verunsichert.' }),
      o('Mit den Pragmatikern: Schritt für Schritt', { fraktionen: { partei: -2, mittelstand: 4, wissenschaft: 2, klima: -3 } }, { ergebnis: 'Du gewinnst die Mitte – und verlierst ein wenig Feuer.' }),
      o('Eine gemeinsame Programmkommission einsetzen', { pk: -2, fraktionen: { partei: 5 } }, { ergebnis: 'Ein Kompromiss, der beide Seiten einbindet.' }),
    ],
  },
  {
    id: 'verfassungsgericht',
    titel: 'Das Gericht entscheidet',
    bild: '⚖️',
    kategorie: 'politik',
    abstand: 14,
    wenn: (s) => s.system === 'parlamentarisch' || s.system === 'praesidial',
    gewicht: (s) => (s.politik.wohnen >= 3 || s.politik.industrie >= 2 || s.politik.steuern >= 3 ? 2 : 0.3),
    text: 'Das Verfassungsgericht prüft eines deiner wichtigsten Gesetze. Konservative Richter könnten es kippen. Deine Partei fordert, das Gericht mit eigenen Leuten zu besetzen.',
    codex: 'gewaltenteilung',
    optionen: [
      o('Das Urteil respektieren, egal wie es ausfällt', { delta: { legitimitaet: 4 }, fraktionen: { wissenschaft: 3, mittelstand: 3, partei: -3 } }, {
        aktion: (s, rnd) => {
          if (rnd() < 0.5) {
            const kandidaten = ['wohnen', 'industrie', 'steuern'].filter((d) => s.politik[d] >= 2);
            if (kandidaten.length) {
              const d = kandidaten[0];
              s.politik[d] -= 1;
              return 'Das Gericht kippt das Gesetz teilweise. Du musst nachbessern.';
            }
          }
          return 'Das Gericht bestätigt das Gesetz. Ein großer Sieg – rechtsstaatlich abgesichert.';
        },
      }),
      o('Das Gericht mit loyalen Richtern aufstocken', { delta: { legitimitaet: -8, buergerrechte: -4 }, fraktionen: { partei: 5, wissenschaft: -8, mittelstand: -5 }, beziehungen: { westen: -8 } }, { ergebnis: 'Dein Gesetz ist sicher. Aber du hast eine Tür geöffnet, durch die später andere gehen werden.', codex: 'autoritarismus' }),
    ],
  },
  {
    id: 'terrorzelle',
    titel: 'Umsturzpläne',
    bild: '🎯',
    kategorie: 'krise',
    abstand: 24,
    wenn: (s) => s.werte.faschismus > 22,
    text: 'Ermittler decken ein Netzwerk aus Rechtsextremen, Ex-Soldaten und Polizisten auf. Sie hatten Waffenlager angelegt und Todeslisten mit Namen von Politikerinnen geführt – auch deinem.',
    codex: 'wehrhafte_demokratie',
    optionen: [
      o('Sicherheitsbehörden gründlich durchleuchten', { delta: { faschismus: -3 }, ziele: { militaermacht: -3 }, fraktionen: { militaer: -8, minderheiten: 5, feministisch: 3 } }, { ergebnis: 'Hunderte Verdachtsfälle in Polizei und Armee. Die Säuberung trifft auf Widerstand.' }),
      o('Mehr Befugnisse für Geheimdienste', { ziele: { ueberwachung: 4 }, delta: { faschismus: -2, buergerrechte: -3 }, fraktionen: { militaer: 4, minderheiten: 2 } }, { ergebnis: 'Mehr Überwachung – die sich später auch gegen andere richten kann.' }),
    ],
  },
  {
    id: 'desinformation_wahl',
    titel: 'Die Lügenmaschine',
    bild: '🤖',
    kategorie: 'politik',
    abstand: 10,
    wenn: (s) => s.naechsteWahl !== null && s.naechsteWahl - s.runde <= 3 && s.naechsteWahl - s.runde > 0,
    gewicht: (s) => 1 + s.werte.techmacht / 30,
    text: 'Kurz vor der Wahl fluten Deepfake-Videos die sozialen Medien. Eines zeigt dich angeblich, wie du „die Abschaffung des Privateigentums an Häusern“ ankündigst. Die Plattformen löschen nichts.',
    codex: 'desinformation',
    optionen: [
      o('Plattformen zur sofortigen Löschung zwingen', { ziele: { techmacht: -2 }, fraktionen: { tech: -8, wissenschaft: 2 } }, { aktion: (s) => { s.flags.wahlkampf = (s.flags.wahlkampf ?? 0) + 1; }, ergebnis: 'Die Videos verschwinden – die Debatte über Zensur nicht.' }),
      o('Mit einer Graswurzel-Kampagne antworten', { pk: -3 }, { aktion: (s) => { s.flags.wahlkampf = (s.flags.wahlkampf ?? 0) + 3; }, ergebnis: 'Hunderttausende Freiwillige klingeln an Türen und sprechen mit ihren Nachbarn. Persönliches Vertrauen schlägt Algorithmen.' }),
      o('Ignorieren', { delta: { zustimmung: 0 } }, { aktion: (s) => { s.flags.wahlkampf = (s.flags.wahlkampf ?? 0) - 3; }, ergebnis: 'Die Lügen verbreiten sich ungehindert.' }),
    ],
  },
  {
    id: 'wahlkampf',
    titel: 'Wahlkampf',
    bild: '📣',
    kategorie: 'politik',
    abstand: 6,
    phasen: ['regierung', 'opposition'],
    wenn: (s) => s.naechsteWahl !== null && s.naechsteWahl - s.runde <= 2 && s.naechsteWahl - s.runde > 0,
    gewicht: 4,
    text: 'Die Wahl steht bevor. Dein Team fragt: Worauf setzen wir im Wahlkampf?',
    optionen: [
      o('Haustürwahlkampf mit Tausenden Freiwilligen', { pk: -2 }, { aktion: (s) => { s.flags.wahlkampf = (s.flags.wahlkampf ?? 0) + 3; }, ergebnis: 'Ihr sprecht mit Millionen Menschen persönlich.' }),
      o('Große Wahlversprechen', undefined, {
        aktion: (s) => { s.flags.wahlkampf = (s.flags.wahlkampf ?? 0) + 2; s.bonus.legitimitaet = (s.bonus.legitimitaet ?? 0) - 1; },
        ergebnis: 'Die Versprechen ziehen – aber du musst sie auch halten.',
      }),
      o('Auf die eigene Bilanz setzen', undefined, {
        aktion: (s) => { s.flags.wahlkampf = (s.flags.wahlkampf ?? 0) + (s.werte.lebensqualitaet > s.basis.lebensqualitaet + 3 ? 4 : 0); },
        ergebnis: 'Wenn sich das Leben der Menschen verbessert hat, merken sie es.',
      }),
    ],
  },
  {
    id: 'whistleblower',
    titel: 'Die Enthüllung',
    bild: '🕵️',
    kategorie: 'politik',
    abstand: 30,
    wenn: (s) => s.werte.ueberwachung > 35,
    text: 'Eine Whistleblowerin enthüllt: Der Geheimdienst überwacht seit Jahren massenhaft Journalistinnen, Gewerkschafter und Klimaaktivistinnen – teilweise ohne Wissen der Regierung.',
    codex: 'ueberwachung',
    optionen: [
      o('Geheimdienst auflösen und neu aufbauen', { ziele: { ueberwachung: -6 }, delta: { legitimitaet: 4, buergerrechte: 3 }, fraktionen: { militaer: -8, wissenschaft: 4, klima: 4 } }, { ergebnis: 'Ein radikaler Schnitt. Die Dienste sind empört.' }),
      o('Strengere parlamentarische Kontrolle', { ziele: { ueberwachung: -3 }, delta: { legitimitaet: 2 }, fraktionen: { militaer: -3 } }, { ergebnis: 'Ein Kompromiss, der hoffentlich hält.' }),
      o('Die Whistleblowerin verfolgen', { delta: { legitimitaet: -6, pressefreiheit: -4 }, fraktionen: { wissenschaft: -6, militaer: 4 } }, { ergebnis: 'Du stellst dich auf die Seite der Überwacher. Viele Anhänger sind fassungslos.' }),
    ],
  },
  {
    id: 'buergerrat_empfehlung',
    titel: 'Der Bürgerrat hat gesprochen',
    bild: '🗣️',
    kategorie: 'politik',
    abstand: 10,
    wenn: (s) => s.politik.partizipation >= 2,
    text: 'Ein ausgeloster Bürgerrat aus 160 Menschen aller Schichten hat monatelang beraten. Seine Empfehlung ist mutiger als deine Regierungspolitik: schneller Klimaschutz, finanziert durch eine Vermögensabgabe.',
    codex: 'buergerraete',
    optionen: [
      o('Die Empfehlung umsetzen', { pk: -3, ziele: { erneuerbar: 4, ungleichheit: -1 }, delta: { legitimitaet: 4, partizipation: 2 }, fraktionen: { klima: 6, kapital: -6 } }, { ergebnis: 'Die Menschen sehen: Ihre Stimme zählt.' }),
      o('Teilweise umsetzen', { ziele: { erneuerbar: 2 }, delta: { legitimitaet: 1 } }, { ergebnis: 'Ein Teil der Empfehlungen wird Gesetz.' }),
      o('Ignorieren', { delta: { legitimitaet: -5, partizipation: -4 }, fraktionen: { klima: -5 } }, { ergebnis: 'Wozu dann überhaupt Bürgerräte?' }),
    ],
  },
  {
    id: 'lobbyskandal',
    titel: 'Gekaufte Gesetze',
    bild: '💰',
    kategorie: 'politik',
    abstand: 20,
    text: 'Recherchen zeigen: Abgeordnete der Opposition haben Gesetzentwürfe wortwörtlich von Konzernlobbyisten übernommen und dafür hoch bezahlte „Beraterverträge“ erhalten.',
    optionen: [
      o('Verbindliches Lobbyregister und Verbot von Nebeneinkünften', { ziele: { korruption: -3 }, delta: { legitimitaet: 3 }, fraktionen: { kapital: -5, wissenschaft: 3 } }, { ergebnis: 'Die Hinterzimmer werden ausgeleuchtet.' }),
      o('Den Skandal politisch ausschlachten', { fraktionen: { arbeiter: 3, partei: 3 } }, { ergebnis: 'Die Opposition ist geschwächt – vorerst.' }),
    ],
  },
  {
    id: 'medienmogul',
    titel: 'Der Medienmogul',
    bild: '📰',
    kategorie: 'politik',
    abstand: 24,
    wenn: (s) => s.politik.medien <= 1,
    text: 'Ein Milliardär kauft die größte Tageszeitung und einen Fernsehsender. Seine erste Anweisung an die Redaktionen: „Mehr Kritik an der Regierung.“',
    codex: 'medienvielfalt',
    optionen: [
      o('Fusionskontrolle für Medien verschärfen', { ziele: { techmacht: -2, pressefreiheit: 2 }, fraktionen: { kapital: -5, wissenschaft: 3 } }, { ergebnis: 'Die Übernahme wird an Auflagen geknüpft: Redaktionsstatute, Unabhängigkeit.' }),
      o('Öffentliche und genossenschaftliche Medien stärken', { schuldenEinmalig: 0.3, ziele: { pressefreiheit: 2 }, delta: { bewusstsein: 1 }, fraktionen: { wissenschaft: 3 } }, { ergebnis: 'Eine Stiftung finanziert unabhängigen Lokaljournalismus.' }),
      o('Hinnehmen', { ziele: { techmacht: 2 }, delta: { faschismus: 1 } }, { ergebnis: 'Die Berichterstattung wird feindseliger.' }),
    ],
  },
  {
    id: 'autoritaere_versuchung',
    titel: 'Die Versuchung',
    bild: '🐍',
    kategorie: 'politik',
    abstand: 30,
    wenn: (s) => (s.system === 'parlamentarisch' || s.system === 'praesidial') && s.werte.zustimmung > 50,
    text: 'Dein Generalsekretär schlägt vor: „Wir haben die Mehrheit. Lass uns die Verfassung ändern, damit uns niemand mehr aufhalten kann – keine Gerichte, keine Konzernmedien, keine Blockaden mehr. Nur so retten wir das Klima und die Menschen.“',
    codex: 'autoritarismus',
    optionen: [
      o('Ablehnen: Die Demokratie ist kein Hindernis, sondern das Ziel', { delta: { legitimitaet: 3 }, fraktionen: { wissenschaft: 3, feministisch: 2, partei: -3 } }, { ergebnis: 'Du erinnerst daran, dass jede Abkürzung zur Diktatur bisher in die Katastrophe geführt hat.' }),
      o('Die Idee prüfen lassen', { fraktionen: { partei: 4, wissenschaft: -3 } }, { ergebnis: 'Ein Papier zirkuliert. Es könnte noch wichtig werden.' }),
    ],
  },
  {
    id: 'spionage',
    titel: 'Spione im Ministerium',
    bild: '🕶️',
    kategorie: 'politik',
    abstand: 30,
    wenn: (s) => s.beziehungen.westen < -20,
    text: 'Der Geheimdienst entdeckt, dass ausländische Agenten Kontakte zu Oppositionspolitikern und Militärs aufgebaut haben. Die Erinnerung an frühere Umstürze in Lateinamerika ist allgegenwärtig.',
    codex: 'putsch',
    optionen: [
      o('Öffentlich machen und Botschafter ausweisen', { beziehungen: { westen: -10, sueden: 4 }, fraktionen: { partei: 4, militaer: 2 }, delta: { bewusstsein: 2 } }, { ergebnis: 'Ein diplomatischer Eklat – und eine Warnung an alle Verschwörer.' }),
      o('Still aufräumen', { ziele: { militaermacht: -2 }, fraktionen: { militaer: -3 } }, { ergebnis: 'Die Kontakte werden gekappt, ohne Aufsehen.' }),
    ],
  },
  {
    id: 'opposition_populist',
    titel: 'Der Volkstribun',
    bild: '🎤',
    kategorie: 'politik',
    abstand: 20,
    wenn: (s) => s.werte.faschismus > 28,
    text: 'Ein charismatischer Rechtspopulist füllt Stadien. Er verspricht, „das Land zurückzuholen“ – von Migranten, Feministinnen und „roten Ideologen“. Seine Umfragewerte steigen.',
    codex: 'faschismus',
    optionen: [
      o('Seine Lügen Punkt für Punkt widerlegen', { fraktionen: { wissenschaft: 3 }, delta: { faschismus: -1 } }, { ergebnis: 'Ein mühsamer, aber notwendiger Kampf.' }),
      o('Seine Themen übernehmen, um ihm Wähler abzujagen', { fraktionen: { minderheiten: -10, feministisch: -6, militaer: 3, religion: 3 }, delta: { faschismus: 2 } }, { ergebnis: 'Wer die Rechte kopiert, macht sie stärker. Die Geschichte zeigt es immer wieder.' }),
      o('Die soziale Frage in den Mittelpunkt stellen', { delta: { faschismus: -2, bewusstsein: 2 }, fraktionen: { arbeiter: 3, land: 2 } }, { ergebnis: 'Du sprichst über das, was die Menschen wirklich bewegt: Löhne, Mieten, Sicherheit.' }),
    ],
  },
];
