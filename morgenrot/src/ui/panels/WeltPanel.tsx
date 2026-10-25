// Welt: internationale Beziehungen, Klima, globale Bewegung und Technologien.
import { BLOCK_IDS, BLOECKE } from '../../data/fraktionen';
import { TECHNOLOGIEN } from '../../data/merkmale';
import { jahr } from '../../sim/util';
import { zahl } from '../format';
import { Diagramm, Meter } from '../komponenten/basis';
import { useSpiel } from '../store';
import { AktionenAbschnitt } from './Politik';

function beziehungsText(v: number) {
  if (v >= 50) return 'eng verbündet';
  if (v >= 20) return 'freundlich';
  if (v >= -20) return 'neutral';
  if (v >= -50) return 'angespannt';
  return 'feindselig';
}

export function WeltPanel() {
  const s = useSpiel();
  const temp = s.werte.temperatur;
  const tempFarbe = temp < 1.5 ? 'var(--warn)' : temp < 2 ? '#f08a4b' : 'var(--schlecht)';
  const verlauf = s.verlauf.filter((_, i) => i % 2 === 0);
  return (
    <div>
      <div class="karte">
        <div class="karte-kopf">
          <h3>🌡️ Erderwärmung</h3>
          <span style={{ fontSize: 26, fontWeight: 800, color: tempFarbe }}>+{zahl(temp, 2)} °C</span>
        </div>
        <Diagramm
          reihen={[{ name: 'Temperatur', farbe: '#ef5a5f', werte: verlauf.map((v) => v.w.temperatur ?? 0) }]}
          min={1.3}
          max={Math.max(2.6, temp + 0.2)}
          jahre={[2026, jahr(s.runde)]}
        />
        <Meter label="Globaler Klimaschutz" wert={s.werte.weltklima} farbe="var(--gut)" />
        <Meter label="Weltemissionen (2026 = 100)" wert={s.werte.weltemissionen} max={130} farbe="#8a7d6a" />
        <p class="klein muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Kein Land kann die Klimakrise allein lösen. Dein Vorbild, deine Klimadiplomatie und die globale Bewegung beeinflussen, was der Rest der Welt tut.
        </p>
      </div>

      <div class="karte">
        <div class="karte-kopf">
          <h3>🌹 Globale Bewegung</h3>
          <span style={{ fontWeight: 800, fontSize: 20 }}>{zahl(s.werte.weltbewegung)}</span>
        </div>
        <div class="meter-balken">
          <div style={{ width: `${s.werte.weltbewegung}%`, background: 'linear-gradient(90deg,#f26b4f,#f2b84b)' }} />
        </div>
        <p class="klein muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Je mehr Menschen weltweit einen ähnlichen Weg gehen, desto weniger allein bist du – und desto schwächer wirken Sanktionen.
        </p>
      </div>

      <div class="abschnitt">Beziehungen</div>
      <div class="karte">
        {BLOCK_IDS.map((b) => {
          const v = s.beziehungen[b];
          const def = BLOECKE[b];
          return (
            <div class="meter">
              <div class="meter-kopf">
                <span>
                  {def.icon} {def.name}
                </span>
                <span class="w" style={{ color: v >= 20 ? 'var(--gut)' : v <= -20 ? 'var(--schlecht)' : 'var(--text-2)' }}>
                  {beziehungsText(v)}
                </span>
              </div>
              <div class="meter-balken">
                <div
                  style={{
                    position: 'absolute',
                    left: v >= 0 ? '50%' : `${50 + v / 2}%`,
                    width: `${Math.abs(v) / 2}%`,
                    background: v >= 0 ? 'var(--gut)' : 'var(--schlecht)',
                  }}
                />
                <div class="meter-ziel" style={{ left: 'calc(50% - 1px)', background: 'rgba(255,255,255,0.3)' }} />
              </div>
            </div>
          );
        })}
        <Meter label="🚫 Sanktionen" wert={s.werte.sanktionen} farbe="var(--schlecht)" />
        <Meter label="✈️ Kapitalflucht" wert={s.werte.kapitalflucht} farbe="var(--warn)" />
      </div>

      {s.phase === 'regierung' && (
        <>
          <div class="abschnitt">Diplomatie</div>
          <AktionenAbschnitt s={s} nur="aussen" />
        </>
      )}

      <div class="abschnitt">Technologien</div>
      <div class="karte">
        <p class="klein muted" style={{ marginTop: 0 }}>
          Forschungspunkte: {zahl(s.forschung, 1)} · Mehr Forschung und Bildung beschleunigen den Fortschritt.
        </p>
        {TECHNOLOGIEN.map((t) => {
          const hat = s.technologien.includes(t.id);
          const bereit = jahr(s.runde) >= t.jahr;
          return (
            <div class="meldung" style={{ opacity: hat ? 1 : 0.6 }}>
              <span class="m-icon">{hat ? t.icon : '🔒'}</span>
              <span style={{ flex: 1 }}>
                <b>{t.name}</b> {hat ? <span class="badge gut">verfügbar</span> : <span class="muted klein">· ab {t.jahr}{bereit ? `, ${zahl(t.kosten)} Punkte` : ''}</span>}
                <div class="klein" style={{ color: 'var(--text-2)', marginTop: 2 }}>
                  {t.text}
                </div>
                {t.gefahr && <div class="klein warn" style={{ marginTop: 2 }}>⚠️ {t.gefahr}</div>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
