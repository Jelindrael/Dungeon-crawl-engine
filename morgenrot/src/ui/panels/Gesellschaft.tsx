// Gesellschaft: Fraktionen, ihre Loyalität und Macht, sowie Rechte und soziale Lage.
import { useState } from 'preact/hooks';
import { klang } from '../../audio/klang';
import { FRAKTION_IDS, FRAKTIONEN } from '../../data/fraktionen';
import { WERTE } from '../../data/werte';
import { fraktionsAktion, fraktionsAktionKosten, fraktionsAktionMoeglich, type FraktionsAktion } from '../../sim/engine';
import type { FraktionId, Spielstand, WertId } from '../../sim/types';
import { anzeige, prozentFarbe, wertText, zahl } from '../format';
import { Meter, tippen } from '../komponenten/basis';
import { spiel, ui, useSpiel } from '../store';

function stimmung(l: number) {
  if (l >= 75) return { text: 'begeistert', farbe: 'var(--gut)' };
  if (l >= 55) return { text: 'zufrieden', farbe: '#9ad37a' };
  if (l >= 40) return { text: 'skeptisch', farbe: 'var(--warn)' };
  if (l >= 25) return { text: 'unzufrieden', farbe: '#f08a4b' };
  return { text: 'feindselig', farbe: 'var(--schlecht)' };
}

function FraktionDetail({ s, f }: { s: Spielstand; f: FraktionId }) {
  const def = FRAKTIONEN[f];
  const fr = s.fraktionen[f];
  const aktionen: { art: FraktionsAktion; name: string; text: string }[] = [
    { art: 'verhandeln', name: '🤝 Verhandeln', text: 'Gespräche und kleine Zugeständnisse.' },
    { art: 'einbinden', name: '🏛️ In die Regierung holen', text: 'Ein Posten im Kabinett – deine Partei murrt.' },
    { art: 'unterdruecken', name: '🚔 Unterdrücken', text: 'Macht brechen – auf Kosten von Bürgerrechten und Legitimität.' },
  ];
  return (
    <div class="dial-detail">
      <p class="klein" style={{ color: 'var(--text-2)' }}>
        {def.text}
      </p>
      <div class="klein">
        <b>Wünsche:</b> <span class="muted">{def.wuensche}</span>
      </div>
      <div class="raster-3" style={{ marginTop: 10 }}>
        <div class="kachel">
          <div class="l">Loyalität</div>
          <div class="w" style={{ color: stimmung(fr.loyalitaet).farbe }}>
            {zahl(fr.loyalitaet)}
          </div>
        </div>
        <div class="kachel">
          <div class="l">Macht</div>
          <div class="w">{zahl(fr.macht)}</div>
        </div>
        <div class="kachel">
          <div class="l">Bevölkerung</div>
          <div class="w">{zahl(fr.anteil)} %</div>
        </div>
      </div>
      <p class="klein muted" style={{ marginTop: 8 }}>
        Die Loyalität bestimmt deine Zustimmung (gewichtet nach Bevölkerungsanteil). Die Macht entscheidet, wie sehr eine Gruppe Reformen verteuern, sabotieren – oder durchsetzen – kann.
      </p>
      {s.phase !== 'regime' &&
        aktionen.map((a) => {
          const fehler = fraktionsAktionMoeglich(s, f, a.art);
          if (s.phase === 'opposition' && a.art !== 'verhandeln') return null;
          return (
            <div class="aktion-zeile">
              <button
                class="knopf klein"
                disabled={!!fehler}
                style={{ justifyContent: 'flex-start' }}
                onClick={tippen(() => {
                  const t = spiel.aendern((st) => fraktionsAktion(st, f, a.art));
                  klang.wahl();
                  ui.toast(t, def.icon, a.art === 'unterdruecken' ? 'schlecht' : 'gut');
                })}
              >
                {a.name}
              </button>
              <span class="kosten">★ {fraktionsAktionKosten(s, f, a.art)}</span>
            </div>
          );
        })}
    </div>
  );
}

const RECHTE: WertId[] = ['frauenrechte', 'minderheitenrechte', 'buergerrechte', 'pressefreiheit', 'integration', 'partizipation'];
const SOZIAL: WertId[] = ['gesundheit', 'bildung', 'wohnen', 'natur', 'verschmutzung', 'unruhe', 'ueberwachung', 'korruption', 'techmacht'];

export function Gesellschaft() {
  const s = useSpiel();
  const [offen, setOffen] = useState<FraktionId | null>(null);
  const sortiert = [...FRAKTION_IDS].sort((a, b) => s.fraktionen[b].anteil * 2 + s.fraktionen[b].macht - (s.fraktionen[a].anteil * 2 + s.fraktionen[a].macht));
  const fasch = anzeige(s, 'faschismus');
  return (
    <div>
      <div class="karte">
        <Meter label="Zustimmung zu deiner Politik" wert={s.werte.zustimmung} text={`${zahl(s.werte.zustimmung)} %`} farbe={prozentFarbe(s.werte.zustimmung * 1.3)} />
        <Meter label="Legitimität des Systems" wert={s.werte.legitimitaet} farbe={prozentFarbe(s.werte.legitimitaet)} />
        <Meter label="⚠️ Extreme Rechte" wert={fasch.wert} text={`${fasch.unsicher ? '≈' : ''}${zahl(fasch.wert)} %`} farbe="#7c3aed" />
        <Meter label="🫂 Solidarität" wert={s.werte.bewusstsein} farbe="var(--akzent)" />
      </div>

      <div class="abschnitt">Gesellschaftliche Kräfte</div>
      {sortiert.map((f) => {
        const def = FRAKTIONEN[f];
        const fr = s.fraktionen[f];
        const st = stimmung(fr.loyalitaet);
        const auf = offen === f;
        return (
          <div class="dial" style={{ padding: 0 }}>
            <button class="fraktion" style={{ border: 'none', margin: 0, background: 'transparent' }} onClick={tippen(() => setOffen(auf ? null : f))}>
              <div class="fraktion-icon" style={{ background: `${def.farbe}26` }}>
                {def.icon}
              </div>
              <div class="fraktion-info">
                <div class="fraktion-name">{def.name}</div>
                <div class="meter-balken" style={{ marginTop: 6 }}>
                  <div style={{ width: `${fr.loyalitaet}%`, background: st.farbe }} />
                </div>
                <div class="klein" style={{ marginTop: 4, color: st.farbe }}>
                  {st.text} <span class="muted">· Macht {zahl(fr.macht)}</span>
                </div>
              </div>
              <div class="fraktion-zahl" style={{ color: st.farbe }}>
                {zahl(fr.loyalitaet)}
              </div>
            </button>
            {auf && (
              <div style={{ padding: '0 13px 13px' }}>
                <FraktionDetail s={s} f={f} />
              </div>
            )}
          </div>
        );
      })}

      <div class="abschnitt">Rechte & Teilhabe</div>
      <div class="karte">
        {RECHTE.map((id) => {
          const a = anzeige(s, id);
          return <Meter label={WERTE[id].name} wert={a.wert} text={`${a.unsicher ? '≈' : ''}${zahl(a.wert)}`} farbe={prozentFarbe(a.wert)} />;
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13.5 }}>
          <span>🧳 Zuwanderung</span>
          <b>{wertText('zuwanderung', s.werte.zuwanderung)}</b>
        </div>
      </div>

      <div class="abschnitt">Lebensbedingungen</div>
      <div class="karte">
        {SOZIAL.map((id) => {
          const a = anzeige(s, id);
          const gutHoch = WERTE[id].gut > 0;
          return <Meter label={WERTE[id].name} wert={a.wert} text={`${a.unsicher ? '≈' : ''}${zahl(a.wert)}`} farbe={prozentFarbe(a.wert, gutHoch)} />;
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13.5 }}>
          <span>⏰ Arbeitszeit</span>
          <b>{wertText('arbeitszeit', s.werte.arbeitszeit)}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 13.5 }}>
          <span>🤝 Gemeineigentum</span>
          <b>{wertText('gemeineigentum', s.werte.gemeineigentum)}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 13.5 }}>
          <span>🏭 Betriebsdemokratie</span>
          <b>{zahl(s.werte.betriebsdemokratie)}</b>
        </div>
      </div>
    </div>
  );
}
