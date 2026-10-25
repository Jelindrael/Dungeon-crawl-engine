// Ereignisse, die durch Spielmechanik ausgelöst werden: Amtsantritt, Wahlen, Putsch, Aufstand,
// sowie Ereignisse während Opposition und Regime.
import { machtVerlieren, machtZurueck } from '../../sim/macht';
import type { Spielstand } from '../../sim/types';
import { clamp } from '../../sim/util';
import type { EreignisDef } from '../schema';
import { o } from './helfer';

const widerstand = (s: Spielstand, v: number) => {
  s.widerstand = clamp(s.widerstand + v, 0, 100);
};

export const SYSTEM_EREIGNISSE: EreignisDef[] = [
  {
    id: 'amtsantritt',
    titel: 'Der erste Tag',
    bild: '🌅',
    kategorie: 'politik',
    gewicht: 0,
    text: 'Vor dem Regierungssitz in {hauptstadt} feiern Zehntausende. Gewerkschafterinnen, Klimaaktivisten, Pflegekräfte und Studierende liegen sich in den Armen. Morgen beginnt die Arbeit. Dein Kabinett fragt dich: Womit fangen wir an? Die ersten hundert Tage prägen, wie man dich sehen wird.',
    optionen: [
      o('Soziale Sicherheit zuerst', { fraktionen: { arbeiter: 5, minderheiten: 3, feministisch: 2 } }, {
        hinweis: 'Ein Sofortprogramm gegen Armut und hohe Mieten.',
        modifikator: { name: 'Sofortprogramm', runden: 6, effekte: { ziele: { wohnen: 3, ungleichheit: -1.5 }, haushalt: 1 }, gut: true },
        ergebnis: 'Das Sofortprogramm senkt Mieten und hebt Sozialleistungen an. Die Menschen spüren sofort: Diese Regierung ist anders.',
      }),
      o('Den Klimanotstand ausrufen', { fraktionen: { klima: 8, wissenschaft: 3, kapital: -4 }, ziele: { erneuerbar: 3 } }, {
        hinweis: 'Ein starkes Signal – und dauerhaft mehr Tempo bei der Energiewende.',
        codex: 'klimakrise',
        ergebnis: 'Der Klimanotstand ist ausgerufen. Jedes neue Gesetz muss nun auf seine Klimawirkung geprüft werden.',
      }),
      o('Die Demokratie stärken', { delta: { legitimitaet: 4 }, ziele: { partizipation: 4 }, fraktionen: { wissenschaft: 3, feministisch: 2 } }, {
        hinweis: 'Transparenz, Bürgerbeteiligung und ein Lobbyregister.',
        ergebnis: 'Du öffnest die Regierungsarbeit: Kabinettsprotokolle werden veröffentlicht, Bürgerforen tagen im ganzen Land.',
      }),
      o('Die Märkte beruhigen', { beziehungen: { maerkte: 15, westen: 5 }, fraktionen: { kapital: 8, mittelstand: 4, arbeiter: -4, partei: -4 } }, {
        hinweis: 'Ein solider Haushalt und Gespräche mit Investoren. Deine Basis ist irritiert.',
        ergebnis: 'Die Börsen atmen auf. In deiner Partei fragen manche, wofür sie eigentlich gekämpft haben.',
      }),
    ],
  },
  {
    id: 'wahl_sieg',
    titel: 'Wiedergewählt!',
    bild: '🗳️',
    kategorie: 'politik',
    gewicht: 0,
    text: 'Mit {prozent} % der Stimmen bestätigen die Menschen deine Regierung. In der Wahlnacht fragen dich Journalistinnen, was du mit diesem Mandat vorhast.',
    optionen: [
      o('„Jetzt erst recht!“ – Tempo machen', { pk: 4, fraktionen: { partei: 4, arbeiter: 2 } }, { ergebnis: 'Deine Anhänger jubeln. Die Opposition warnt vor „Durchregieren“.' }),
      o('Versöhnliche Töne anschlagen', { delta: { legitimitaet: 3 }, fraktionen: { mittelstand: 4, religion: 3, kapital: 2 } }, { ergebnis: 'Du reichst auch denen die Hand, die dich nicht gewählt haben.' }),
    ],
  },
  {
    id: 'wahl_niederlage',
    titel: 'Abgewählt',
    bild: '📉',
    kategorie: 'politik',
    gewicht: 0,
    phasen: ['opposition'],
    text: 'Nur {prozent} % – es reicht nicht. Eine konservativ-liberale Regierung übernimmt und hat angekündigt, viele deiner Reformen rückgängig zu machen. Doch Bewegungen sterben nicht an Wahlniederlagen. Genossenschaften, Gewerkschaften und Nachbarschaftsräte bleiben – wenn du sie stärkst.',
    codex: 'opposition',
    optionen: [
      o('Weiterkämpfen – auf der Straße und in den Betrieben', { delta: { bewusstsein: 3 }, fraktionen: { arbeiter: 3, klima: 3 } }, { ergebnis: 'Die Bewegung sammelt sich neu. Die nächste Wahl kommt bestimmt.' }),
      o('Selbstkritische Aufarbeitung', { delta: { bewusstsein: 2, legitimitaet: 3 }, fraktionen: { partei: -4, wissenschaft: 3, mittelstand: 3 } }, { ergebnis: 'Du gestehst Fehler ein. Das kostet intern, aber gewinnt Vertrauen.' }),
    ],
  },
  {
    id: 'machtergreifung',
    titel: 'Die Nacht bricht herein',
    bild: '⛓️',
    kategorie: 'krise',
    gewicht: 0,
    phasen: ['regime'],
    text: 'Die extreme Rechte hat die Macht übernommen. Innerhalb weniger Wochen werden Notstandsgesetze erlassen, Gewerkschaftshäuser durchsucht, kritische Zeitungen geschlossen. Minderheiten leben in Angst. Viele deiner Mitstreiterinnen sind verhaftet. Doch Widerstand ist möglich – die Geschichte zeigt es.',
    codex: 'faschismus',
    optionen: [
      o('In den Untergrund gehen', { delta: { bewusstsein: 3 } }, { aktion: (s) => widerstand(s, 10), ergebnis: 'Ihr baut Netzwerke im Verborgenen auf: in Betrieben, Kirchengemeinden, Universitäten.' }),
      o('Eine Exilregierung bilden', { delta: { weltbewegung: 3 }, beziehungen: { sueden: 8, westen: 5 } }, { aktion: (s) => widerstand(s, 6), ergebnis: 'Aus dem Ausland organisierst du internationalen Druck auf das Regime.' }),
    ],
  },
  {
    id: 'rueckkehr',
    titel: 'Zurück an der Macht',
    bild: '🌄',
    kategorie: 'politik',
    gewicht: 0,
    text: 'Mit {prozent} % hat deine Bewegung die Macht zurückerobert. Doch vieles, was ihr aufgebaut hattet, ist zerstört. Die Menschen erwarten, dass ihr es diesmal besser macht.',
    optionen: [
      o('Das Programm entschlossen wiederherstellen', { pk: 4, fraktionen: { arbeiter: 4, partei: 4 } }, { ergebnis: 'Ihr macht euch sofort an die Arbeit.' }),
      o('Breiter aufstellen und Fehler vermeiden', { delta: { bewusstsein: 3, legitimitaet: 4 }, fraktionen: { mittelstand: 4, wissenschaft: 3 } }, { ergebnis: 'Diesmal wollt ihr mehr Menschen mitnehmen.' }),
    ],
  },
  {
    id: 'regime_sturz',
    titel: 'Das Regime fällt',
    bild: '🕊️',
    kategorie: 'politik',
    gewicht: 0,
    phasen: ['regime'],
    text: 'Generalstreiks, Massenproteste und desertierende Soldaten – das Regime bricht zusammen. Die Machthaber fliehen. Auf den Plätzen tanzen Menschen. Ein Übergangsrat bittet deine Bewegung, die Führung zu übernehmen. Welche Ordnung soll das befreite Land bekommen?',
    codex: 'revolution',
    optionen: [
      o('Parlamentarische Demokratie wiederherstellen', { delta: { legitimitaet: 15, unruhe: -15 } }, {
        aktion: (s) => machtZurueck(s, 'parlamentarisch'),
        ergebnis: 'Freie Wahlen, unabhängige Gerichte, freie Presse – die Demokratie kehrt zurück.',
      }),
      o('Eine partizipative Demokratie gründen', { delta: { legitimitaet: 15, unruhe: -12, partizipation: 10 } }, {
        bedingung: (s) => s.werte.bewusstsein >= 40,
        bedingungText: 'Benötigt Solidarität ≥ 40.',
        aktion: (s) => machtZurueck(s, 'partizipativ'),
        ergebnis: 'Aus dem Widerstand entsteht eine neue Verfassung: Parlament und Bürgerräte teilen sich die Macht.',
      }),
      o('Die Räte übernehmen die Macht', { delta: { legitimitaet: 12, unruhe: -10, partizipation: 20, betriebsdemokratie: 15 } }, {
        bedingung: (s) => s.werte.bewusstsein >= 55,
        bedingungText: 'Benötigt Solidarität ≥ 55.',
        aktion: (s) => machtZurueck(s, 'raete'),
        ergebnis: 'Die Widerstandskomitees in Betrieben und Nachbarschaften werden zur Grundlage einer Rätedemokratie.',
      }),
    ],
  },
  {
    id: 'putsch',
    titel: 'Panzer vor dem Parlament',
    bild: '🪖',
    kategorie: 'krise',
    gewicht: 0,
    text: 'In den frühen Morgenstunden rollen Panzer durch {hauptstadt}. Eine Gruppe von Generälen erklärt im Fernsehen, sie müsse „die Nation vor dem Chaos retten“. Der Regierungssitz ist umstellt. Du hast nur Minuten, um zu entscheiden.',
    codex: 'putsch',
    optionen: [
      o('Zum Generalstreik aufrufen', undefined, {
        hinweis: 'Erfolg hängt von Arbeiterschaft, Solidarität und Legitimität ab.',
        aktion: (s, rnd) => {
          const p = clamp(0.15 + s.fraktionen.arbeiter.loyalitaet / 200 + s.werte.bewusstsein / 150 + s.werte.legitimitaet / 300 - s.werte.militaermacht / 250, 0.1, 0.92);
          if (rnd() < p) {
            s.machtBonus.militaer = (s.machtBonus.militaer ?? 0) - 20;
            s.bonus.militaermacht = (s.bonus.militaermacht ?? 0) - 12;
            s.werte.bewusstsein = clamp(s.werte.bewusstsein + 8, 0, 100);
            s.werte.legitimitaet = clamp(s.werte.legitimitaet + 10, 0, 100);
            s.fraktionen.arbeiter.loyalitaet = clamp(s.fraktionen.arbeiter.loyalitaet + 10, 0, 100);
            s.chronik.push({ runde: s.runde, text: 'Ein Putschversuch scheitert am Generalstreik.', typ: 'gut' });
            return 'Millionen legen die Arbeit nieder. Busse, Züge, Fabriken, Häfen – alles steht still. Nach drei Tagen geben die Putschisten auf. Die Demokratie hat gesiegt – durch die Macht der Vielen.';
          }
          machtVerlieren(s, 'junta');
          return 'Der Streik bleibt zu schwach. Die Generäle übernehmen die Macht. Für dich beginnt die Zeit des Widerstands.';
        },
      }),
      o('Loyale Einheiten mobilisieren', undefined, {
        hinweis: 'Erfolg hängt von der Loyalität des Militärs ab.',
        aktion: (s, rnd) => {
          const p = clamp(0.1 + s.fraktionen.militaer.loyalitaet / 120 + s.werte.legitimitaet / 250 - s.werte.militaermacht / 300, 0.05, 0.85);
          if (rnd() < p) {
            s.machtBonus.militaer = (s.machtBonus.militaer ?? 0) - 10;
            s.werte.legitimitaet = clamp(s.werte.legitimitaet + 5, 0, 100);
            s.chronik.push({ runde: s.runde, text: 'Loyale Truppen schlagen einen Putschversuch nieder.', typ: 'gut' });
            return 'Verfassungstreue Einheiten stellen sich den Putschisten entgegen. Nach einem angespannten Tag ergeben sich die Rädelsführer.';
          }
          machtVerlieren(s, 'junta');
          return 'Die Einheiten laufen über. Die Junta übernimmt die Macht.';
        },
      }),
      o('Den Generälen Zugeständnisse machen', { fraktionen: { militaer: 25, partei: -10, arbeiter: -8 }, delta: { legitimitaet: -8, buergerrechte: -6 }, ziele: { militaermacht: 12 } }, {
        hinweis: 'Du bleibst im Amt – aber das Militär hat dich in der Hand.',
        ergebnis: 'Mehr Budget, Straffreiheit, ein General als Verteidigungsminister. Du hast überlebt. Aber zu welchem Preis?',
      }),
    ],
  },
  {
    id: 'aufstand',
    titel: 'Der Volkszorn',
    bild: '🔥',
    kategorie: 'krise',
    gewicht: 0,
    text: 'Seit Wochen gehen Hunderttausende auf die Straße. Barrikaden brennen in {hauptstadt}, Regierungsgebäude werden belagert. Die Menschen haben das Vertrauen in deine Regierung verloren. Was jetzt?',
    optionen: [
      o('Zurücktreten und Neuwahlen ermöglichen', undefined, {
        aktion: (s) => {
          machtVerlieren(s, 'rechtsregierung');
          return 'Du trittst zurück. Eine Übergangsregierung übernimmt. Deine Bewegung geht in die Opposition – mit der Chance auf einen Neuanfang.';
        },
      }),
      o('Echte Reformen und Dialog anbieten', { delta: { unruhe: -15, legitimitaet: 8, partizipation: 6 }, fraktionen: { arbeiter: 5, klima: 5, feministisch: 5, wissenschaft: 5, partei: -8 }, pk: -6 }, {
        aktion: (s) => {
          if (s.system === 'staatssozialismus' || s.system === 'autoritaer') {
            s.system = 'parlamentarisch';
            s.spielerSystem = 'parlamentarisch';
            s.naechsteWahl = s.runde + 3;
            return 'Du kündigst freie Wahlen an und hebst den Ausnahmezustand auf. Die Proteste flauen ab.';
          }
          return 'Runde Tische im ganzen Land. Die Proteste flauen langsam ab.';
        },
      }),
      o('Mit Gewalt niederschlagen', { delta: { unruhe: -25, legitimitaet: -15, buergerrechte: -12 }, fraktionen: { militaer: 5, arbeiter: -15, feministisch: -12, minderheiten: -12, wissenschaft: -12, klima: -12 }, beziehungen: { westen: -15, sueden: -10 } }, {
        bedingung: (s) => s.fraktionen.militaer.loyalitaet >= 40,
        bedingungText: 'Das Militär folgt dir nicht (Loyalität < 40).',
        codex: 'autoritarismus',
        aktion: (s, rnd) => {
          if (s.fraktionen.militaer.loyalitaet < 55 && rnd() < 0.4) {
            machtVerlieren(s, 'junta');
            return 'Die Generäle nutzen das Chaos – und putschen gegen dich.';
          }
          return 'Die Proteste werden blutig niedergeschlagen. Es ist still auf den Straßen. Doch es ist die Stille der Angst.';
        },
      }),
    ],
  },

  // ───────────── Opposition ─────────────
  {
    id: 'opp_kuerzungen',
    titel: 'Der Kahlschlag',
    bild: '✂️',
    kategorie: 'politik',
    phasen: ['opposition'],
    abstand: 6,
    text: 'Die Regierung kündigt ein Sparpaket an: Kürzungen bei Renten, Krankenhäusern und Schulen. Gewerkschaften und Sozialverbände rufen zum Widerstand auf. Wie reagiert deine Bewegung?',
    optionen: [
      o('Massenproteste organisieren', { delta: { bewusstsein: 3, unruhe: 5 }, fraktionen: { arbeiter: 5, minderheiten: 3 } }, { ergebnis: 'Hunderttausende demonstrieren. Die Regierung wankt.' }),
      o('Verfassungsklage einreichen', { delta: { legitimitaet: 2 }, fraktionen: { wissenschaft: 3, mittelstand: 2 } }, { ergebnis: 'Das Gericht wird Monate brauchen – aber ihr zeigt, dass ihr die Institutionen ernst nehmt.' }),
      o('Solidarische Selbsthilfe aufbauen', { delta: { bewusstsein: 4 }, ziele: { bewusstsein: 1 }, fraktionen: { arbeiter: 2, religion: 3 } }, { ergebnis: 'Tafeln, Stadtteilkliniken und Nachhilfe von Freiwilligen – ihr zeigt, wie Solidarität praktisch aussieht.' }),
    ],
  },
  {
    id: 'opp_privatisierung',
    titel: 'Ausverkauf',
    bild: '🏷️',
    kategorie: 'wirtschaft',
    phasen: ['opposition'],
    abstand: 8,
    text: 'Die Regierung will öffentliche Krankenhäuser, Wasserwerke und Wohnungen an Finanzinvestoren verkaufen. Ein Bündnis aus Mieterinitiativen und Gewerkschaften plant ein Volksbegehren dagegen.',
    optionen: [
      o('Das Volksbegehren unterstützen', { pk: -2, delta: { bewusstsein: 4, partizipation: 3 }, fraktionen: { arbeiter: 4, klima: 2, minderheiten: 2 } }, { ergebnis: 'Über eine Million Unterschriften in wenigen Wochen.' }),
      o('Auf die nächste Wahl setzen', { fraktionen: { arbeiter: -3 } }, { ergebnis: 'Viele fragen sich, wo die Linke war, als es darauf ankam.' }),
    ],
  },
  {
    id: 'opp_spaltung',
    titel: 'Streit in den eigenen Reihen',
    bild: '💢',
    kategorie: 'politik',
    phasen: ['opposition'],
    abstand: 12,
    text: 'Nach der Niederlage streiten die Flügel deiner Bewegung erbittert: Die einen wollen in die Mitte rücken, die anderen radikaler werden. Eine Spaltung droht.',
    optionen: [
      o('Die Einheit über alles stellen', { pk: -2, fraktionen: { partei: 6 } }, { ergebnis: 'Ein mühsamer Kompromiss hält die Bewegung zusammen.' }),
      o('Nach links: Klare Kante zeigen', { delta: { bewusstsein: 3 }, fraktionen: { arbeiter: 4, klima: 4, mittelstand: -5, partei: -3 } }, { ergebnis: 'Die Basis ist begeistert, die Mitte verschreckt.' }),
      o('In die Mitte: Breiter werden', { fraktionen: { mittelstand: 5, religion: 3, arbeiter: -3, klima: -4 } }, { ergebnis: 'Neue Wählerschichten öffnen sich – alte wenden sich ab.' }),
    ],
  },
  {
    id: 'opp_jugend',
    titel: 'Eine neue Generation',
    bild: '🧑‍🎓',
    kategorie: 'gesellschaft',
    phasen: ['opposition'],
    abstand: 10,
    text: 'Schülerinnen und Studierende organisieren sich gegen die Rücknahme des Klimaschutzes. Ihre Proteste sind kreativ, laut und wachsen jede Woche.',
    optionen: [
      o('Ihnen Raum und Ressourcen geben', { delta: { bewusstsein: 4 }, fraktionen: { klima: 8 } }, { ergebnis: 'Eine neue Generation wird politisiert – und viele von ihnen schließen sich euch an.' }),
      o('Sie ihren eigenen Weg gehen lassen', { fraktionen: { klima: 2 } }, { ergebnis: 'Die Bewegung bleibt unabhängig. Vielleicht ist das auch gut so.' }),
    ],
  },
  {
    id: 'opp_streikwelle',
    titel: 'Streikwelle',
    bild: '🪧',
    kategorie: 'wirtschaft',
    phasen: ['opposition'],
    abstand: 10,
    wenn: (s) => s.werte.inflation > 3 || s.werte.arbeitslosigkeit > 7,
    text: 'Steigende Preise und stagnierende Löhne: In Häfen, Krankenhäusern und Fabriken wird gestreikt. Die Regierung droht mit einem Streikverbot.',
    optionen: [
      o('Die Streiks offen unterstützen', { delta: { bewusstsein: 5, unruhe: 6 }, fraktionen: { arbeiter: 8, mittelstand: -3 } }, { aktion: (s) => { s.flags.blockade = s.runde + 2; }, ergebnis: 'Die Streiks weiten sich aus. Die Regierung legt ihre Kürzungspläne vorerst auf Eis.' }),
      o('Zur Mäßigung aufrufen', { fraktionen: { mittelstand: 3, arbeiter: -5 } }, { ergebnis: 'Die Streikenden fühlen sich im Stich gelassen.' }),
    ],
  },

  // ───────────── Regime ─────────────
  {
    id: 'reg_verhaftungen',
    titel: 'Verhaftungswelle',
    bild: '🚔',
    kategorie: 'krise',
    phasen: ['regime'],
    abstand: 4,
    text: 'Die Geheimpolizei hat Listen. In einer einzigen Nacht werden Hunderte Gewerkschafterinnen, Journalisten und Aktivistinnen verhaftet. Dein Netzwerk ist in Gefahr.',
    optionen: [
      o('Untertauchen und abwarten', undefined, { aktion: (s) => widerstand(s, -4), ergebnis: 'Ihr verliert Zeit, aber das Netzwerk überlebt.' }),
      o('Öffentlich protestieren', { delta: { bewusstsein: 4, unruhe: 6 } }, { aktion: (s) => widerstand(s, 8), ergebnis: 'Mutige Menschen gehen auf die Straße. Manche werden verhaftet – aber die Welt sieht hin.' }),
      o('Gefangenenhilfe organisieren', { delta: { bewusstsein: 3 }, fraktionen: { religion: 4, feministisch: 3 } }, { aktion: (s) => widerstand(s, 4), ergebnis: 'Anwältinnen, Kirchen und Familien bilden ein Netzwerk der Solidarität.' }),
    ],
  },
  {
    id: 'reg_soldaten',
    titel: 'Soldaten verweigern',
    bild: '🎖️',
    kategorie: 'politik',
    phasen: ['regime'],
    abstand: 8,
    wenn: (s) => s.widerstand > 30,
    text: 'Eine Einheit hat sich geweigert, auf Demonstrierende zu schießen. Die Offiziere wurden verhaftet, doch die Nachricht verbreitet sich wie ein Lauffeuer.',
    optionen: [
      o('Kontakt zu kritischen Offizieren suchen', { fraktionen: { militaer: 8 } }, { aktion: (s) => widerstand(s, 10), ergebnis: 'Im Militär wächst der Zweifel. Die Stützen des Regimes bröckeln.' }),
      o('Die Geschichte international bekannt machen', { delta: { weltbewegung: 2 } }, { aktion: (s) => widerstand(s, 6), ergebnis: 'Die Bilder gehen um die Welt.' }),
    ],
  },
  {
    id: 'reg_solidaritaet',
    titel: 'Internationale Solidarität',
    bild: '🌐',
    kategorie: 'welt',
    phasen: ['regime'],
    abstand: 8,
    text: 'Gewerkschaften weltweit rufen zum Boykott des Regimes auf. Hafenarbeiter in anderen Ländern weigern sich, Schiffe aus {land} zu entladen.',
    optionen: [
      o('Die Kampagne koordinieren', { delta: { sanktionen: 8 } }, { aktion: (s) => widerstand(s, 8), ergebnis: 'Das Regime gerät wirtschaftlich unter Druck.' }),
      o('Um humanitäre Ausnahmen bitten', { fraktionen: { religion: 3, arbeiter: 2 } }, { aktion: (s) => widerstand(s, 4), ergebnis: 'Der Boykott trifft gezielt die Eliten, nicht die Bevölkerung.' }),
    ],
  },
  {
    id: 'reg_untergrundzeitung',
    titel: 'Flugblätter',
    bild: '📜',
    kategorie: 'gesellschaft',
    phasen: ['regime'],
    abstand: 6,
    text: 'Eine Gruppe Studierender druckt heimlich Flugblätter und verbreitet verschlüsselte Nachrichten. Sie bitten um Unterstützung.',
    optionen: [
      o('Unterstützen', { delta: { bewusstsein: 5 } }, { aktion: (s) => widerstand(s, 6), ergebnis: 'Die Wahrheit findet ihren Weg zu den Menschen.' }),
      o('Zur Vorsicht mahnen', undefined, { aktion: (s) => widerstand(s, 2), ergebnis: 'Ihr schützt sie – und bremst sie.' }),
    ],
  },
  {
    id: 'reg_wirtschaftskrise',
    titel: 'Das Regime wankt',
    bild: '📉',
    kategorie: 'wirtschaft',
    phasen: ['regime'],
    abstand: 10,
    wenn: (s) => s.werte.lebensqualitaet < s.basis.lebensqualitaet - 3,
    text: 'Korruption und Misswirtschaft haben die Wirtschaft ruiniert. Selbst frühere Unterstützer des Regimes murren. Ein Generalstreik liegt in der Luft.',
    optionen: [
      o('Zum Generalstreik aufrufen', { delta: { unruhe: 10, bewusstsein: 4 }, fraktionen: { arbeiter: 6 } }, { aktion: (s) => widerstand(s, 14), ergebnis: 'Das Land steht still.' }),
      o('Bündnis mit enttäuschten Konservativen', { fraktionen: { mittelstand: 6, religion: 6 } }, { aktion: (s) => widerstand(s, 9), ergebnis: 'Ein breites Bündnis gegen das Regime entsteht.' }),
    ],
  },
];
