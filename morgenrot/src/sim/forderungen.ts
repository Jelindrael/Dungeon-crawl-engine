import { FRAKTION_IDS, FRAKTIONEN } from '../data/fraktionen';
import { POLITIK, POLITIK_MAP } from '../data/politik';
import { stufenHaltung } from './beitraege';
import { wendeAn } from './effekte';
import type { Forderung, Meldung, Spielstand } from './types';

export function forderungErfuellt(s: Spielstand, f: Forderung): boolean {
  const st = s.politik[f.politik] ?? 0;
  return f.richtung === 'min' ? st >= f.stufe : st <= f.stufe;
}

export function forderungText(f: Forderung): string {
  const dial = POLITIK_MAP[f.politik];
  const stufe = dial.stufen[f.stufe].name;
  return `${dial.name}: ${f.richtung === 'min' ? 'mindestens' : 'höchstens'} „${stufe}“`;
}

export function forderungenPruefen(s: Spielstand, rnd: () => number, meldungen: Meldung[]) {
  if (s.phase !== 'regierung') {
    s.forderungen = [];
    return;
  }
  // Erfüllte & abgelaufene Forderungen
  for (const f of [...s.forderungen]) {
    const name = FRAKTIONEN[f.fraktion].kurz;
    if (forderungErfuellt(s, f)) {
      wendeAn(s, { fraktionen: { [f.fraktion]: f.belohnung } });
      meldungen.push({ typ: 'forderung', text: `${FRAKTIONEN[f.fraktion].icon} ${name}: Forderung erfüllt! Loyalität +${f.belohnung}.` });
      s.forderungen = s.forderungen.filter((x) => x.id !== f.id);
    } else if (s.runde >= f.frist) {
      wendeAn(s, { fraktionen: { [f.fraktion]: -f.strafe } });
      meldungen.push({ typ: 'forderung', text: `${FRAKTIONEN[f.fraktion].icon} ${name}: Forderung ignoriert. Loyalität −${f.strafe}.` });
      s.forderungen = s.forderungen.filter((x) => x.id !== f.id);
    }
  }
  if (s.forderungen.length >= 3 || rnd() > 0.35) return;

  // Neue Forderung: eine Fraktion, die dir nicht ganz fern ist, will eine Politik, die ihr deutlich besser gefällt
  const kandidaten = FRAKTION_IDS.filter((f) => {
    const loy = s.fraktionen[f].loyalitaet;
    return loy >= 28 && loy <= 85 && !s.forderungen.some((x) => x.fraktion === f) && s.runde - (s.flags[`ford_${f}`] ?? -99) > 6;
  });
  if (!kandidaten.length) return;
  const f = kandidaten[Math.floor(rnd() * kandidaten.length)];
  const optionen: { politik: string; stufe: number; gewinn: number; richtung: 'min' | 'max' }[] = [];
  for (const dial of POLITIK) {
    const akt = s.politik[dial.id] ?? 0;
    const hAkt = stufenHaltung(s, dial.id, akt)[f] ?? 0;
    for (const ziel of [akt - 1, akt + 1]) {
      const st = dial.stufen[ziel];
      if (!st) continue;
      if (st.bedingung && !st.bedingung(s)) continue;
      const gewinn = (stufenHaltung(s, dial.id, ziel)[f] ?? 0) - hAkt;
      if (gewinn >= 5) optionen.push({ politik: dial.id, stufe: ziel, gewinn, richtung: ziel > akt ? 'min' : 'max' });
    }
  }
  if (!optionen.length) return;
  optionen.sort((a, b) => b.gewinn - a.gewinn);
  const wahl = optionen[Math.floor(rnd() * Math.min(3, optionen.length))];
  s.forderungen.push({
    id: `${f}_${s.runde}`,
    fraktion: f,
    politik: wahl.politik,
    stufe: wahl.stufe,
    richtung: wahl.richtung,
    frist: s.runde + 7,
    belohnung: Math.round(6 + wahl.gewinn * 0.4),
    strafe: Math.round(5 + wahl.gewinn * 0.2),
  });
  s.flags[`ford_${f}`] = s.runde;
  meldungen.push({ typ: 'forderung', text: `${FRAKTIONEN[f].icon} ${FRAKTIONEN[f].kurz} stellen eine neue Forderung.` });
}
