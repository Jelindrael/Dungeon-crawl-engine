// Der Hauptbildschirm während des Spiels: HUD, Navigation, Panels und Dialoge.
import { useEffect, useState } from 'preact/hooks';
import { klang, vibrieren } from '../audio/klang';
import { CODEX_MAP } from '../data/codex';
import { ERFOLGE } from '../data/erfolge';
import { LAND_MAP } from '../data/laender';
import { SYSTEME } from '../data/systeme';
import { rundeBeenden } from '../sim/engine';
import type { Bericht } from '../sim/types';
import { datum, halbjahr, jahr } from '../sim/util';
import { anzeige, zahl } from './format';
import { ICONS, Sheet, tippen } from './komponenten/basis';
import { BerichtModal, BilanzModal, ErgebnisModal, EreignisModal } from './Modale';
import { Gesellschaft } from './panels/Gesellschaft';
import { Lage } from './panels/Lage';
import { Mehr } from './panels/Mehr';
import { Politik } from './panels/Politik';
import { RegionPanel } from './panels/RegionPanel';
import { WeltPanel } from './panels/WeltPanel';
import { einstellungenLaden, einstellungenSpeichern, erfolgeLaden, erfolgeSpeichern } from './speicher';
import { spiel, ui, useSpiel, useUi, type Overlay, type Tab } from './store';
import { weltGlobal } from './weltbruecke';

const TABS: { id: Tab; name: string; titel: string }[] = [
  { id: 'lage', name: 'Lage', titel: 'Lage der Nation' },
  { id: 'politik', name: 'Politik', titel: 'Politik' },
  { id: 'gesellschaft', name: 'Gesellschaft', titel: 'Gesellschaft' },
  { id: 'welt', name: 'Welt', titel: 'Welt' },
  { id: 'mehr', name: 'Mehr', titel: 'Mehr' },
];

const OVERLAYS: { id: Overlay; icon: string; name: string; gutHoch: boolean }[] = [
  { id: 'normal', icon: '🗺️', name: 'Landschaft', gutHoch: true },
  { id: 'zustimmung', icon: '👍', name: 'Zustimmung', gutHoch: true },
  { id: 'verschmutzung', icon: '🏭', name: 'Verschmutzung', gutHoch: false },
  { id: 'unruhe', icon: '🔥', name: 'Unruhe', gutHoch: false },
];

const TIPPS: { id: string; titel: string; text: string }[] = [
  { id: 'willkommen', titel: 'Willkommen in deinem Land', text: 'Ziehe mit einem Finger, um die Karte zu drehen, mit zwei Fingern zum Zoomen. Tippe auf eine Region, um sie zu untersuchen und Projekte zu bauen.' },
  { id: 'navigation', titel: 'Alles im Griff', text: 'Unten findest du die Lage mit deinen Beratern, die Politik mit allen Stellschrauben, die gesellschaftlichen Kräfte und die Welt.' },
  { id: 'kapital', titel: 'Politisches Kapital ★', text: 'Jede Reform kostet politisches Kapital. Mächtige Gruppen, die dagegen sind, machen sie teurer. Gewinne Unterstützung, dann gewinnst du Spielraum.' },
  { id: 'runde', titel: 'Ein Halbjahr vergeht', text: 'Wenn du fertig bist, beende die Runde. Die Welt reagiert: Werte verändern sich langsam, Ereignisse fordern Entscheidungen.' },
];

function erfolgePruefen() {
  const s = spiel.s;
  if (!s) return;
  const bekannt = erfolgeLaden();
  const neu = ERFOLGE.filter((e) => !bekannt.includes(e.id) && e.pruef(s));
  if (!neu.length) return;
  erfolgeSpeichern([...bekannt, ...neu.map((e) => e.id)]);
  neu.forEach((e, i) =>
    setTimeout(() => {
      klang.erfolg();
      ui.toast(`Erfolg: ${e.name}`, e.icon, 'erfolg');
    }, 600 + i * 900),
  );
}

export function Spiel() {
  const s = useSpiel();
  const u = useUi();
  const [bericht, setBericht] = useState<Bericht | null>(null);
  const [bilanz, setBilanz] = useState(false);
  const [tipps, setTipps] = useState(() => einstellungenLaden().tippsGesehen);
  const l = LAND_MAP[s.land];
  const sys = SYSTEME[s.system];
  const ereignisOffen = s.ereignisse.length > 0 && !bericht;

  useEffect(() => {
    weltGlobal()?.auswaehlen(u.region);
  }, [u.region]);

  const [codexAnzahl, setCodexAnzahl] = useState(s.codex.length);
  useEffect(() => {
    if (s.codex.length > codexAnzahl) {
      const neu = CODEX_MAP[s.codex[s.codex.length - 1]];
      if (neu) ui.toast(`Neu im Lexikon: ${neu.titel}`, '📖', 'neutral');
    }
    setCodexAnzahl(s.codex.length);
  }, [s.codex.length]);

  useEffect(() => {
    if (s.flags.bilanz_faellig && !bericht && !s.ereignisse.length) {
      spiel.aendern((st) => {
        delete st.flags.bilanz_faellig;
        st.beendet = true;
      });
      setBilanz(true);
    }
  }, [s.flags.bilanz_faellig, bericht, s.ereignisse.length]);

  const rundeEnde = () => {
    if (s.ereignisse.length) return;
    klang.runde();
    vibrieren(20);
    weltGlobal()?.zeitrafferStarten();
    ui.setzen({ tab: null, region: null, unterseite: null });
    const b = spiel.aendern((st) => rundeBeenden(st));
    setBericht(b);
    erfolgePruefen();
    if (b.meldungen.some((m) => m.typ === 'wahl')) klang.wahl();
  };

  const tabWaehlen = (t: Tab) => {
    ui.setzen({ tab: u.tab === t ? null : t, unterseite: null, codexEintrag: null, region: null });
  };

  const tippSchliessen = (id: string) => {
    const e = einstellungenLaden();
    const neu = [...e.tippsGesehen, id];
    einstellungenSpeichern({ ...e, tippsGesehen: neu });
    setTipps(neu);
  };

  const offenerTipp =
    !u.tab && !u.region && !ereignisOffen && !bericht && !u.ergebnisText && !u.ereignisErgebnis && !bilanz ? TIPPS.find((t) => !tipps.includes(t.id)) : undefined;

  const lq = anzeige(s, 'lebensqualitaet');
  const zust = anzeige(s, 'zustimmung');
  const overlayDef = OVERLAYS.find((o) => o.id === u.overlay)!;

  const tabTitel = TABS.find((t) => t.id === u.tab)?.titel ?? '';
  const politikPunkt = s.phase === 'regierung' && s.forderungen.length > 0;

  return (
    <>
      <div class="hud">
        <button class="hud-karte hud-datum" onClick={tippen(() => tabWaehlen('lage'))}>
          <div class="gross">{datum(s.runde)}</div>
          <div class="unter">
            {l.flagge} {s.phase === 'regierung' ? sys.kurz : s.phase === 'opposition' ? 'Opposition' : 'Untergrund'}
            {s.naechsteWahl !== null && ` · Wahl ${halbjahr(s.naechsteWahl) === 'Herbst' ? 'Herbst ' : ''}${jahr(s.naechsteWahl)}`}
          </div>
        </button>
        <div class="hud-karte hud-werte">
          <div class="hud-wert pk-wert">
            <div class="w">★{zahl(s.pk)}</div>
            <div class="l">Kapital</div>
          </div>
          <div class="hud-wert">
            <div class="w" style={{ color: lq.wert >= s.basis.lebensqualitaet ? 'var(--gut)' : 'var(--schlecht)' }}>
              {lq.unsicher ? '≈' : ''}
              {zahl(lq.wert)}
            </div>
            <div class="l">Leben</div>
          </div>
          <div class="hud-wert">
            <div class="w">
              {zust.unsicher ? '≈' : ''}
              {zahl(zust.wert)}%
            </div>
            <div class="l">{s.phase === 'regierung' ? 'Zustimm.' : 'Rückhalt'}</div>
          </div>
        </div>
      </div>

      {s.phase !== 'regierung' && (
        <div class={`phase-banner ${s.phase}`}>
          {s.phase === 'opposition' ? `In der Opposition${s.naechsteWahl !== null ? ` · Wahl ${jahr(s.naechsteWahl)}` : ''}` : `${sys.icon} ${sys.name} · Widerstand ${zahl(s.widerstand)}/100`}
        </div>
      )}

      <div class="karten-werkzeuge">
        <button
          class={`rund-knopf ${u.overlay !== 'normal' ? 'aktiv' : ''}`}
          aria-label="Kartenansicht wechseln"
          onClick={tippen(() => {
            const i = OVERLAYS.findIndex((o) => o.id === u.overlay);
            const neu = OVERLAYS[(i + 1) % OVERLAYS.length];
            ui.setzen({ overlay: neu.id });
            weltGlobal()?.setOverlay(neu.id);
          })}
        >
          {overlayDef.icon}
        </button>
      </div>
      {u.overlay !== 'normal' && (
        <div class="hud-karte overlay-legende">
          <b>{overlayDef.name}</b>
          <div
            class="legende-balken"
            style={{ background: overlayDef.gutHoch ? 'linear-gradient(90deg,#c53030,#d69e2e,#38a169)' : 'linear-gradient(90deg,#38a169,#d69e2e,#c53030)' }}
          />
          <div class="klein muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>niedrig</span>
            <span>hoch</span>
          </div>
        </div>
      )}

      <button
        class={`runde-knopf ${ereignisOffen ? 'ereignis' : ''} ${u.tab || u.region || bericht || u.ereignisErgebnis ? 'versteckt' : ''}`}
        onClick={tippen(() => {
          if (!s.ereignisse.length) rundeEnde();
        })}
      >
        {ereignisOffen ? `⚡ ${s.ereignisse.length} Ereignis${s.ereignisse.length > 1 ? 'se' : ''}` : 'Halbjahr beenden ›'}
      </button>

      {u.tab && (
        <Sheet titel={tabTitel} schliessen={() => ui.setzen({ tab: null, unterseite: null, codexEintrag: null })}>
          {u.tab === 'lage' && <Lage />}
          {u.tab === 'politik' && <Politik />}
          {u.tab === 'gesellschaft' && <Gesellschaft />}
          {u.tab === 'welt' && <WeltPanel />}
          {u.tab === 'mehr' && <Mehr />}
        </Sheet>
      )}
      {u.region && !u.tab && <RegionPanel id={u.region} />}

      <nav class="nav">
        <div class="nav-leiste">
          {TABS.map((t) => (
            <button class={u.tab === t.id ? 'aktiv' : ''} onClick={tippen(() => tabWaehlen(t.id))}>
              {ICONS[t.id]}
              <span>{t.name}</span>
              {t.id === 'lage' && politikPunkt && <span class="punkt" />}
            </button>
          ))}
        </div>
      </nav>

      {offenerTipp && (
        <div class="tutorial">
          <h3>💡 {offenerTipp.titel}</h3>
          <p>{offenerTipp.text}</p>
          <button class="knopf klein gold" onClick={tippen(() => tippSchliessen(offenerTipp.id))}>
            Verstanden
          </button>
        </div>
      )}

      {bericht && (
        <BerichtModal
          bericht={bericht}
          weiter={() => {
            setBericht(null);
          }}
        />
      )}
      {!bericht && !u.ergebnisText && <EreignisModal beiWeiter={erfolgePruefen} />}
      {u.ergebnisText && (
        <ErgebnisModal
          text={u.ergebnisText}
          schliessen={() => {
            ui.setzen({ ergebnisText: null });
            erfolgePruefen();
          }}
        />
      )}
      {bilanz && <BilanzModal schliessen={() => setBilanz(false)} />}
    </>
  );
}
