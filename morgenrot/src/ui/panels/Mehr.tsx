// Mehr: Lexikon, Statistik, Chronik, Erfolge, Speichern und Einstellungen.
import { useState } from 'preact/hooks';
import { klang, setHaptik } from '../../audio/klang';
import { CODEX, CODEX_KATEGORIEN, CODEX_MAP } from '../../data/codex';
import { ERFOLGE } from '../../data/erfolge';
import { WERTE } from '../../data/werte';
import type { Spielstand, WertId } from '../../sim/types';
import { datum, jahr } from '../../sim/util';
import { zahl } from '../format';
import { Diagramm, tippen } from '../komponenten/basis';
import { einstellungenLaden, einstellungenSpeichern, erfolgeLaden, laden, speichern, slotInfo, type Slot } from '../speicher';
import { spiel, ui, useSpiel, useUi } from '../store';
import { weltGlobal } from '../weltbruecke';

export function CodexListe({ freigeschaltet }: { freigeschaltet: string[] | null }) {
  const u = useUi();
  if (u.codexEintrag) {
    const e = CODEX_MAP[u.codexEintrag];
    return (
      <div>
        <button class="text-knopf" onClick={tippen(() => ui.setzen({ codexEintrag: null }))}>
          ‹ Zurück zum Lexikon
        </button>
        <div class="klein muted" style={{ marginTop: 6 }}>
          {e.kategorie}
        </div>
        <h2 style={{ fontSize: 26, margin: '4px 0 12px' }}>{e.titel}</h2>
        <div class="codex-eintrag">
          {e.text.map((p) => (
            <p>{p}</p>
          ))}
        </div>
        {e.quellen && (
          <div class="quellen">
            <b>Zum Weiterlesen</b>
            {e.quellen.map((q) => (
              <div>· {q}</div>
            ))}
          </div>
        )}
      </div>
    );
  }
  const anzahl = freigeschaltet ? CODEX.filter((c) => freigeschaltet.includes(c.id)).length : CODEX.length;
  return (
    <div>
      <p class="klein muted" style={{ marginTop: 0 }}>
        {freigeschaltet
          ? `${anzahl} von ${CODEX.length} Einträgen entdeckt. Neue Einträge schaltest du durch Ereignisse, Reformen und Systemwechsel frei.`
          : 'Das vollständige Lexikon mit Konzepten, Geschichte und Beispielen aus aller Welt.'}
      </p>
      {CODEX_KATEGORIEN.map((k) => (
        <>
          <div class="abschnitt">{k}</div>
          {CODEX.filter((c) => c.kategorie === k).map((c) => {
            const offen = !freigeschaltet || freigeschaltet.includes(c.id);
            return (
              <button class={`liste-knopf ${offen ? '' : 'gesperrt'}`} disabled={!offen} onClick={tippen(() => ui.setzen({ codexEintrag: c.id }))}>
                <span class="icon">{offen ? '📖' : '🔒'}</span>
                <span>{offen ? c.titel : 'Noch nicht entdeckt'}</span>
                <span class="pfeil">›</span>
              </button>
            );
          })}
        </>
      ))}
    </div>
  );
}

const STATISTIKEN: { titel: string; reihen: { id: WertId; farbe: string }[]; min?: number; max?: number }[] = [
  { titel: 'Lebensqualität & Zustimmung', reihen: [{ id: 'lebensqualitaet', farbe: '#3fb67a' }, { id: 'zustimmung', farbe: '#f26b4f' }, { id: 'legitimitaet', farbe: '#5aa9e6' }], min: 0, max: 100 },
  { titel: 'Wirtschaft', reihen: [{ id: 'arbeitslosigkeit', farbe: '#f2b84b' }, { id: 'inflation', farbe: '#ef5a5f' }] },
  { titel: 'Wirtschaftsleistung pro Kopf', reihen: [{ id: 'bip', farbe: '#f2b84b' }] },
  { titel: 'Gerechtigkeit', reihen: [{ id: 'ungleichheit', farbe: '#ef5a5f' }, { id: 'gemeineigentum', farbe: '#f26b4f' }], min: 0 },
  { titel: 'Klima', reihen: [{ id: 'erneuerbar', farbe: '#3fb67a' }, { id: 'natur', farbe: '#7ee0a8' }], min: 0, max: 100 },
  { titel: 'CO₂ pro Kopf', reihen: [{ id: 'co2', farbe: '#8a7d6a' }] },
  { titel: 'Gefahren', reihen: [{ id: 'faschismus', farbe: '#7c3aed' }, { id: 'unruhe', farbe: '#ef5a5f' }, { id: 'techmacht', farbe: '#0ea5e9' }], min: 0, max: 100 },
  { titel: 'Rechte', reihen: [{ id: 'frauenrechte', farbe: '#db2777' }, { id: 'minderheitenrechte', farbe: '#f97316' }, { id: 'pressefreiheit', farbe: '#14b8a6' }], min: 0, max: 100 },
  { titel: 'Staatsschulden', reihen: [{ id: 'schulden', farbe: '#94a3b8' }], min: 0 },
];

function Statistik({ s }: { s: Spielstand }) {
  const v = s.verlauf;
  return (
    <div>
      {STATISTIKEN.map((st) => (
        <div class="karte">
          <h3>{st.titel}</h3>
          <Diagramm
            reihen={st.reihen.map((r) => ({ name: WERTE[r.id].name, farbe: r.farbe, werte: v.map((p) => p.w[r.id] ?? 0) }))}
            min={st.min}
            max={st.max}
            jahre={[2026, jahr(s.runde)]}
          />
        </div>
      ))}
      {s.wahlergebnisse.length > 0 && (
        <div class="karte">
          <h3>Wahlergebnisse</h3>
          {s.wahlergebnisse.map((w) => (
            <div class="aenderung">
              <span>
                {w.gewonnen ? '✅' : '❌'} {datum(w.runde)}
              </span>
              <span>
                <b>{zahl(w.spieler)} %</b> <span class="muted">· Rechte {zahl(w.extrem)} %</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chronik({ s }: { s: Spielstand }) {
  const eintraege = [...s.chronik].reverse();
  return (
    <div>
      {eintraege.map((c) => (
        <div class="meldung">
          <span class="m-icon klein muted" style={{ minWidth: 76 }}>
            {datum(c.runde)}
          </span>
          <span>{c.text}</span>
        </div>
      ))}
    </div>
  );
}

export function ErfolgeListe() {
  const erreicht = erfolgeLaden();
  return (
    <div>
      <p class="klein muted" style={{ marginTop: 0 }}>
        {erreicht.length} von {ERFOLGE.length} Erfolgen – über alle Spiele hinweg.
      </p>
      {ERFOLGE.map((e) => {
        const ok = erreicht.includes(e.id);
        return (
          <div class="meldung" style={{ opacity: ok ? 1 : 0.5 }}>
            <span class="m-icon" style={{ fontSize: 22 }}>
              {ok ? e.icon : '🔒'}
            </span>
            <span>
              <b>{e.name}</b>
              <div class="klein muted">{e.text}</div>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Speichern({ s }: { s: Spielstand }) {
  const [, neu] = useState(0);
  const slots: Slot[] = ['1', '2', '3'];
  return (
    <div>
      <p class="klein muted" style={{ marginTop: 0 }}>
        Das Spiel speichert nach jeder Aktion automatisch. Zusätzlich kannst du drei eigene Spielstände anlegen.
      </p>
      {slots.map((slot) => {
        const info = slotInfo(slot);
        return (
          <div class="dial">
            <div class="dial-kopf">
              <div>
                <div class="dial-name">Speicherplatz {slot}</div>
                <div class="klein muted">{info ? `${info.flagge} ${info.land} · ${info.datum}` : 'leer'}</div>
              </div>
            </div>
            <div class="aktion-zeile">
              <button
                class="knopf klein"
                onClick={tippen(() => {
                  if (speichern(s, slot)) ui.toast('Gespeichert', '💾', 'gut');
                  else ui.toast('Speichern nicht möglich', '⚠️', 'schlecht');
                  neu((x) => x + 1);
                })}
              >
                Speichern
              </button>
              <button
                class="knopf klein"
                disabled={!info}
                onClick={tippen(() => {
                  const st = laden(slot);
                  if (st) {
                    spiel.setzen(st);
                    ui.setzen({ tab: null, unterseite: null, region: null });
                    ui.toast('Spielstand geladen', '📂', 'gut');
                  }
                })}
              >
                Laden
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Einstellungen() {
  const [e, setE] = useState(einstellungenLaden());
  const aendern = (teil: Partial<typeof e>) => {
    const neu = { ...e, ...teil };
    setE(neu);
    einstellungenSpeichern(neu);
    klang.setTon(neu.ton);
    klang.setMusik(neu.musik);
    setHaptik(neu.haptik);
    weltGlobal()?.setQualitaet(neu.grafik);
  };
  const schalter = (label: string, an: boolean, fn: () => void) => (
    <button class="liste-knopf" onClick={tippen(fn)}>
      <span>{label}</span>
      <span class={`badge ${an ? 'gut' : ''}`} style={{ marginLeft: 'auto' }}>
        {an ? 'an' : 'aus'}
      </span>
    </button>
  );
  return (
    <div>
      {schalter('🔔 Klänge', e.ton, () => aendern({ ton: !e.ton }))}
      {schalter('🎵 Musik', e.musik, () => aendern({ musik: !e.musik }))}
      {schalter('📳 Vibration', e.haptik, () => aendern({ haptik: !e.haptik }))}
      <div class="abschnitt">Grafikqualität</div>
      <div class="segment">
        <button class={e.grafik === 'hoch' ? 'aktiv' : ''} onClick={tippen(() => aendern({ grafik: 'hoch' }))}>
          Hoch
        </button>
        <button class={e.grafik === 'niedrig' ? 'aktiv' : ''} onClick={tippen(() => aendern({ grafik: 'niedrig' }))}>
          Akkuschonend
        </button>
      </div>
      <button class="liste-knopf" style={{ marginTop: 14 }} onClick={tippen(() => aendern({ tippsGesehen: [] }))}>
        <span>💡 Einführungstipps erneut anzeigen</span>
      </button>
    </div>
  );
}

export function Mehr() {
  const s = useSpiel();
  const u = useUi();
  const seite = u.unterseite;
  const zurueck = (
    <button class="text-knopf" onClick={tippen(() => ui.setzen({ unterseite: null, codexEintrag: null }))}>
      ‹ Zurück
    </button>
  );
  if (seite === 'codex')
    return (
      <div>
        {!u.codexEintrag && zurueck}
        <CodexListe freigeschaltet={s.codex} />
      </div>
    );
  if (seite === 'statistik')
    return (
      <div>
        {zurueck}
        <Statistik s={s} />
      </div>
    );
  if (seite === 'chronik')
    return (
      <div>
        {zurueck}
        <Chronik s={s} />
      </div>
    );
  if (seite === 'erfolge')
    return (
      <div>
        {zurueck}
        <ErfolgeListe />
      </div>
    );
  if (seite === 'speichern')
    return (
      <div>
        {zurueck}
        <Speichern s={s} />
      </div>
    );
  if (seite === 'einstellungen')
    return (
      <div>
        {zurueck}
        <Einstellungen />
      </div>
    );

  const eintrag = (icon: string, name: string, ziel: string, zusatz?: string) => (
    <button class="liste-knopf" onClick={tippen(() => ui.setzen({ unterseite: ziel }))}>
      <span class="icon">{icon}</span>
      <span>
        {name}
        {zusatz && <div class="klein muted">{zusatz}</div>}
      </span>
      <span class="pfeil">›</span>
    </button>
  );
  return (
    <div>
      {eintrag('📖', 'Lexikon', 'codex', `${s.codex.length} von ${CODEX.length} Einträgen entdeckt`)}
      {eintrag('📈', 'Statistiken', 'statistik', 'Entwicklung seit 2026')}
      {eintrag('📜', 'Chronik', 'chronik', 'Was bisher geschah')}
      {eintrag('🏆', 'Erfolge', 'erfolge')}
      {eintrag('💾', 'Speichern & Laden', 'speichern')}
      {eintrag('⚙️', 'Einstellungen', 'einstellungen')}
      <button class="liste-knopf" onClick={tippen(() => ui.setzen({ unterseite: 'codex', codexEintrag: 'spielanleitung' }))}>
        <span class="icon">❓</span>
        <span>So funktioniert das Spiel</span>
        <span class="pfeil">›</span>
      </button>
      <button
        class="liste-knopf"
        onClick={tippen(() => {
          ui.setzen({ bildschirm: 'titel', tab: null, unterseite: null, region: null });
        })}
      >
        <span class="icon">🏠</span>
        <span>Hauptmenü</span>
        <span class="pfeil">›</span>
      </button>
      <p class="klein muted" style={{ textAlign: 'center', marginTop: 18 }}>
        Morgenrot · Ein Spiel über eine gerechtere Welt
      </p>
    </div>
  );
}
