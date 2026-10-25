// Titel, Länderwahl und Intro.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { klang } from '../audio/klang';
import { LAENDER, LAND_MAP } from '../data/laender';
import { MERKMALE } from '../data/merkmale';
import { SYSTEME } from '../data/systeme';
import { neuesSpiel } from '../sim/engine';
import type { Schwierigkeit } from '../sim/types';
import { zahl } from './format';
import { Sheet, tippen } from './komponenten/basis';
import { CodexListe, Einstellungen, ErfolgeListe } from './panels/Mehr';
import { laden, slotInfo } from './speicher';
import { spiel, ui } from './store';
import { titelZustand, weltGlobal } from './weltbruecke';

const ZITATE = [
  { text: 'Eine andere Welt ist möglich.', von: 'Weltsozialforum, Porto Alegre 2001' },
  { text: 'Freiheit ist immer Freiheit der Andersdenkenden.', von: 'Rosa Luxemburg' },
  { text: 'Die Philosophen haben die Welt nur verschieden interpretiert; es kommt aber darauf an, sie zu verändern.', von: 'Karl Marx' },
  { text: 'Hoffnung ist eine Disziplin.', von: 'Mariame Kaba' },
  { text: 'Die Geschichte gehört uns, und die Völker machen sie.', von: 'Salvador Allende' },
  { text: 'Brot und Rosen.', von: 'Streikende Textilarbeiterinnen, Lawrence 1912' },
];

export function Titel() {
  const [panel, setPanel] = useState<'codex' | 'erfolge' | 'einstellungen' | null>(null);
  const auto = useMemo(() => slotInfo('auto'), []);
  const zitat = useMemo(() => ZITATE[Math.floor(Math.random() * ZITATE.length)], []);

  useEffect(() => {
    const w = weltGlobal();
    if (!w) return;
    const demo = LAENDER[Math.floor(Math.random() * LAENDER.length)];
    w.ladeLand(demo);
    w.aktualisieren(titelZustand(demo.id), true);
    w.setAutoRotation(true);
    w.setInteraktiv(false);
    w.setOverlay('normal');
    return () => {
      w.setAutoRotation(false);
      w.setInteraktiv(true);
    };
  }, []);

  return (
    <div class="titel-bild">
      <div class="titel-kopf">
        <h1>Morgenrot</h1>
        <div class="unterzeile">Eine neue Welt · 2026–2100</div>
      </div>
      <div class="titel-menue">
        <div class="titel-zitat">
          „{zitat.text}“
          <div class="klein muted" style={{ fontStyle: 'normal', fontFamily: 'var(--schrift)', marginTop: 4 }}>
            — {zitat.von}
          </div>
        </div>
        {auto && (
          <button
            class="knopf primaer voll"
            onClick={tippen(() => {
              klang.init();
              const s = laden('auto');
              if (!s) return;
              spiel.setzen(s);
              ui.setzen({ bildschirm: 'spiel', tab: null, region: null, unterseite: null, ereignisErgebnis: null, ergebnisText: null });
            })}
          >
            Fortsetzen · {auto.flagge} {auto.datum}
          </button>
        )}
        <button
          class={`knopf voll ${auto ? '' : 'primaer'}`}
          onClick={tippen(() => {
            klang.init();
            ui.setzen({ bildschirm: 'landwahl' });
          })}
        >
          Neues Spiel
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button class="knopf" style={{ flex: 1 }} onClick={tippen(() => setPanel('codex'))}>
            📖 Lexikon
          </button>
          <button class="knopf" style={{ flex: 1 }} onClick={tippen(() => setPanel('erfolge'))}>
            🏆
          </button>
          <button class="knopf" style={{ flex: 1 }} onClick={tippen(() => setPanel('einstellungen'))}>
            ⚙️
          </button>
        </div>
      </div>
      {panel && (
        <Sheet
          titel={panel === 'codex' ? 'Lexikon' : panel === 'erfolge' ? 'Erfolge' : 'Einstellungen'}
          schliessen={() => {
            setPanel(null);
            ui.setzen({ codexEintrag: null });
          }}
        >
          {panel === 'codex' && <CodexListe freigeschaltet={null} />}
          {panel === 'erfolge' && <ErfolgeListe />}
          {panel === 'einstellungen' && <Einstellungen />}
        </Sheet>
      )}
    </div>
  );
}

let gewaehltesLand = LAENDER[0].id;
let gewaehlteSchwierigkeit: Schwierigkeit = 'normal';

export function Landwahl() {
  const [landId, setLandId] = useState(gewaehltesLand);
  const [schw, setSchw] = useState<Schwierigkeit>(gewaehlteSchwierigkeit);
  const l = LAND_MAP[landId];

  useEffect(() => {
    gewaehltesLand = landId;
    const w = weltGlobal();
    if (!w) return;
    w.ladeLand(l);
    w.aktualisieren(
      {
        ...titelZustand(l.id),
        erneuerbar: l.start.erneuerbar,
        kernkraft: l.start.kernkraft,
        natur: l.start.natur,
        verschmutzung: l.start.verschmutzung,
        wohlstand: 0.5,
      },
      true,
    );
    w.setAutoRotation(true);
    w.setInteraktiv(false);
  }, [landId]);

  return (
    <div class="seite" style={{ background: 'linear-gradient(180deg, rgba(11,15,26,0) 0%, rgba(11,15,26,0.4) 22%, rgba(11,15,26,0.94) 42%, rgba(11,15,26,0.98))' }}>
      <div class="seite-kopf">
        <button class="zurueck" onClick={tippen(() => ui.setzen({ bildschirm: 'titel' }))} aria-label="Zurück">
          ‹
        </button>
        <h2>Wähle dein Land</h2>
      </div>
      <div style={{ height: '24vh', flex: 'none' }} />
      <div class="seite-inhalt">
        <div class="laender-liste">
          {LAENDER.map((land) => (
            <button class={`land-kachel ${land.id === landId ? 'aktiv' : ''}`} onClick={tippen(() => setLandId(land.id))}>
              <div class="flagge">{land.flagge}</div>
              <div class="name">{land.name}</div>
              <div class="sterne" title={`Schwierigkeit ${land.schwierigkeit} von 5`}>
                {'★'.repeat(land.schwierigkeit)}
                <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - land.schwierigkeit)}</span>
              </div>
            </button>
          ))}
        </div>
        <div class="land-detail">
          <h3>
            {l.flagge} {l.name}
          </h3>
          <p class="klein" style={{ color: 'var(--text-2)' }}>
            {l.kurz}
          </p>
          <div class="kennzahlen">
            <div class="kennzahl">
              <div class="w">{zahl(l.bevoelkerung)} Mio.</div>
              <div class="l">Bevölkerung</div>
            </div>
            <div class="kennzahl">
              <div class="w">{zahl(l.start.bip)} Tsd. $</div>
              <div class="l">BIP pro Kopf</div>
            </div>
            <div class="kennzahl">
              <div class="w">{zahl(l.start.arbeitslosigkeit, 1)} %</div>
              <div class="l">Arbeitslosigkeit</div>
            </div>
            <div class="kennzahl">
              <div class="w">{zahl(l.start.ungleichheit)}</div>
              <div class="l">Gini</div>
            </div>
            <div class="kennzahl">
              <div class="w">{zahl(l.start.co2, 1)} t</div>
              <div class="l">CO₂ pro Kopf</div>
            </div>
            <div class="kennzahl">
              <div class="w">{zahl(l.start.faschismus)} %</div>
              <div class="l">Extreme Rechte</div>
            </div>
          </div>
          <div class="klein">
            <b>System:</b> {SYSTEME[l.system].name}
          </div>
          <div class="merkmale">
            {l.merkmale.map((m) => (
              <span class="merkmal" title={MERKMALE[m]?.text}>
                {MERKMALE[m]?.icon} {MERKMALE[m]?.name}
              </span>
            ))}
          </div>
        </div>
        <div class="abschnitt">Schwierigkeit</div>
        <div class="segment">
          {(['leicht', 'normal', 'schwer'] as Schwierigkeit[]).map((x) => (
            <button
              class={schw === x ? 'aktiv' : ''}
              onClick={tippen(() => {
                setSchw(x);
                gewaehlteSchwierigkeit = x;
              })}
            >
              {x === 'leicht' ? 'Entspannt' : x === 'normal' ? 'Normal' : 'Hart'}
            </button>
          ))}
        </div>
        <p class="klein muted" style={{ marginTop: 8 }}>
          {schw === 'leicht'
            ? 'Mehr politisches Kapital, weniger Widerstand. Gut zum Kennenlernen.'
            : schw === 'normal'
              ? 'Die vorgesehene Erfahrung: realistische Hürden, faire Chancen.'
              : 'Mächtige Gegner, stärkere Kapitalflucht, häufigere Krisen.'}
        </p>
      </div>
      <div class="seite-fuss">
        <button class="knopf primaer voll" onClick={tippen(() => ui.setzen({ bildschirm: 'intro' }))}>
          Weiter mit {l.name}
        </button>
      </div>
    </div>
  );
}

export function Intro() {
  const l = LAND_MAP[gewaehltesLand];
  return (
    <div class="seite">
      <div class="seite-kopf">
        <button class="zurueck" onClick={tippen(() => ui.setzen({ bildschirm: 'landwahl' }))} aria-label="Zurück">
          ‹
        </button>
        <h2>
          {l.flagge} {l.name}
        </h2>
      </div>
      <div class="seite-inhalt">
        <div class="intro-text">
          {l.szenario.map((p, i) => (
            <p style={{ animationDelay: `${i * 0.5}s` }}>{p}</p>
          ))}
        </div>
        <div class="karte" style={{ marginTop: 10, animation: 'einblenden 0.8s 1.6s both' }}>
          <h3>Deine Aufgabe</h3>
          <p class="klein" style={{ color: 'var(--text-2)' }}>
            Führe {l.name} bis ins Jahr 2100 in eine gerechtere, freiere und ökologische Zukunft. Verbessere das Leben der Menschen, stoppe die Klimakrise, verteidige die Demokratie gegen ihre Feinde – und überzeuge eine Mehrheit, diesen Weg mitzugehen.
          </p>
          <p class="klein muted" style={{ marginBottom: 0 }}>
            Es gibt keinen vorgegebenen Sieg. Du kannst Wahlen verlieren, gestürzt werden und zurückkommen. Am Ende zählt, welche Welt du hinterlässt.
          </p>
        </div>
      </div>
      <div class="seite-fuss">
        <button
          class="knopf primaer voll"
          onClick={tippen(() => {
            const s = neuesSpiel(gewaehltesLand, gewaehlteSchwierigkeit);
            spiel.setzen(s);
            klang.erfolg();
            ui.setzen({ bildschirm: 'spiel', tab: null, region: null, unterseite: null, overlay: 'normal', ereignisErgebnis: null, ergebnisText: null });
            weltGlobal()?.setOverlay('normal');
          })}
        >
          Die Regierung übernehmen
        </button>
      </div>
    </div>
  );
}
