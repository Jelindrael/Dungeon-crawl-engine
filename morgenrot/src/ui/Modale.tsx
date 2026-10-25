// Modale Dialoge: Ereignisse, Halbjahresbericht, Ergebnisse und die Bilanz im Jahr 2100.
import { klang, vibrieren } from '../audio/klang';
import { CODEX_MAP } from '../data/codex';
import { EREIGNIS_MAP } from '../data/ereignisse';
import { FRAKTIONEN } from '../data/fraktionen';
import { LAND_MAP } from '../data/laender';
import { WERTE } from '../data/werte';
import { effektHinweise } from '../sim/effekte';
import { ereignisEntscheiden, ersetzePlatzhalter, optionVerfuegbar } from '../sim/ereignisse';
import type { Bericht, Spielstand, WertId } from '../sim/types';
import { datum } from '../sim/util';
import { bewertung, delta, wertText, zahl } from './format';
import { tippen } from './komponenten/basis';
import { spiel, ui, useSpiel, useUi } from './store';

const KATEGORIE: Record<string, { name: string; farbe: string }> = {
  wirtschaft: { name: 'Wirtschaft', farbe: '#b7791f' },
  umwelt: { name: 'Umwelt & Klima', farbe: '#2f855a' },
  gesellschaft: { name: 'Gesellschaft', farbe: '#b83280' },
  politik: { name: 'Politik', farbe: '#c53030' },
  welt: { name: 'Welt', farbe: '#2b6cb0' },
  technik: { name: 'Technologie', farbe: '#0987a0' },
  krise: { name: 'Krise', farbe: '#9b2c2c' },
  fraktion: { name: 'Gesellschaftliche Kräfte', farbe: '#6b46c1' },
  land: { name: 'Nationale Frage', farbe: '#c05621' },
};

export function EreignisModal({ beiWeiter }: { beiWeiter?: () => void }) {
  const s = useSpiel();
  const u = useUi();
  const ergebnis = u.ereignisErgebnis;
  const setErgebnis = (e: { text: string; codex?: string } | null) => ui.setzen({ ereignisErgebnis: e });
  const offen = s.ereignisse[0];
  const def = offen ? EREIGNIS_MAP[offen.id] : null;
  if (!def && !ergebnis) return null;

  if (ergebnis) {
    return (
      <div class="modal-hintergrund">
        <div class="modal">
          <div class="ereignis-inhalt" style={{ paddingTop: 20 }}>
            <div class="ergebnis" style={{ marginTop: 0 }}>
              {ergebnis.text || 'Die Entscheidung ist gefallen.'}
            </div>
            {ergebnis.codex && CODEX_MAP[ergebnis.codex] && (
              <button
                class="liste-knopf"
                style={{ marginTop: 12 }}
                onClick={tippen(() => {
                  setErgebnis(null);
                  ui.setzen({ tab: 'mehr', unterseite: 'codex', codexEintrag: ergebnis.codex! });
                })}
              >
                <span class="icon">📖</span>
                <span>
                  Lexikon: {CODEX_MAP[ergebnis.codex].titel}
                  <div class="klein muted">Mehr über die Hintergründe erfahren</div>
                </span>
                <span class="pfeil">›</span>
              </button>
            )}
            <button
              class="knopf primaer voll"
              style={{ marginTop: 14 }}
              onClick={tippen(() => {
                setErgebnis(null);
                beiWeiter?.();
              })}
            >
              Weiter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const d = def!;
  const kat = KATEGORIE[d.kategorie] ?? KATEGORIE.politik;
  const farbe = d.fraktion ? FRAKTIONEN[d.fraktion].farbe : kat.farbe;
  const kategorieName = d.fraktion ? FRAKTIONEN[d.fraktion].name : kat.name;
  const text = ersetzePlatzhalter(s, d.text, offen.vars);

  return (
    <div class="modal-hintergrund">
      <div class="modal" key={d.id}>
        <div class="ereignis-bild" style={{ background: `radial-gradient(circle at 50% 120%, ${farbe}, ${farbe}55 55%, #121828 100%)` }}>
          <span>{d.bild}</span>
        </div>
        <div class="ereignis-inhalt">
          <div class="ereignis-kategorie" style={{ color: farbe }}>
            {kategorieName} · {datum(s.runde)}
          </div>
          <h2>{ersetzePlatzhalter(s, d.titel, offen.vars)}</h2>
          <div class="ereignis-text">{text}</div>
          <div class="optionen">
            {d.optionen.map((o, i) => {
              const fehler = optionVerfuegbar(s, o);
              const hinweise = effektHinweise(o.effekte, 4);
              return (
                <button
                  class="option"
                  disabled={!!fehler}
                  onClick={tippen(() => {
                    const codex = o.codex ?? d.codex;
                    const t = spiel.aendern((st) => ereignisEntscheiden(st, i));
                    klang.wahl();
                    vibrieren(12);
                    setErgebnis({ text: t, codex });
                  })}
                >
                  <div class="option-text">{o.text}</div>
                  {o.hinweis && <div class="option-hinweis">{o.hinweis}</div>}
                  {hinweise.length > 0 && (
                    <div class="wirkungen" style={{ margin: '6px 0 0' }}>
                      {hinweise.map((h) => (
                        <span class={`wirkung ${h.gut === null ? '' : h.gut ? 'gut' : 'schlecht'}`}>{h.text}</span>
                      ))}
                    </div>
                  )}
                  {o.pkKosten ? <div class="option-hinweis">★ {o.pkKosten} politisches Kapital</div> : null}
                  {fehler && <div class="option-hinweis warn">{fehler}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const MELDUNG_ICON: Record<string, string> = {
  gut: '🟢',
  schlecht: '🔴',
  neutral: '⚪',
  wahl: '🗳️',
  forderung: '📣',
  projekt: '🏗️',
  technik: '💡',
  system: '🏛️',
};

export function BerichtModal({ bericht, weiter }: { bericht: Bericht; weiter: () => void }) {
  const s = useSpiel();
  const wichtig: WertId[] = ['lebensqualitaet', 'zustimmung', 'arbeitslosigkeit', 'inflation', 'co2', 'erneuerbar', 'faschismus', 'ungleichheit', 'schulden', 'temperatur', 'bewusstsein', 'unruhe'];
  const aenderungen = bericht.aenderungen.filter((a) => wichtig.includes(a.id)).sort((a, b) => wichtig.indexOf(a.id) - wichtig.indexOf(b.id));
  return (
    <div class="modal-hintergrund">
      <div class="modal">
        <div class="bericht-kopf">
          <div class="datum">Halbjahresbericht</div>
          <h2>{bericht.titel}</h2>
        </div>
        <div class="ereignis-inhalt">
          {bericht.meldungen.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {bericht.meldungen.map((m) => (
                <div class="meldung">
                  <span class="m-icon">{MELDUNG_ICON[m.typ] ?? '•'}</span>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
          )}
          {aenderungen.length > 0 && (
            <div class="karte" style={{ padding: '6px 14px' }}>
              {aenderungen.map((a) => {
                const d = a.nachher - a.vorher;
                const b = bewertung(a.id, d);
                const m = WERTE[a.id];
                return (
                  <div class="aenderung">
                    <span>{m.name}</span>
                    <span>
                      <b>{wertText(a.id, a.nachher)}</b>{' '}
                      <span class={b} style={{ fontSize: 12.5, fontWeight: 700 }}>
                        {delta(d, m.dez || 1)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {!aenderungen.length && !bericht.meldungen.length && <p class="muted">Ein ruhiges Halbjahr.</p>}
          <button class="knopf primaer voll" style={{ marginTop: 8 }} onClick={tippen(weiter)}>
            {s.ereignisse.length ? `Weiter zu ${s.ereignisse.length} Ereignis${s.ereignisse.length > 1 ? 'sen' : ''}` : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErgebnisModal({ text, schliessen }: { text: string; schliessen: () => void }) {
  return (
    <div class="modal-hintergrund" onClick={schliessen}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="ereignis-inhalt" style={{ paddingTop: 20 }}>
          <div class="ergebnis" style={{ marginTop: 0 }}>
            {text}
          </div>
          <button class="knopf primaer voll" style={{ marginTop: 14 }} onClick={tippen(schliessen)}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function note(wert: number): { note: string; farbe: string } {
  if (wert >= 85) return { note: 'A', farbe: 'var(--gut)' };
  if (wert >= 70) return { note: 'B', farbe: '#9ad37a' };
  if (wert >= 55) return { note: 'C', farbe: 'var(--warn)' };
  if (wert >= 40) return { note: 'D', farbe: '#f08a4b' };
  return { note: 'E', farbe: 'var(--schlecht)' };
}

export function bilanzKategorien(s: Spielstand) {
  const w = s.werte;
  const b = s.basis.werte;
  const lqPlus = w.lebensqualitaet - b.lebensqualitaet;
  return [
    { name: 'Lebensqualität', icon: '💚', wert: Math.max(0, Math.min(100, 50 + lqPlus * 2)), text: `${zahl(b.lebensqualitaet)} → ${zahl(w.lebensqualitaet)}` },
    { name: 'Gerechtigkeit', icon: '⚖️', wert: Math.max(0, Math.min(100, (60 - w.ungleichheit) * 2.5)), text: `Gini ${zahl(b.ungleichheit)} → ${zahl(w.ungleichheit)}` },
    { name: 'Klima', icon: '🌍', wert: Math.max(0, Math.min(100, 100 - Math.max(0, w.co2) * 10 - Math.max(0, w.temperatur - 1.5) * 25)), text: `${zahl(w.co2, 1)} t CO₂ · +${zahl(w.temperatur, 2)} °C` },
    { name: 'Demokratie', icon: '🗳️', wert: Math.max(0, Math.min(100, (w.legitimitaet + w.partizipation + w.buergerrechte + w.pressefreiheit) / 4 + 5)), text: `Beteiligung ${zahl(w.partizipation)}` },
    { name: 'Freiheit & Gleichstellung', icon: '🌈', wert: Math.max(0, Math.min(100, (w.frauenrechte + w.minderheitenrechte + w.integration) / 3)), text: `Frauen ${zahl(w.frauenrechte)} · Minderheiten ${zahl(w.minderheitenrechte)}` },
    { name: 'Natur', icon: '🌳', wert: Math.max(0, Math.min(100, w.natur * 0.7 + (100 - w.verschmutzung) * 0.3)), text: `Artenvielfalt ${zahl(w.natur)}` },
  ].map((k) => ({ ...k, ...note(k.wert) }));
}

export function BilanzModal({ schliessen }: { schliessen: () => void }) {
  const s = useSpiel();
  const l = LAND_MAP[s.land];
  const kat = bilanzKategorien(s);
  const schnitt = kat.reduce((a, k) => a + k.wert, 0) / kat.length;
  const gesamt = note(schnitt);
  const regierungsJahre = Math.round(s.verlauf.length / 2);
  const urteil =
    schnitt >= 80
      ? 'Du hast gezeigt, dass eine andere Welt möglich ist. Kommende Generationen werden von deinem Land als Vorbild sprechen.'
      : schnitt >= 65
        ? 'Dein Land ist gerechter, freier und ökologischer geworden. Nicht alles ist gelungen – aber die Richtung stimmt.'
        : schnitt >= 50
          ? 'Ein Jahrhundert der Kämpfe mit gemischter Bilanz. Vieles wurde erreicht, vieles blieb unvollendet.'
          : 'Die großen Krisen des Jahrhunderts haben dein Land schwer getroffen. Doch Bewegungen lernen aus Niederlagen.';
  return (
    <div class="modal-hintergrund">
      <div class="modal">
        <div class="bericht-kopf">
          <div class="datum">
            {l.flagge} {l.name} · 2026–{datum(s.runde).split(' ')[1]}
          </div>
          <h2>Die Bilanz eines Jahrhunderts</h2>
        </div>
        <div class="ereignis-inhalt">
          <div style={{ textAlign: 'center', margin: '6px 0 14px' }}>
            <div class="note" style={{ color: gesamt.farbe, fontSize: 64 }}>
              {gesamt.note}
            </div>
            <p class="ereignis-text" style={{ marginTop: 8 }}>
              {urteil}
            </p>
          </div>
          <div class="karte" style={{ padding: '6px 14px' }}>
            {kat.map((k) => (
              <div class="aenderung">
                <span>
                  {k.icon} {k.name}
                  <div class="klein muted">{k.text}</div>
                </span>
                <span class="note" style={{ fontSize: 26, color: k.farbe }}>
                  {k.note}
                </span>
              </div>
            ))}
          </div>
          <p class="klein muted">
            {regierungsJahre} Jahre Geschichte · {s.wahlergebnisse.filter((w) => w.gewonnen).length} gewonnene Wahlen · {s.fertig.length} Großprojekte · {s.codex.length} Lexikon-Einträge entdeckt
          </p>
          <button class="knopf primaer voll" onClick={tippen(schliessen)}>
            Weiterspielen
          </button>
          <button class="knopf voll" style={{ marginTop: 8 }} onClick={tippen(() => ui.setzen({ bildschirm: 'titel', tab: null }))}>
            Zum Hauptmenü
          </button>
        </div>
      </div>
    </div>
  );
}
