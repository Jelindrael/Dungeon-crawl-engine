// Wiederverwendbare Bausteine der Oberfläche.
import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { klang, vibrieren } from '../../audio/klang';
import { effektHinweise } from '../../sim/effekte';
import type { Effekte } from '../../sim/types';

export function tippen(fn?: () => void) {
  return () => {
    klang.klick();
    vibrieren(6);
    fn?.();
  };
}

// ───────── Icons ─────────
const pfad = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d={d} />
  </svg>
);
export const ICONS = {
  lage: pfad('M3 12h4l3-8 4 16 3-8h4'),
  politik: pfad('M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4'),
  gesellschaft: pfad('M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8'),
  welt: pfad('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'),
  mehr: pfad('M4 6h16M4 12h16M4 18h16'),
};

// ───────── Messleiste ─────────
export function Meter(props: {
  label: ComponentChildren;
  wert: number;
  text?: string;
  max?: number;
  min?: number;
  farbe?: string;
  ziel?: number;
}) {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const anteil = Math.max(0, Math.min(1, (props.wert - min) / (max - min)));
  const zielAnteil = props.ziel !== undefined ? Math.max(0, Math.min(1, (props.ziel - min) / (max - min))) : null;
  return (
    <div class="meter">
      <div class="meter-kopf">
        <span>{props.label}</span>
        <span class="w">{props.text ?? Math.round(props.wert)}</span>
      </div>
      <div class="meter-balken">
        <div style={{ width: `${anteil * 100}%`, background: props.farbe ?? 'var(--akzent)' }} />
        {zielAnteil !== null && <div class="meter-ziel" style={{ left: `calc(${zielAnteil * 100}% - 1px)` }} title="Zielwert" />}
      </div>
    </div>
  );
}

// ───────── Ring ─────────
export function Ring(props: { wert: number; label: string; farbe?: string; text?: string }) {
  const r = 44;
  const u = 2 * Math.PI * r;
  const anteil = Math.max(0, Math.min(1, props.wert / 100));
  return (
    <div class="ring">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} stroke="rgba(255,255,255,0.08)" stroke-width="9" fill="none" />
        <circle
          cx="52"
          cy="52"
          r={r}
          stroke={props.farbe ?? 'url(#ringVerlauf)'}
          stroke-width="9"
          fill="none"
          stroke-linecap="round"
          stroke-dasharray={`${u * anteil} ${u}`}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.2,.9,.3,1)' }}
        />
        <defs>
          <linearGradient id="ringVerlauf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f2b84b" />
            <stop offset="100%" stop-color="#3fb67a" />
          </linearGradient>
        </defs>
      </svg>
      <div class="ring-text">
        <div class="w">{props.text ?? Math.round(props.wert)}</div>
        <div class="l">{props.label}</div>
      </div>
    </div>
  );
}

// ───────── Bottom Sheet ─────────
export function Sheet(props: { titel: ComponentChildren; schliessen: () => void; children: ComponentChildren; aktion?: ComponentChildren; halb?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [zug, setZug] = useState(0);
  const runter = (e: PointerEvent) => {
    start.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const bewegen = (e: PointerEvent) => {
    if (start.current === null) return;
    setZug(Math.max(0, e.clientY - start.current));
  };
  const hoch = () => {
    if (zug > 90) props.schliessen();
    start.current = null;
    setZug(0);
  };
  return (
    <>
      <div class="sheet-hintergrund" onClick={props.schliessen} />
      <div class={`sheet ${props.halb ? 'halb' : ''}`} ref={ref} style={zug ? { transform: `translateY(${zug}px)`, transition: 'none' } : undefined}>
        <div class="sheet-griff" onPointerDown={runter} onPointerMove={bewegen} onPointerUp={hoch} onPointerCancel={hoch}>
          <span />
        </div>
        <div class="sheet-kopf">
          <h2>{props.titel}</h2>
          {props.aktion}
          <button class="zurueck" onClick={tippen(props.schliessen)} aria-label="Schließen">
            ✕
          </button>
        </div>
        <div class="sheet-inhalt">{props.children}</div>
      </div>
    </>
  );
}

// ───────── Wirkungshinweise ─────────
export function Wirkungen(props: { effekte?: Effekte; max?: number }) {
  const h = effektHinweise(props.effekte, props.max ?? 8);
  if (!h.length) return null;
  return (
    <div class="wirkungen">
      {h.map((x) => (
        <span class={`wirkung ${x.gut === null ? '' : x.gut ? 'gut' : 'schlecht'}`}>{x.text}</span>
      ))}
    </div>
  );
}

// ───────── Liniendiagramm ─────────
export function Diagramm(props: { reihen: { name: string; farbe: string; werte: number[] }[]; min?: number; max?: number; jahre?: [number, number] }) {
  const b = 320;
  const h = 140;
  const alle = props.reihen.flatMap((r) => r.werte);
  if (props.reihen.every((r) => r.werte.length < 2))
    return <p class="klein muted">Die Entwicklung erscheint hier, sobald die ersten Halbjahre vergangen sind.</p>;
  const min = props.min ?? Math.min(...alle);
  const max = props.max ?? Math.max(...alle);
  const spanne = max - min || 1;
  const n = Math.max(...props.reihen.map((r) => r.werte.length));
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * b);
  const y = (v: number) => h - ((v - min) / spanne) * (h - 10) - 5;
  return (
    <div>
      <svg class="diagramm" viewBox={`0 0 ${b} ${h}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((t) => (
          <line x1="0" x2={b} y1={h * t} y2={h * t} stroke="rgba(255,255,255,0.06)" stroke-width="1" />
        ))}
        {props.reihen.map((r) => (
          <polyline
            fill="none"
            stroke={r.farbe}
            stroke-width="2.2"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
            points={r.werte.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          />
        ))}
      </svg>
      <div class="diagramm-legende">
        {props.reihen.map((r) => (
          <span class="leg" style={{ color: r.farbe }}>
            <span style={{ color: 'var(--text-2)' }}>{r.name}</span>
          </span>
        ))}
        {props.jahre && (
          <span class="muted" style={{ marginLeft: 'auto' }}>
            {props.jahre[0]}–{props.jahre[1]}
          </span>
        )}
      </div>
    </div>
  );
}
