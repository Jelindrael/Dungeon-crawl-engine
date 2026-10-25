// Die Lage: Überblick über das Land, Berater, Forderungen, Wahlen und Haushalt.
import { FRAKTIONEN } from '../../data/fraktionen';
import { LAND_MAP } from '../../data/laender';
import { POLITIK_MAP } from '../../data/politik';
import { SYSTEME } from '../../data/systeme';
import { WERTE } from '../../data/werte';
import { aktuelleZielwerte, haushaltBerechnen, pkEinkommen, wahlprognose } from '../../sim/engine';
import { forderungText } from '../../sim/forderungen';
import type { Spielstand, WertId } from '../../sim/types';
import { datum, fossil } from '../../sim/util';
import { BERATER, beraterTipps } from '../berater';
import { anzeige, bewertung, delta, wertText, zahl } from '../format';
import { Meter, Ring, tippen } from '../komponenten/basis';
import { ui, useSpiel } from '../store';

function Kachel(props: { s: Spielstand; id: WertId; label?: string; icon?: string }) {
  const { s, id } = props;
  const a = anzeige(s, id);
  const vorher = s.verlauf.length > 1 ? s.verlauf[s.verlauf.length - 2].w[id] : undefined;
  const d = vorher !== undefined ? s.werte[id] - vorher : 0;
  const b = bewertung(id, d);
  const m = WERTE[id];
  const schwelle = m.max - m.min > 50 ? 0.3 : 0.03;
  return (
    <div class="kachel">
      <div class="l">
        {props.icon} {props.label ?? m.name}
      </div>
      <div class={`w ${a.unsicher ? 'unsicher' : ''}`}>{wertText(id, a.wert)}</div>
      {Math.abs(d) >= schwelle && !a.unsicher && <div class={`d ${b}`}>{delta(d, m.dez || (Math.abs(d) < 10 ? 1 : 0))}</div>}
    </div>
  );
}

export function Lage() {
  const s = useSpiel();
  const l = LAND_MAP[s.land];
  const sys = SYSTEME[s.system];
  const tipps = beraterTipps(s).slice(0, 3);
  const h = haushaltBerechnen(s);
  const lq = anzeige(s, 'lebensqualitaet');

  return (
    <div>
      <div class="karte">
        <div class="ring-zeile">
          <Ring wert={lq.wert} label="von 100" text={`${lq.unsicher ? '≈' : ''}${Math.round(lq.wert)}`} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Lebensqualität</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {l.flagge} {l.name} · {datum(s.runde)}
            </div>
            <div style={{ fontFamily: 'var(--titel)', fontSize: 19, margin: '2px 0 6px' }}>
              {sys.icon} {sys.name}
            </div>
            <div class="klein muted">
              Start: {zahl(s.basis.lebensqualitaet)} ·{' '}
              <span class={s.werte.lebensqualitaet >= s.basis.lebensqualitaet ? 'gut' : 'schlecht'}>
                {delta(s.werte.lebensqualitaet - s.basis.lebensqualitaet, 1)}
              </span>
            </div>
            {sys.infoQualitaet < 0.9 && s.phase === 'regierung' && (
              <div class="hinweis">⚠️ Die Statistiken sind geschönt und ungenau.</div>
            )}
          </div>
        </div>
      </div>

      <div class="abschnitt">Berater</div>
      {tipps.map((t) => {
        const b = BERATER[t.berater];
        return (
          <button
            class="tipp"
            onClick={tippen(() => {
              if (t.ziel) ui.setzen({ tab: t.ziel.tab, unterseite: t.ziel.sektor ?? null });
            })}
          >
            <div class="tipp-icon" style={{ background: `${b.farbe}22`, color: b.farbe }}>
              {b.icon}
            </div>
            <div>
              <div class="wer" style={{ color: b.farbe }}>
                {b.name}
              </div>
              <div class="was">{t.text}</div>
            </div>
          </button>
        );
      })}

      <div class="abschnitt">Kennzahlen</div>
      <div class="raster">
        <Kachel s={s} id="bip" icon="💶" />
        <Kachel s={s} id="arbeitslosigkeit" icon="🛠️" />
        <Kachel s={s} id="ungleichheit" icon="⚖️" />
        <Kachel s={s} id="inflation" icon="🛒" />
        <Kachel s={s} id="co2" icon="🏭" />
        <Kachel s={s} id="erneuerbar" icon="☀️" />
        <Kachel s={s} id="faschismus" icon="⚠️" />
        <Kachel s={s} id="bewusstsein" icon="🫂" />
      </div>

      {s.phase === 'regierung' && s.forderungen.length > 0 && (
        <>
          <div class="abschnitt">Forderungen</div>
          {s.forderungen.map((f) => {
            const fr = FRAKTIONEN[f.fraktion];
            const dial = POLITIK_MAP[f.politik];
            return (
              <button class="tipp" onClick={tippen(() => ui.setzen({ tab: 'politik', unterseite: dial.sektor }))}>
                <div class="tipp-icon" style={{ background: `${fr.farbe}22` }}>
                  {fr.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div class="wer" style={{ color: fr.farbe }}>
                    {fr.kurz} fordern
                  </div>
                  <div class="was">{forderungText(f)}</div>
                  <div class="klein muted" style={{ marginTop: 3 }}>
                    Noch {f.frist - s.runde} Halbjahr(e) · Erfüllt: +{f.belohnung} · Ignoriert: −{f.strafe}
                  </div>
                </div>
              </button>
            );
          })}
        </>
      )}

      {s.naechsteWahl !== null && <Wahlkarte s={s} />}

      {s.phase === 'regierung' && (
        <>
          <div class="abschnitt">Haushalt (% des BIP pro Jahr)</div>
          <div class="karte">
            <Meter label="Einnahmen" wert={h.einnahmen} max={Math.max(60, h.ausgaben + 5)} text={`${zahl(h.einnahmen, 1)} %`} farbe="var(--gut)" />
            <Meter label="Ausgaben" wert={h.ausgaben} max={Math.max(60, h.ausgaben + 5)} text={`${zahl(h.ausgaben, 1)} %`} farbe="var(--akzent)" />
            <div class="klein muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
              davon Zinsen {zahl(h.zinsen, 1)} % ({zahl(h.zinssatz, 1)} % Zinssatz) · Projekte {zahl(h.projekte, 1)} %
              {h.klimaschaeden > 0.1 && <> · Klimaschäden {zahl(h.klimaschaeden, 1)} %</>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700 }}>
              <span>{h.defizit > 0 ? 'Defizit' : 'Überschuss'}</span>
              <span class={h.defizit > 4 ? 'schlecht' : h.defizit < 1 ? 'gut' : ''}>{zahl(Math.abs(h.defizit), 1)} %</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span>Staatsschulden</span>
              <span class={s.werte.schulden > 110 ? 'schlecht' : ''}>{zahl(s.werte.schulden)} %</span>
            </div>
          </div>
        </>
      )}

      <div class="abschnitt">Politisches Kapital</div>
      <div class="karte">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Verfügbar</span>
          <span class="kosten">★ {zahl(s.pk)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span class="muted">Zuwachs pro Halbjahr</span>
          <span>+{zahl(pkEinkommen(s), 1)}</span>
        </div>
        <p class="klein muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Politisches Kapital wächst mit Zustimmung und Legitimität. Du brauchst es für Reformen, Projekte und Aktionen.
        </p>
      </div>

      {s.modifikatoren.length > 0 && (
        <>
          <div class="abschnitt">Aktive Entwicklungen</div>
          {s.modifikatoren.map((m) => (
            <div class="meldung">
              <span class="m-icon">{m.gut ? '🟢' : '🟠'}</span>
              <span>
                <b>{m.name}</b> <span class="muted">· noch {m.runden} Halbjahr(e)</span>
              </span>
            </div>
          ))}
        </>
      )}

      <div class="abschnitt">Energie</div>
      <div class="karte">
        <Meter label="☀️ Erneuerbar" wert={s.werte.erneuerbar} text={`${zahl(s.werte.erneuerbar)} %`} farbe="var(--gut)" ziel={aktuelleZielwerte(s).erneuerbar} />
        <Meter label="⚛️ Kernkraft" wert={s.werte.kernkraft} text={`${zahl(s.werte.kernkraft)} %`} farbe="var(--info)" />
        <Meter label="🛢️ Fossil" wert={fossil(s)} text={`${zahl(fossil(s))} %`} farbe="#8a7d6a" />
      </div>
      <div style={{ height: 20 }} />
      <p class="klein muted" style={{ textAlign: 'center' }}>
        Tipp: Die Farbe des Rings zeigt, ob das Leben der Menschen besser wird – nicht das Wachstum.
      </p>
    </div>
  );
}

function Wahlkarte({ s }: { s: Spielstand }) {
  const p = wahlprognose(s);
  const bis = (s.naechsteWahl ?? 0) - s.runde;
  return (
    <>
      <div class="abschnitt">Nächste Wahl</div>
      <div class="karte">
        <div class="karte-kopf">
          <h3>
            {datum(s.naechsteWahl ?? 0)} <span class="klein muted">· in {bis} Halbjahr{bis === 1 ? '' : 'en'}</span>
          </h3>
          <span class={`badge ${p.spieler >= 45 ? 'gut' : p.spieler >= 38 ? 'gold' : 'schlecht'}`}>
            {p.spieler >= 45 ? 'Mehrheit wahrscheinlich' : p.spieler >= 38 ? 'Knapp' : 'Niederlage droht'}
          </span>
        </div>
        <Meter label="✊ Dein Bündnis" wert={p.spieler} text={`${zahl(p.spieler)} %`} farbe="var(--akzent)" />
        <Meter label="💼 Konservative & Liberale" wert={p.rechte} text={`${zahl(p.rechte)} %`} farbe="#64748b" />
        <Meter label="⚠️ Extreme Rechte" wert={p.extrem} text={`${zahl(p.extrem)} %`} farbe="#7c3aed" />
        <p class="klein muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Prognose auf Basis der Zustimmung. Konzernmedien und Tech-Plattformen verzerren das Ergebnis.
        </p>
      </div>
    </>
  );
}
