// Erzeugt eine stilisierte Hexagon-Landkarte für ein Land: Form, Höhen, Regionen und Bauplätze.
import type { LandDef, RegionDef } from '../data/schema';
import type { RegionTyp } from '../sim/types';

export const HEX_RADIUS = 12;
export const HEX_GROESSE = 1;
const SQRT3 = Math.sqrt(3);

export interface Hex {
  q: number;
  r: number;
  x: number;
  z: number;
  land: boolean;
  hoehe: number;
  region: number; // Index in land.regionen, -1 für Wasser
  kueste: boolean;
  zufall: number; // deterministischer Zufallswert 0..1
  belegt?: 'stadt' | 'energie' | 'projekt' | 'feld' | 'mine';
}

export interface Karte {
  hexe: Hex[];
  regionen: { def: RegionDef; hexe: number[]; zentrum: { x: number; z: number }; projektSlots: number[] }[];
  energieSlots: { hex: number; art: 'wind' | 'solar' }[];
  ausdehnung: number;
}

// ───────── Rauschen ─────────
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function wertRauschen(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  const u = s(xf);
  const v = s(yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export function fbm(x: number, y: number, seed: number, oktaven = 4): number {
  let summe = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < oktaven; i++) {
    summe += amp * wertRauschen(x * freq, y * freq, seed + i * 17);
    amp *= 0.5;
    freq *= 2;
  }
  return summe;
}

// ───────── Form ─────────
function landWert(land: LandDef, nx: number, ny: number, seed: number): number {
  const rausch = (fbm(nx * 2.2 + 10, ny * 2.2 + 10, seed) - 0.5) * 0.45;
  const f = land.form.typ;
  let d: number;
  if (f === 'lang') d = Math.hypot(nx * 3.2, ny * 0.98);
  else if (f === 'breit') d = Math.hypot(nx * 0.82, ny * 1.55);
  else if (f === 'dreieck') {
    const breite = 0.12 + (ny + 1) * 0.43;
    d = Math.max(Math.abs(nx) / Math.max(0.05, breite), (ny - 0.1) / 0.85, (-ny - 0.05) / 0.95);
  } else if (f === 'inseln') {
    d = 9;
    for (const r of land.regionen) {
      const dd = Math.hypot((nx - r.x) * 2.1, (ny - r.y) * 3.0);
      d = Math.min(d, dd + 0.25);
    }
  } else d = Math.hypot(nx * 1.02, ny * 0.95);
  return d + rausch;
}

const BASIS_HOEHE: Record<RegionTyp, number> = {
  metropole: 0.32,
  industrie: 0.3,
  agrar: 0.26,
  kueste: 0.2,
  wald: 0.38,
  berge: 0.7,
  bergbau: 0.34,
};

export function karteErzeugen(land: LandDef): Karte {
  const seed = land.form.seed ?? 1;
  const ausdehnung = HEX_RADIUS * HEX_GROESSE * 1.5;
  const hexe: Hex[] = [];
  for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
    for (let r = Math.max(-HEX_RADIUS, -q - HEX_RADIUS); r <= Math.min(HEX_RADIUS, -q + HEX_RADIUS); r++) {
      const x = HEX_GROESSE * SQRT3 * (q + r / 2);
      const z = HEX_GROESSE * 1.5 * r;
      const nx = x / ausdehnung;
      const ny = -z / ausdehnung;
      let wert = landWert(land, nx, ny, seed);
      // Regionszentren sind immer Land
      for (const rg of land.regionen) if (Math.hypot(nx - rg.x, ny - rg.y) < 0.16) wert = Math.min(wert, 0.5);
      const istLand = wert < 0.86 && Math.hypot(nx, ny * 0.95) < 1.08;
      hexe.push({ q, r, x, z, land: istLand, hoehe: 0, region: -1, kueste: false, zufall: hash(q, r, seed + 99) });
    }
  }

  // Regionen per Voronoi zuordnen
  const regionPos = land.regionen.map((rg) => ({ x: rg.x * ausdehnung, z: -rg.y * ausdehnung }));
  for (const h of hexe) {
    if (!h.land) continue;
    let best = 0;
    let bestD = Infinity;
    regionPos.forEach((p, i) => {
      const verzerrung = (fbm(h.x * 0.15 + i * 3, h.z * 0.15, seed + 5) - 0.5) * 3;
      const d = Math.hypot(h.x - p.x, h.z - p.z) + verzerrung;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    h.region = best;
  }

  // Nachbarn & Küste
  const index = new Map<string, number>();
  hexe.forEach((h, i) => index.set(`${h.q},${h.r}`, i));
  const nachbarn = (h: Hex) =>
    [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1],
    ].map(([dq, dr]) => index.get(`${h.q + dq},${h.r + dr}`));
  for (const h of hexe) {
    if (!h.land) continue;
    h.kueste = nachbarn(h).some((n) => n === undefined || !hexe[n].land);
  }

  // Höhen
  for (const h of hexe) {
    if (!h.land) {
      h.hoehe = 0.05;
      continue;
    }
    const typ = land.regionen[h.region].typ;
    const r = fbm(h.x * 0.25, h.z * 0.25, seed + 31);
    let hoehe = BASIS_HOEHE[typ] + (r - 0.5) * 0.18;
    if (typ === 'berge') hoehe += Math.pow(fbm(h.x * 0.35 + 7, h.z * 0.35, seed + 41), 2) * 1.6;
    if (h.kueste) hoehe = Math.min(hoehe, 0.22 + r * 0.1);
    h.hoehe = Math.max(0.14, hoehe);
  }

  // Regionen sammeln, Bauplätze vergeben
  const regionen = land.regionen.map((def, i) => {
    const idx = hexe.map((h, j) => (h.region === i ? j : -1)).filter((j) => j >= 0);
    const zx = idx.reduce((a, j) => a + hexe[j].x, 0) / Math.max(1, idx.length);
    const zz = idx.reduce((a, j) => a + hexe[j].z, 0) / Math.max(1, idx.length);
    return { def, hexe: idx, zentrum: { x: zx, z: zz }, projektSlots: [] as number[] };
  });

  // Stadtkerne: Metropolen um das Zentrum, sonst ein kleiner Ort
  for (const rg of regionen) {
    const sortiert = [...rg.hexe].sort(
      (a, b) => Math.hypot(hexe[a].x - rg.zentrum.x, hexe[a].z - rg.zentrum.z) - Math.hypot(hexe[b].x - rg.zentrum.x, hexe[b].z - rg.zentrum.z),
    );
    const stadtGroesse = rg.def.typ === 'metropole' ? 7 : rg.def.typ === 'industrie' ? 4 : 2;
    sortiert.slice(0, stadtGroesse).forEach((j) => (hexe[j].belegt = 'stadt'));
    // Projektplätze: nahe am Zentrum, aber außerhalb der Stadt
    const frei = sortiert.filter((j) => !hexe[j].belegt);
    rg.projektSlots = frei.filter((_, k) => k % 2 === 0).slice(0, 8);
    rg.projektSlots.forEach((j) => (hexe[j].belegt = 'projekt'));
  }

  // Energiestandorte
  const energieSlots: Karte['energieSlots'] = [];
  const kandidaten = hexe
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.land && !h.belegt)
    .filter(({ h }) => ['industrie', 'bergbau', 'kueste', 'agrar'].includes(land.regionen[h.region].typ))
    .sort((a, b) => a.h.zufall - b.h.zufall)
    .slice(0, 16);
  for (const { h, i } of kandidaten) {
    const typ = land.regionen[h.region].typ;
    const art = typ === 'kueste' || (typ === 'agrar' && h.zufall < 0.5) ? 'wind' : 'solar';
    h.belegt = 'energie';
    energieSlots.push({ hex: i, art });
  }

  // Felder & Minen
  for (const h of hexe) {
    if (!h.land || h.belegt) continue;
    const typ = land.regionen[h.region].typ;
    if (typ === 'agrar' && h.zufall > 0.3) h.belegt = 'feld';
    if (typ === 'bergbau' && h.zufall > 0.7) h.belegt = 'mine';
  }

  return { hexe, regionen, energieSlots, ausdehnung };
}
