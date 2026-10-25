// Wurzelkomponente: hält die 3D-Welt dauerhaft im Hintergrund und wechselt die Bildschirme.
import { useEffect, useRef } from 'preact/hooks';
import { klang, setHaptik } from '../audio/klang';
import { LAND_MAP } from '../data/laender';
import { Welt } from '../world/welt';
import { Intro, Landwahl, Titel } from './Bildschirme';
import { Spiel } from './Spiel';
import { einstellungenLaden } from './speicher';
import { spiel, ui, useSpielOptional, useUi } from './store';
import { weltGlobal, weltSetzen, weltZustand } from './weltbruecke';

function WeltLeinwand() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const e = einstellungenLaden();
    let w: Welt | null = null;
    try {
      w = new Welt(ref.current, e.grafik);
    } catch (err) {
      console.error('3D-Welt konnte nicht gestartet werden', err);
      return;
    }
    weltSetzen(w);
    w.onRegion((id) => {
      if (ui.bildschirm !== 'spiel') return;
      ui.setzen({ region: id, tab: null });
    });
    return () => {
      weltSetzen(null);
      w?.dispose();
    };
  }, []);
  return <div class="welt" ref={ref} />;
}

function Toasts() {
  const u = useUi();
  return (
    <div class="toasts">
      {u.toasts.map((t) => (
        <div class={`toast ${t.typ ?? ''}`} key={t.id}>
          {t.icon && <span>{t.icon}</span>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function App() {
  const u = useUi();
  const s = useSpielOptional();

  useEffect(() => {
    const e = einstellungenLaden();
    klang.setTon(e.ton);
    klang.musik = e.musik;
    setHaptik(e.haptik);
    const start = () => klang.init();
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, []);

  // Die Welt folgt dem Spielstand
  useEffect(() => {
    if (u.bildschirm !== 'spiel' || !s) return;
    const w = weltGlobal();
    if (!w) return;
    w.ladeLand(LAND_MAP[s.land]);
    w.setAutoRotation(false);
    w.setInteraktiv(true);
    w.aktualisieren(weltZustand(s));
  }, [u.bildschirm, s, spiel.version]);

  return (
    <>
      <WeltLeinwand />
      {u.bildschirm === 'titel' && <Titel />}
      {u.bildschirm === 'landwahl' && <Landwahl />}
      {u.bildschirm === 'intro' && <Intro />}
      {u.bildschirm === 'spiel' && s && <Spiel />}
      <Toasts />
    </>
  );
}
