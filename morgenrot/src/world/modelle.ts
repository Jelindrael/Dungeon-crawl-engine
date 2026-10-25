// Low-Poly-Modelle aus einfachen Geometrien mit Vertex-Farben.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function faerben(g: THREE.BufferGeometry, farbe: string | number): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(farbe);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  geo.deleteAttribute('uv');
  return geo;
}

function teil(g: THREE.BufferGeometry, farbe: string | number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  return faerben(g, farbe);
}

const merge = (teile: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(teile, false)!;
  g.computeVertexNormals();
  return g;
};

export const GEOMETRIEN = {
  hex: () => {
    const g = new THREE.CylinderGeometry(0.98, 0.98, 1, 6, 1);
    g.translate(0, 0.5, 0);
    const f = faerben(g, '#ffffff');
    f.computeVertexNormals();
    return f;
  },
  nadelbaum: () =>
    merge([
      teil(new THREE.CylinderGeometry(0.035, 0.05, 0.18, 5), '#6b4a2f', 0, 0.09, 0),
      teil(new THREE.ConeGeometry(0.2, 0.42, 6), '#2f6b3a', 0, 0.36, 0),
      teil(new THREE.ConeGeometry(0.15, 0.32, 6), '#3b7f45', 0, 0.56, 0),
    ]),
  laubbaum: () =>
    merge([
      teil(new THREE.CylinderGeometry(0.035, 0.05, 0.2, 5), '#6b4a2f', 0, 0.1, 0),
      teil(new THREE.IcosahedronGeometry(0.2, 0), '#4f9a48', 0, 0.36, 0),
    ]),
  haus: () =>
    merge([
      teil(new THREE.BoxGeometry(0.26, 0.2, 0.26), '#efe6d6', 0, 0.1, 0),
      teil(new THREE.ConeGeometry(0.23, 0.15, 4), '#c0503e', 0, 0.275, 0, 0, Math.PI / 4),
    ]),
  hochhaus: () =>
    merge([
      teil(new THREE.BoxGeometry(0.28, 1, 0.28), '#c9d3dd', 0, 0.5, 0),
      teil(new THREE.BoxGeometry(0.3, 0.04, 0.3), '#8a96a3', 0, 1.0, 0),
    ]),
  fabrik: () =>
    merge([
      teil(new THREE.BoxGeometry(0.55, 0.28, 0.38), '#8d8a86', 0, 0.14, 0),
      teil(new THREE.BoxGeometry(0.56, 0.04, 0.39), '#5e5b57', 0, 0.3, 0),
      teil(new THREE.CylinderGeometry(0.045, 0.065, 0.75, 6), '#9b4b3b', 0.18, 0.375, 0.08),
    ]),
  kuehlturm: () => {
    const punkte: THREE.Vector2[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      punkte.push(new THREE.Vector2(0.2 - Math.sin(t * Math.PI) * 0.06 + (t > 0.5 ? (t - 0.5) * 0.04 : 0), t * 0.6));
    }
    return merge([teil(new THREE.LatheGeometry(punkte, 10), '#b9b6b0')]);
  },
  windmast: () =>
    merge([
      teil(new THREE.CylinderGeometry(0.018, 0.035, 1.1, 6), '#f4f4f2', 0, 0.55, 0),
      teil(new THREE.BoxGeometry(0.06, 0.06, 0.14), '#f4f4f2', 0, 1.12, 0),
    ]),
  rotor: () => {
    const blaetter: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.BoxGeometry(0.035, 0.42, 0.012);
      b.translate(0, 0.21, 0);
      b.rotateZ((i * Math.PI * 2) / 3);
      blaetter.push(faerben(b, '#ffffff'));
    }
    blaetter.push(teil(new THREE.SphereGeometry(0.03, 6, 4), '#e8e8e8'));
    return merge(blaetter);
  },
  solar: () =>
    merge([
      teil(new THREE.BoxGeometry(0.34, 0.02, 0.22), '#24456e', 0, 0.12, 0, -0.5),
      teil(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4), '#999999', 0, 0.06, 0),
    ]),
  feld: () => teil(new THREE.BoxGeometry(1.35, 0.03, 1.35), '#ffffff', 0, 0.015, 0, 0, Math.PI / 6),
  mine: () =>
    merge([
      teil(new THREE.CylinderGeometry(0.5, 0.3, 0.06, 6), '#4a4440', 0, 0.03, 0),
      teil(new THREE.ConeGeometry(0.18, 0.2, 5), '#3a3532', 0.32, 0.1, 0.2),
      teil(new THREE.ConeGeometry(0.14, 0.16, 5), '#56504a', -0.3, 0.08, -0.25),
    ]),
  wolke: () =>
    merge([
      teil(new THREE.IcosahedronGeometry(0.6, 0), '#ffffff', 0, 0, 0),
      teil(new THREE.IcosahedronGeometry(0.45, 0), '#ffffff', 0.6, -0.1, 0.1),
      teil(new THREE.IcosahedronGeometry(0.4, 0), '#ffffff', -0.55, -0.12, -0.05),
    ]),
};

export const STANDARD_MATERIAL = () =>
  new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0.02 });

// ───────── Projektmodelle ─────────
const mat = (farbe: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: farbe, flatShading: true, roughness: 0.8, ...extra });

function box(w: number, h: number, d: number, farbe: string, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(farbe));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  return m;
}

function zyl(r1: number, r2: number, h: number, farbe: string, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat(farbe));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  return m;
}

function gebaeude(dach: string, hoehe = 0.35) {
  const g = new THREE.Group();
  g.add(box(0.6, hoehe, 0.45, '#f1ece2'));
  g.add(box(0.64, 0.05, 0.49, dach, 0, hoehe, 0));
  return g;
}

/** Erzeugt das Modell für ein fertiges Großprojekt. Rotoren werden über userData.rotor animiert. */
export function projektModell(modell: string): THREE.Group {
  const g = new THREE.Group();
  switch (modell) {
    case 'wind': {
      for (const [x, z] of [[-0.35, -0.2], [0.3, -0.25], [0, 0.35]]) {
        const mast = new THREE.Mesh(GEOMETRIEN.windmast(), STANDARD_MATERIAL());
        mast.position.set(x, 0, z);
        g.add(mast);
        const rotor = new THREE.Mesh(GEOMETRIEN.rotor(), STANDARD_MATERIAL());
        rotor.position.set(x, 1.12, z + 0.08);
        rotor.userData.rotor = true;
        g.add(rotor);
      }
      break;
    }
    case 'solar': {
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(GEOMETRIEN.solar(), STANDARD_MATERIAL());
        p.position.set(((i % 3) - 1) * 0.36, 0, (Math.floor(i / 3) - 0.5) * 0.36);
        g.add(p);
      }
      break;
    }
    case 'damm':
      g.add(box(1.2, 0.35, 0.18, '#a9a39a'));
      g.add(box(0.9, 0.05, 0.5, '#3d8fb0', 0, 0.3, -0.35));
      break;
    case 'geo':
      g.add(gebaeude('#d97706', 0.3));
      g.add(zyl(0.07, 0.07, 0.6, '#e5e7eb', 0.3, 0, 0.1));
      break;
    case 'netz':
      for (const x of [-0.4, 0, 0.4]) {
        g.add(zyl(0.02, 0.03, 0.8, '#9ca3af', x, 0, 0, 4));
        g.add(box(0.3, 0.02, 0.02, '#9ca3af', x, 0.7, 0));
      }
      break;
    case 'fabrik_gruen':
      g.add(box(0.7, 0.3, 0.5, '#e5e7eb'));
      g.add(box(0.72, 0.04, 0.52, '#3fb67a', 0, 0.3, 0));
      g.add(zyl(0.05, 0.05, 0.25, '#3fb67a', 0.25, 0.3, 0.1));
      break;
    case 'fabrik':
      g.add(box(0.6, 0.3, 0.42, '#8d8a86'));
      g.add(zyl(0.05, 0.07, 0.8, '#9b4b3b', 0.2, 0, 0.1));
      g.userData.rauch = new THREE.Vector3(0.2, 0.9, 0.1);
      break;
    case 'bahn':
      g.add(box(1.6, 0.04, 0.12, '#57534e'));
      g.add(box(0.5, 0.14, 0.12, '#f8fafc', -0.3, 0.04, 0));
      g.add(box(0.12, 0.14, 0.13, '#e5484d', -0.58, 0.04, 0));
      break;
    case 'tram':
      g.add(box(1.0, 0.03, 0.1, '#57534e'));
      g.add(box(0.4, 0.14, 0.12, '#f2b84b', 0.1, 0.03, 0));
      break;
    case 'wohnen':
      for (const [x, z, h] of [[-0.25, -0.15, 0.55], [0.22, -0.2, 0.45], [0, 0.25, 0.65]]) {
        g.add(box(0.28, h, 0.28, '#f4e3c3', x, 0, z));
        g.add(box(0.3, 0.03, 0.3, '#c0503e', x, h, z));
      }
      break;
    case 'deich':
      g.add(box(1.5, 0.22, 0.25, '#7cb35a'));
      break;
    case 'park':
    case 'wald':
      for (let i = 0; i < 7; i++) {
        const b = new THREE.Mesh(GEOMETRIEN.laubbaum(), STANDARD_MATERIAL());
        const a = (i / 7) * Math.PI * 2;
        b.position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35);
        b.scale.setScalar(1.1);
        g.add(b);
      }
      break;
    case 'farm':
      g.add(box(0.6, 0.2, 0.35, '#e0f2fe'));
      g.add(box(0.62, 0.03, 0.37, '#86efac', 0, 0.2, 0));
      break;
    case 'klinik':
      g.add(gebaeude('#e5484d'));
      g.add(box(0.06, 0.18, 0.02, '#ffffff', 0, 0.42, 0.23));
      g.add(box(0.18, 0.06, 0.02, '#ffffff', 0, 0.48, 0.23));
      break;
    case 'uni':
      g.add(gebaeude('#2563eb', 0.4));
      g.add(zyl(0.18, 0.18, 0.12, '#93c5fd', 0, 0.45, 0, 10));
      break;
    case 'rechenzentrum':
      g.add(box(0.7, 0.25, 0.45, '#334155'));
      g.add(box(0.72, 0.03, 0.47, '#38bdf8', 0, 0.25, 0));
      break;
    case 'zentrum':
      g.add(gebaeude('#f2b84b'));
      break;
    case 'kultur':
      g.add(gebaeude('#db2777', 0.3));
      g.add(zyl(0.015, 0.015, 0.4, '#e5e7eb', 0.25, 0.3, 0.15, 4));
      g.add(box(0.15, 0.09, 0.01, '#e5484d', 0.33, 0.6, 0.15));
      break;
    case 'dac':
      g.add(box(0.7, 0.35, 0.3, '#94a3b8'));
      for (const x of [-0.2, 0, 0.2]) g.add(zyl(0.08, 0.08, 0.02, '#1e293b', x, 0.35, 0, 10));
      break;
    case 'fusion': {
      const kuppel = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e0e7ff', { emissive: '#6366f1', emissiveIntensity: 0.25 }));
      g.add(kuppel);
      break;
    }
    case 'entsalzung':
      for (const x of [-0.25, 0.25]) g.add(zyl(0.18, 0.18, 0.3, '#f1f5f9', x, 0, 0, 10));
      break;
    case 'akw':
      for (const x of [-0.25, 0.28]) {
        const t = new THREE.Mesh(GEOMETRIEN.kuehlturm(), STANDARD_MATERIAL());
        t.position.set(x, 0, 0);
        t.scale.setScalar(1.3);
        g.add(t);
      }
      g.userData.dampf = new THREE.Vector3(0, 0.9, 0);
      break;
    default:
      g.add(gebaeude('#94a3b8'));
  }
  return g;
}

/** Baukran für laufende Projekte. */
export function kranModell(): THREE.Group {
  const g = new THREE.Group();
  g.add(zyl(0.02, 0.02, 0.9, '#f59e0b', 0, 0, 0, 4));
  g.add(box(0.6, 0.03, 0.03, '#f59e0b', 0.2, 0.88, 0));
  const geruest = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.4),
    new THREE.MeshBasicMaterial({ color: '#fbbf24', wireframe: true }),
  );
  geruest.position.set(-0.1, 0.15, 0.1);
  g.add(geruest);
  return g;
}
