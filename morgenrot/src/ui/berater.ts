// Das Beraterteam: regelbasierte Hinweise, was gerade Aufmerksamkeit braucht.
import { FRAKTION_IDS, FRAKTIONEN } from '../data/fraktionen';
import { SYSTEME } from '../data/systeme';
import { putschRisiko, wahlprognose } from '../sim/engine';
import type { Spielstand } from '../sim/types';
import { fossil } from '../sim/util';
import { zahl } from './format';

export interface Berater {
  id: 'wirtschaft' | 'umwelt' | 'inneres' | 'bewegung';
  name: string;
  icon: string;
  farbe: string;
}

export const BERATER: Record<Berater['id'], Berater> = {
  wirtschaft: { id: 'wirtschaft', name: 'Wirtschaft & Finanzen', icon: '💼', farbe: '#f2b84b' },
  umwelt: { id: 'umwelt', name: 'Klima & Umwelt', icon: '🌿', farbe: '#3fb67a' },
  inneres: { id: 'inneres', name: 'Inneres & Sicherheit', icon: '🛡️', farbe: '#5aa9e6' },
  bewegung: { id: 'bewegung', name: 'Stimme der Bewegung', icon: '✊', farbe: '#f26b4f' },
};

export interface Tipp {
  berater: Berater['id'];
  text: string;
  prio: number; // höher = wichtiger
  ziel?: { tab: 'politik' | 'gesellschaft' | 'welt' | 'lage'; sektor?: string };
}

export function beraterTipps(s: Spielstand): Tipp[] {
  const w = s.werte;
  const t: Tipp[] = [];
  const add = (berater: Tipp['berater'], prio: number, text: string, ziel?: Tipp['ziel']) => t.push({ berater, prio, text, ziel });

  if (s.phase === 'opposition') {
    add('bewegung', 9, 'Wir sind in der Opposition. Die Regierung baut unsere Reformen ab. Mit Demonstrationen, Genossenschaften und Bündnissen stärken wir die Bewegung – und gewinnen die nächste Wahl.', { tab: 'politik', sektor: 'aktionen' });
    if (s.naechsteWahl !== null) {
      const p = wahlprognose(s);
      add('bewegung', 7, `Nächste Wahl in ${s.naechsteWahl - s.runde} Halbjahren. Prognose: ${zahl(p.spieler)} % für uns.`);
    }
    if (w.faschismus > 25) add('inneres', 6, 'Die extreme Rechte nutzt die Krise. Antifaschistische Netzwerke und ein breites Bündnis sind jetzt wichtig.');
    return t.sort((a, b) => b.prio - a.prio);
  }
  if (s.phase === 'regime') {
    add('bewegung', 10, `Wir leben unter einem Regime. Der Widerstand liegt bei ${zahl(s.widerstand)} von 100. Untergrundnetzwerke, Massenproteste und internationale Solidarität bringen es zu Fall.`, { tab: 'politik', sektor: 'aktionen' });
    if (s.fraktionen.militaer.loyalitaet > 30) add('inneres', 7, 'Im Militär gibt es Zweifler. Wenn wir Soldaten überzeugen, wankt das Regime.');
    return t.sort((a, b) => b.prio - a.prio);
  }

  // Wirtschaft
  if (w.defizit > 5) add('wirtschaft', 8, `Das Haushaltsdefizit liegt bei ${zahl(w.defizit, 1)} % des BIP. Höhere Steuern auf große Vermögen, weniger teure Programme oder ein Sparprogramm – sonst steigen Zinsen und Inflation.`, { tab: 'lage' });
  if (w.schulden > 120 && s.politik.finanzen < 3) add('wirtschaft', 6, `Mit ${zahl(w.schulden)} % Staatsschulden sind wir erpressbar. Öffentliche Banken würden uns unabhängiger von den Finanzmärkten machen.`, { tab: 'politik', sektor: 'wirtschaft' });
  if (w.kapitalflucht > 35) add('wirtschaft', 8, 'Kapital verlässt das Land und bremst die Wirtschaft. Kapitalverkehrskontrollen oder Gespräche mit Gläubigern könnten helfen – oder mehr Gemeineigentum, damit weniger fliehen kann.', { tab: 'politik', sektor: 'wirtschaft' });
  if (w.inflation > 6) add('wirtschaft', 8, `Die Inflation liegt bei ${zahl(w.inflation, 1)} %. Das trifft vor allem Menschen mit wenig Geld. Defizit senken, Energiepreise stabilisieren.`);
  if (w.arbeitslosigkeit > 9) add('wirtschaft', 7, `${zahl(w.arbeitslosigkeit, 1)} % Arbeitslosigkeit. Eine öffentliche Jobgarantie oder ein Investitionsprogramm würden helfen – und der extremen Rechten den Nährboden entziehen.`, { tab: 'politik', sektor: 'arbeit' });
  if (w.sanktionen > 30) add('wirtschaft', 7, 'Die Sanktionen schaden der Wirtschaft. Neue Handelspartner im globalen Süden und in China können sie abfedern.', { tab: 'welt' });

  // Umwelt
  if (fossil(s) > 55 && s.politik.energie < 2) add('umwelt', 7, `Noch ${zahl(fossil(s))} % unserer Energie sind fossil. Eine Erneuerbare-Offensive schafft Jobs und senkt Emissionen – mit einer Jobgarantie für Kohleregionen bleibt niemand zurück.`, { tab: 'politik', sektor: 'umwelt' });
  if (s.technologien.includes('speicher') && s.politik.energie === 2) add('umwelt', 4, 'Günstige Speicher machen ein vollständig erneuerbares System in Bürgerhand möglich.', { tab: 'politik', sektor: 'umwelt' });
  if (w.temperatur > 1.7 && w.anpassung < 45) add('umwelt', 6, 'Die Klimakrise schlägt zu. Deiche, Schwammstädte und Renaturierung schützen Menschen – tippe auf eine Region, um Projekte zu starten.');
  if (w.natur < 40) add('umwelt', 5, 'Die Artenvielfalt bricht ein. Renaturierung und Agrarökologie würden helfen.', { tab: 'politik', sektor: 'umwelt' });
  if (w.co2 > s.basis.co2 && s.runde > 6) add('umwelt', 6, 'Unsere Emissionen steigen sogar. Wir brauchen dringend eine Energie- und Verkehrswende.', { tab: 'politik', sektor: 'umwelt' });

  // Inneres
  if (w.faschismus > 25) add('inneres', 7 + (w.faschismus > 35 ? 2 : 0), `Die extreme Rechte liegt bei ${zahl(w.faschismus)} %. Soziale Sicherheit, Bildung und Solidarität sind die beste Antwort. Verbote können helfen, kosten aber Bürgerrechte.`, { tab: 'gesellschaft' });
  const pr = putschRisiko(s);
  if (pr > 0.025) add('inneres', 9, `Das Militär ist gefährlich unzufrieden (Putschrisiko ca. ${zahl(pr * 100)} % pro Halbjahr). Verhandlungen, Budget oder eine Demokratisierung der Streitkräfte würden helfen.`, { tab: 'gesellschaft' });
  if (w.unruhe > 50) add('inneres', 7, 'Auf den Straßen brodelt es. Eine Rede, Dialog mit den Gruppen oder spürbare Verbesserungen würden die Lage beruhigen.');
  if (w.techmacht > 65) add('inneres', 5, 'Die Tech-Konzerne kontrollieren die Öffentlichkeit und verbreiten Desinformation. Regulierung oder digitale Gemeingüter würden ihre Macht begrenzen.', { tab: 'politik', sektor: 'digital' });
  for (const f of FRAKTION_IDS) {
    const fr = s.fraktionen[f];
    if (fr.loyalitaet < 22 && fr.macht > 45 && f !== 'kapital' && f !== 'tech')
      add('inneres', 6, `Die Gruppe „${FRAKTIONEN[f].name}“ ist sehr unzufrieden – und mächtig. Gespräche würden helfen.`, { tab: 'gesellschaft' });
  }

  // Bewegung
  if (s.naechsteWahl !== null) {
    const bis = s.naechsteWahl - s.runde;
    const p = wahlprognose(s);
    if (bis <= 3 && p.spieler < 48) add('bewegung', 9, `In ${bis} Halbjahr(en) wird gewählt – die Prognose liegt bei nur ${zahl(p.spieler)} %. Wir müssen die Menschen überzeugen.`);
  }
  if (w.legitimitaet < 45) add('bewegung', 6, 'Viele Menschen vertrauen dem System nicht. Mehr Beteiligung – Bürgerhaushalte, Bürgerräte – würde Legitimität schaffen.', { tab: 'politik', sektor: 'staat' });
  if (w.bewusstsein < 35) add('bewegung', 4, 'Ohne Solidarität keine dauerhaften Reformen. Aufklärung, Volkshäuser und Mitbestimmung stärken sie.');
  if (s.forderungen.length) add('bewegung', 5, `${s.forderungen.length} offene Forderung(en) unserer Verbündeten. Wer sie ignoriert, verliert Unterstützung.`, { tab: 'lage' });
  if (SYSTEME.partizipativ.voraussetzung?.(s) && s.system !== 'partizipativ' && s.system !== 'raete')
    add('bewegung', 5, 'Die Gesellschaft ist bereit für mehr Demokratie: Eine partizipative Verfassung wäre jetzt möglich.', { tab: 'politik', sektor: 'system' });
  if (SYSTEME.raete.voraussetzung?.(s) && s.system !== 'raete')
    add('bewegung', 6, 'Die Bewegung ist stark genug für eine Rätedemokratie – Demokratie in Betrieben und Nachbarschaften.', { tab: 'politik', sektor: 'system' });
  if (s.pk >= 25) add('bewegung', 3, `Wir haben ${zahl(s.pk)} politisches Kapital angespart. Lass es uns für mutige Reformen nutzen!`, { tab: 'politik' });
  if (s.system === 'autoritaer' || s.system === 'staatssozialismus')
    add('bewegung', 7, 'Ohne Demokratie verlieren wir das Vertrauen der Menschen. Die Zahlen, die uns gemeldet werden, sind geschönt. Wie lange soll das so gehen?', { tab: 'politik', sektor: 'system' });

  if (!t.length) add('bewegung', 1, 'Die Lage ist stabil. Zeit, mutige Projekte anzugehen: Tippe auf eine Region der Karte, um zu bauen.');
  return t.sort((a, b) => b.prio - a.prio);
}
