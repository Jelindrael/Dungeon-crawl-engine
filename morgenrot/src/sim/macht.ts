// Machtwechsel: Übergänge zwischen Regierung, Opposition und Regime.
import { FRAKTION_IDS } from '../data/fraktionen';
import { SYSTEME } from '../data/systeme';
import { anliegenWert, fraktionsZiele, sammleBeitraege } from './beitraege';
import type { Spielstand, SystemId } from './types';
import { land } from './util';

/** Übergang in Opposition (Rechtsregierung) oder Regime. */
export function machtVerlieren(s: Spielstand, neu: 'rechtsregierung' | 'faschistisch' | 'junta') {
  if (s.phase === 'regierung') {
    s.programm = { ...s.politik };
    s.spielerSystem = SYSTEME[s.system].wahlen ? s.system : 'parlamentarisch';
  }
  for (const f of FRAKTION_IDS) s.anliegenBasis[f] = anliegenWert(s, f);
  s.system = neu;
  s.phase = neu === 'rechtsregierung' ? 'opposition' : 'regime';
  s.naechsteWahl = neu === 'rechtsregierung' ? s.runde + 1 + land(s).wahlintervall : null;
  s.widerstand = 0;
  s.projekte = [];
  s.forderungen = [];
  s.pk = Math.min(s.pk, 6);
  s.chronik.push({
    runde: s.runde,
    text: neu === 'rechtsregierung' ? 'Deine Bewegung geht in die Opposition.' : neu === 'junta' ? 'Das Militär putscht und übernimmt die Macht.' : 'Die extreme Rechte übernimmt die Macht.',
    typ: 'system',
  });
  neuAusrichten(s);
}

export function machtZurueck(s: Spielstand, system: SystemId) {
  s.phase = 'regierung';
  s.system = SYSTEME[system]?.spielbar ? system : 'parlamentarisch';
  s.spielerSystem = s.system;
  s.naechsteWahl = SYSTEME[s.system].wahlen ? s.runde + 1 + land(s).wahlintervall : null;
  s.anliegenBasis = {};
  s.amtszeit = 0;
  s.widerstand = 0;
  s.modifikatoren.push({
    id: `neuanfang_${s.runde}`,
    name: 'Aufbruchstimmung',
    text: 'Nach dem Machtwechsel ist die Hoffnung groß.',
    runden: 4,
    effekte: { fraktionen: { arbeiter: 6, klima: 5, feministisch: 5, minderheiten: 5, partei: 5 } },
    gut: true,
  });
  s.chronik.push({ runde: s.runde, text: `Deine Bewegung kehrt an die Macht zurück (${SYSTEME[s.system].name}).`, typ: 'system' });
  neuAusrichten(s);
}

/** Verschiebt die Loyalitäts-Offsets so, dass die aktuellen Loyalitäten der neue Ausgangspunkt sind. */
export function neuAusrichten(s: Spielstand) {
  for (const f of FRAKTION_IDS) s.anliegenRef[f] = anliegenWert(s, f);
  const b = sammleBeitraege(s);
  const fz = fraktionsZiele(s, b);
  for (const f of FRAKTION_IDS) s.fraktionOffsets[f] += s.fraktionen[f].loyalitaet - fz[f];
}
