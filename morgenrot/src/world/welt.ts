// Die 3D-Welt: eine stilisierte Hexagon-Insel, die sich mit dem Zustand des Landes verändert.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PROJEKT_MAP } from '../data/projekte';
import type { LandDef } from '../data/schema';
import { karteErzeugen, type Karte } from './karte';
import { GEOMETRIEN, kranModell, projektModell, STANDARD_MATERIAL } from './modelle';

export type Overlay = 'normal' | 'zustimmung' | 'verschmutzung' | 'unruhe';

export interface WeltZustand {
  erneuerbar: number;
  kernkraft: number;
  natur: number;
  verschmutzung: number;
  temperatur: number;
  wohlstand: number; // 0..1, beeinflusst Stadtgröße
  regime: boolean;
  regionen: { id: string; zustimmung: number; verschmutzung: number; unruhe: number }[];
  projekte: { uid: number; id: string; region: string; fertig: boolean }[];
}

const BIOM: Record<string, string> = {
  metropole: '#a9b49a',
  industrie: '#a39a8c',
  agrar: '#9cc56b',
  kueste: '#93c372',
  wald: '#5a9a4f',
  berge: '#8e9483',
  bergbau: '#a8916f',
};

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpC = new THREE.Color();
const Y = new THREE.Vector3(0, 1, 0);

function setze(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, s = 1, rotY = 0, sy = s) {
  tmpQ.setFromAxisAngle(Y, rotY);
  tmpS.set(s, sy, s);
  tmpP.set(x, y, z);
  tmpM.compose(tmpP, tmpQ, tmpS);
  mesh.setMatrixAt(i, tmpM);
}

interface EnergieSlot {
  x: number;
  y: number;
  z: number;
  art: 'wind' | 'solar';
  fossilAnteil: number; // aktuell angezeigter Zustand (0 = erneuerbar, 1 = fossil), animiert
  ziel: number;
}

export class Welt {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private kamera: THREE.PerspectiveCamera;
  private steuerung: OrbitControls;
  private uhr = new THREE.Clock();
  private container: HTMLElement;
  private labelEbene: HTMLDivElement;
  private labels: HTMLDivElement[] = [];
  private karte: Karte | null = null;
  private land: LandDef | null = null;
  private landGruppe = new THREE.Group();
  private hexMesh: THREE.InstancedMesh | null = null;
  private hexBasisFarben: THREE.Color[] = [];
  private wasser: THREE.Mesh;
  private wasserMat: THREE.ShaderMaterial;
  private himmelMat: THREE.ShaderMaterial;
  private sonne: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private baeume: THREE.InstancedMesh[] = [];
  private baumAnzahl = [0, 0];
  private haeuser: THREE.InstancedMesh | null = null;
  private haeuserAnzahl = 0;
  private hochhaeuser: THREE.InstancedMesh | null = null;
  private hochhausAnzahl = 0;
  private energie: EnergieSlot[] = [];
  private fabriken: THREE.InstancedMesh | null = null;
  private kuehltuerme: THREE.InstancedMesh | null = null;
  private windmasten: THREE.InstancedMesh | null = null;
  private rotoren: THREE.InstancedMesh | null = null;
  private rotorPositionen: THREE.Vector3[] = [];
  private solar: THREE.InstancedMesh | null = null;
  private rauch: THREE.Points;
  private rauchQuellen: THREE.Vector3[] = [];
  private projektRauch: THREE.Vector3[] = [];
  private dampfQuellen: THREE.Vector3[] = [];
  private wolken: THREE.InstancedMesh;
  private projektGruppe = new THREE.Group();
  private projektObjekte = new Map<string, THREE.Object3D>();
  private zustand: WeltZustand | null = null;
  private overlay: Overlay = 'normal';
  private ausgewaehlt = -1;
  private regionCallback: ((id: string | null) => void) | null = null;
  private laufend = true;
  private animationId = 0;
  private zeitraffer = 0;
  private verschmutzungAnzeige = 0;
  private wasserStand = 0;
  private qualitaet: 'hoch' | 'niedrig';
  private tippStart: { x: number; y: number; t: number } | null = null;
  private raycaster = new THREE.Raycaster();
  private beobachter: ResizeObserver;

  constructor(container: HTMLElement, qualitaet: 'hoch' | 'niedrig' = 'hoch') {
    this.container = container;
    this.qualitaet = qualitaet;
    this.renderer = new THREE.WebGLRenderer({ antialias: qualitaet === 'hoch', alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualitaet === 'hoch' ? 2 : 1.25));
    this.renderer.shadowMap.enabled = qualitaet === 'hoch';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'none';

    this.labelEbene = document.createElement('div');
    this.labelEbene.className = 'region-labels';
    container.appendChild(this.labelEbene);

    this.kamera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
    this.kamera.position.set(0, 34, 30);
    this.steuerung = new OrbitControls(this.kamera, this.renderer.domElement);
    this.steuerung.enableDamping = true;
    this.steuerung.dampingFactor = 0.08;
    this.steuerung.minDistance = 14;
    this.steuerung.maxDistance = 62;
    this.steuerung.minPolarAngle = 0.3;
    this.steuerung.maxPolarAngle = 1.12;
    this.steuerung.rotateSpeed = 0.6;
    this.steuerung.zoomSpeed = 0.9;
    this.steuerung.panSpeed = 0.7;
    this.steuerung.screenSpacePanning = false;
    this.steuerung.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    // Himmel
    this.himmelMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        oben: { value: new THREE.Color('#203a63') },
        horizont: { value: new THREE.Color('#f4a66a') },
        unten: { value: new THREE.Color('#2a3b52') },
      },
      vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 oben; uniform vec3 horizont; uniform vec3 unten; varying vec3 vPos;
        void main(){ float h = vPos.y; vec3 c = h > 0.0 ? mix(horizont, oben, pow(clamp(h*1.6,0.0,1.0),0.7)) : mix(horizont, unten, clamp(-h*4.0,0.0,1.0)); gl_FragColor = vec4(c,1.0); }`,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(320, 24, 16), this.himmelMat));
    this.scene.fog = new THREE.Fog('#e8b48c', 90, 260);

    // Licht
    this.hemi = new THREE.HemisphereLight('#fde7c8', '#3d5a48', 1.1);
    this.scene.add(this.hemi);
    this.sonne = new THREE.DirectionalLight('#ffd8a8', 2.2);
    this.sonne.position.set(-25, 30, 18);
    this.sonne.castShadow = qualitaet === 'hoch';
    this.sonne.shadow.mapSize.set(1024, 1024);
    const sc = this.sonne.shadow.camera as THREE.OrthographicCamera;
    sc.left = -26;
    sc.right = 26;
    sc.top = 26;
    sc.bottom = -26;
    sc.near = 1;
    sc.far = 90;
    this.sonne.shadow.bias = -0.0008;
    this.scene.add(this.sonne);

    // Wasser
    this.wasserMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        zeit: { value: 0 },
        tief: { value: new THREE.Color('#1d5f86') },
        flach: { value: new THREE.Color('#4cb2cc') },
        himmel: { value: new THREE.Color('#f4a66a') },
        trueb: { value: 0 },
        nebelFarbe: { value: new THREE.Color('#d9a08a') },
        nebelNah: { value: 60 },
        nebelFern: { value: 200 },
      },
      vertexShader: `uniform float zeit; varying vec3 vW; varying float vWelle;
        void main(){ vec3 p = position; float w = sin(p.x*0.35+zeit*0.8)*0.04 + cos(p.y*0.3+zeit*0.6)*0.04; p.z += w; vWelle = w;
          vec4 wp = modelMatrix * vec4(p,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform vec3 tief; uniform vec3 flach; uniform vec3 himmel; uniform float trueb; uniform vec3 nebelFarbe; uniform float nebelNah; uniform float nebelFern;
        varying vec3 vW; varying float vWelle;
        void main(){ float d = clamp(length(vW.xz)/32.0,0.0,1.0); vec3 c = mix(flach, tief, d);
          float glanz = pow(max(0.0, sin(vW.x*0.6 + vW.z*0.45 + vWelle*20.0)), 40.0) * 0.07;
          c = mix(c, himmel, 0.1 + vWelle*1.5) + glanz; c = mix(c, vec3(0.42,0.4,0.33), trueb*0.45);
          float n = smoothstep(nebelNah, nebelFern, distance(cameraPosition, vW));
          c = mix(c, nebelFarbe, n);
          gl_FragColor = vec4(c, 0.94); }`,
    });
    this.wasser = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 100, 100), this.wasserMat);
    this.wasser.rotation.x = -Math.PI / 2;
    this.wasser.position.y = 0.12;
    this.scene.add(this.wasser);
    const boden = new THREE.Mesh(new THREE.CircleGeometry(320, 24), new THREE.MeshBasicMaterial({ color: '#10283a' }));
    boden.rotation.x = -Math.PI / 2;
    boden.position.y = -0.6;
    this.scene.add(boden);

    // Rauch (Partikel)
    const rauchGeo = new THREE.BufferGeometry();
    const n = 240;
    rauchGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    rauchGeo.setAttribute('alter', new THREE.BufferAttribute(new Float32Array(n), 1));
    rauchGeo.setAttribute('farbe', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.rauch = new THREE.Points(
      rauchGeo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { pixel: { value: this.renderer.getPixelRatio() } },
        vertexShader: `attribute float alter; attribute float farbe; varying float vA; varying float vF; uniform float pixel;
          void main(){ vA = alter; vF = farbe; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = (14.0 + alter*40.0) * pixel / -mv.z * 6.0; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying float vA; varying float vF; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if(d>0.5) discard;
          vec3 col = mix(vec3(0.36,0.34,0.32), vec3(0.95), vF); gl_FragColor = vec4(col, (1.0-vA) * (0.5 - d) * 1.1); }`,
      }),
    );
    this.rauch.frustumCulled = false;
    this.scene.add(this.rauch);

    // Wolken
    this.wolken = new THREE.InstancedMesh(GEOMETRIEN.wolke(), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 0.9 }), 9);
    for (let i = 0; i < 9; i++) setze(this.wolken, i, (i - 4) * 9, 13 + (i % 3) * 2, -24 + ((i * 7) % 30), 0.8 + (i % 3) * 0.3);
    this.scene.add(this.wolken);

    this.scene.add(this.landGruppe);
    this.scene.add(this.projektGruppe);

    this.renderer.domElement.addEventListener('pointerdown', this.beiPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.beiPointerUp);
    this.beobachter = new ResizeObserver(() => this.groesse());
    this.beobachter.observe(container);
    this.groesse();
    document.addEventListener('visibilitychange', this.beiSichtbarkeit);
    this.schleife();
  }

  // ───────── Öffentliche API ─────────

  ladeLand(land: LandDef) {
    if (this.land?.id === land.id) return;
    this.land = land;
    this.karte = karteErzeugen(land);
    this.aufbauen();
    this.labelsAufbauen();
    this.projektObjekte.clear();
    this.projektGruppe.clear();
    if (this.zustand) this.aktualisieren(this.zustand, true);
  }

  aktualisieren(z: WeltZustand, sofort = false) {
    this.zustand = z;
    if (!this.karte || !this.land) return;
    this.vegetationAktualisieren(z);
    this.energieAktualisieren(z, sofort);
    this.projekteAktualisieren(z);
    this.farbenAktualisieren();
    if (sofort) {
      this.verschmutzungAnzeige = z.verschmutzung;
      this.wasserStand = Math.max(0, z.temperatur - 1.45) * 0.14;
    }
  }

  setOverlay(o: Overlay) {
    this.overlay = o;
    this.farbenAktualisieren();
    this.labels.forEach((l) => l.classList.toggle('sichtbar', o !== 'normal'));
  }

  onRegion(cb: (id: string | null) => void) {
    this.regionCallback = cb;
  }

  auswaehlen(regionId: string | null) {
    if (!this.land) return;
    const idx = regionId ? this.land.regionen.findIndex((r) => r.id === regionId) : -1;
    if (idx === this.ausgewaehlt) return;
    this.ausgewaehlt = idx;
    this.hexHoehenAktualisieren();
    this.farbenAktualisieren();
    this.labels.forEach((l, i) => l.classList.toggle('aktiv', i === idx));
    if (idx >= 0 && this.karte) {
      const zentrum = this.karte.regionen[idx].zentrum;
      this.kameraZiel = new THREE.Vector3(zentrum.x, 0, zentrum.z);
    }
  }

  setAutoRotation(an: boolean) {
    this.steuerung.autoRotate = an;
    this.steuerung.autoRotateSpeed = 0.35;
  }

  setInteraktiv(an: boolean) {
    this.steuerung.enabled = an;
  }

  zeitrafferStarten() {
    this.zeitraffer = 1;
  }

  pausieren(p: boolean) {
    this.laufend = !p;
    if (!p) {
      cancelAnimationFrame(this.animationId);
      this.uhr.getDelta();
      this.schleife();
    }
  }

  setQualitaet(q: 'hoch' | 'niedrig') {
    if (q === this.qualitaet) return;
    this.qualitaet = q;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === 'hoch' ? 2 : 1.25));
    this.renderer.shadowMap.enabled = q === 'hoch';
    this.sonne.castShadow = q === 'hoch';
    this.groesse();
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.beobachter.disconnect();
    document.removeEventListener('visibilitychange', this.beiSichtbarkeit);
    this.renderer.domElement.removeEventListener('pointerdown', this.beiPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.beiPointerUp);
    this.steuerung.dispose();
    this.renderer.dispose();
    this.container.innerHTML = '';
  }

  // ───────── Aufbau ─────────

  private kameraZiel: THREE.Vector3 | null = null;

  private aufbauen() {
    const karte = this.karte!;
    const land = this.land!;
    this.landGruppe.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.landGruppe.clear();
    this.energie = [];
    this.rotorPositionen = [];

    const mat = STANDARD_MATERIAL();
    const landHexe = karte.hexe.filter((h) => h.land);

    // Hexfelder
    this.hexMesh = new THREE.InstancedMesh(GEOMETRIEN.hex(), mat, landHexe.length);
    this.hexMesh.receiveShadow = true;
    this.hexMesh.castShadow = true;
    this.hexBasisFarben = [];
    landHexe.forEach((h, i) => {
      setze(this.hexMesh!, i, h.x, 0, h.z, 1, 0, h.hoehe);
      const typ = land.regionen[h.region].typ;
      const c = new THREE.Color(BIOM[typ]);
      if (h.kueste && typ !== 'berge') c.lerp(new THREE.Color('#d8c690'), 0.55);
      if (typ === 'berge' && h.hoehe > 1.25) c.lerp(new THREE.Color('#f1f1ee'), 0.8);
      c.offsetHSL(0, 0, (h.zufall - 0.5) * 0.06);
      this.hexBasisFarben.push(c);
      this.hexMesh!.setColorAt(i, c);
    });
    this.hexMesh.userData.hexIndex = landHexe.map((h) => karte.hexe.indexOf(h));
    this.landGruppe.add(this.hexMesh);

    // Bäume: zuerst Wald- und Bergregionen, dann verstreut
    const baumPlaetze: { x: number; y: number; z: number; prio: number; nadel: boolean }[] = [];
    for (const h of landHexe) {
      if (h.belegt) continue;
      const typ = land.regionen[h.region].typ;
      const dichte = typ === 'wald' ? 4 : typ === 'berge' ? 2 : typ === 'kueste' ? 1 : typ === 'agrar' ? 0.6 : 0.8;
      const anzahl = Math.floor(dichte + h.zufall);
      for (let k = 0; k < anzahl; k++) {
        const a = h.zufall * 20 + k * 2.4;
        const r = 0.25 + ((k * 0.37 + h.zufall) % 0.5);
        baumPlaetze.push({
          x: h.x + Math.cos(a) * r,
          y: h.hoehe,
          z: h.z + Math.sin(a) * r,
          prio: (typ === 'wald' ? 0 : 0.5) + ((h.zufall * 7 + k * 0.13) % 0.5),
          nadel: typ === 'berge' || (typ === 'wald' && k % 2 === 0),
        });
      }
    }
    baumPlaetze.sort((a, b) => a.prio - b.prio);
    const nadel = baumPlaetze.filter((b) => b.nadel);
    const laub = baumPlaetze.filter((b) => !b.nadel);
    this.baeume = [GEOMETRIEN.nadelbaum(), GEOMETRIEN.laubbaum()].map((g, idx) => {
      const liste = idx === 0 ? nadel : laub;
      const m = new THREE.InstancedMesh(g, mat, Math.max(1, liste.length));
      m.castShadow = true;
      liste.forEach((b, i) => setze(m, i, b.x, b.y, b.z, 0.85 + ((i * 0.31) % 0.4), i));
      this.landGruppe.add(m);
      return m;
    });
    this.baumAnzahl = [nadel.length, laub.length];

    // Städte
    const hausPlaetze: { x: number; y: number; z: number }[] = [];
    const turmPlaetze: { x: number; y: number; z: number; h: number }[] = [];
    for (const h of landHexe) {
      if (h.belegt !== 'stadt') continue;
      const typ = land.regionen[h.region].typ;
      const istMetro = typ === 'metropole';
      for (let k = 0; k < 5; k++) {
        const a = k * 1.26 + h.zufall * 6;
        const r = k === 0 ? 0 : 0.45;
        if (istMetro && k < 2) turmPlaetze.push({ x: h.x + Math.cos(a) * r * 0.6, y: h.hoehe, z: h.z + Math.sin(a) * r * 0.6, h: 0.6 + ((h.zufall * 9 + k) % 1) * 1.2 });
        else hausPlaetze.push({ x: h.x + Math.cos(a) * r, y: h.hoehe, z: h.z + Math.sin(a) * r });
      }
    }
    this.haeuser = new THREE.InstancedMesh(GEOMETRIEN.haus(), mat, Math.max(1, hausPlaetze.length));
    this.haeuser.castShadow = true;
    hausPlaetze.forEach((p, i) => setze(this.haeuser!, i, p.x, p.y, p.z, 1, i * 0.7));
    this.haeuserAnzahl = hausPlaetze.length;
    this.landGruppe.add(this.haeuser);
    this.hochhaeuser = new THREE.InstancedMesh(GEOMETRIEN.hochhaus(), mat, Math.max(1, turmPlaetze.length));
    this.hochhaeuser.castShadow = true;
    turmPlaetze.forEach((p, i) => setze(this.hochhaeuser!, i, p.x, p.y, p.z, 1, 0, p.h));
    this.hochhausAnzahl = turmPlaetze.length;
    this.landGruppe.add(this.hochhaeuser);

    // Felder und Minen
    const felder = landHexe.filter((h) => h.belegt === 'feld');
    const feldMesh = new THREE.InstancedMesh(GEOMETRIEN.feld(), mat, Math.max(1, felder.length));
    const feldFarben = ['#d9c25a', '#b8d36a', '#8fbf4f', '#e2b85c'];
    felder.forEach((h, i) => {
      setze(feldMesh, i, h.x, h.hoehe, h.z, 0.62);
      feldMesh.setColorAt(i, new THREE.Color(feldFarben[Math.floor(h.zufall * 4)]));
    });
    feldMesh.receiveShadow = true;
    this.landGruppe.add(feldMesh);
    const minen = landHexe.filter((h) => h.belegt === 'mine');
    const mineMesh = new THREE.InstancedMesh(GEOMETRIEN.mine(), mat, Math.max(1, minen.length));
    minen.forEach((h, i) => setze(mineMesh, i, h.x, h.hoehe, h.z, 1, h.zufall * 6));
    this.landGruppe.add(mineMesh);

    // Energiestandorte: jeder Platz zeigt Kohle/Gas ODER Wind/Sonne
    const slots = karte.energieSlots.map((e) => {
      const h = karte.hexe[e.hex];
      return { x: h.x, y: h.hoehe, z: h.z, art: e.art, fossilAnteil: 1, ziel: 1 } as EnergieSlot;
    });
    this.energie = slots;
    this.fabriken = new THREE.InstancedMesh(GEOMETRIEN.fabrik(), mat, Math.max(1, slots.length));
    this.kuehltuerme = new THREE.InstancedMesh(GEOMETRIEN.kuehlturm(), mat, Math.max(1, slots.length));
    const windSlots = slots.filter((s) => s.art === 'wind');
    this.windmasten = new THREE.InstancedMesh(GEOMETRIEN.windmast(), mat, Math.max(1, windSlots.length * 2));
    this.rotoren = new THREE.InstancedMesh(GEOMETRIEN.rotor(), mat, Math.max(1, windSlots.length * 2));
    const solarSlots = slots.filter((s) => s.art === 'solar');
    this.solar = new THREE.InstancedMesh(GEOMETRIEN.solar(), mat, Math.max(1, solarSlots.length * 4));
    for (const m of [this.fabriken, this.kuehltuerme, this.windmasten, this.rotoren, this.solar]) {
      m.castShadow = true;
      this.landGruppe.add(m);
    }
    this.rotorPositionen = [];
    windSlots.forEach((s) => {
      this.rotorPositionen.push(new THREE.Vector3(s.x - 0.3, s.y + 1.12, s.z + 0.08), new THREE.Vector3(s.x + 0.3, s.y + 1.12, s.z - 0.12));
    });
    this.energieMatrizen();

    // Kamera ausrichten
    this.kameraZuruecksetzen();
  }

  private labelsAufbauen() {
    this.labelEbene.innerHTML = '';
    this.labels = [];
    if (!this.karte) return;
    for (const rg of this.karte.regionen) {
      const el = document.createElement('div');
      el.className = 'region-label';
      el.textContent = rg.def.name;
      this.labelEbene.appendChild(el);
      this.labels.push(el);
    }
  }

  // ───────── Aktualisierung ─────────

  private vegetationAktualisieren(z: WeltZustand) {
    const anteil = Math.min(1, Math.max(0.15, (z.natur - 10) / 75));
    this.baeume.forEach((m, i) => {
      m.count = Math.max(0, Math.round(this.baumAnzahl[i] * anteil));
    });
    if (this.haeuser) this.haeuser.count = Math.max(1, Math.round(this.haeuserAnzahl * (0.45 + z.wohlstand * 0.55)));
    if (this.hochhaeuser) this.hochhaeuser.count = Math.max(1, Math.round(this.hochhausAnzahl * (0.35 + z.wohlstand * 0.65)));
  }

  private energieAktualisieren(z: WeltZustand, sofort: boolean) {
    const fossil = Math.max(0, 100 - z.erneuerbar - z.kernkraft) / 100;
    const n = this.energie.length;
    const anzahlFossil = Math.round(fossil * n);
    // Die zuletzt sortierten Plätze werden zuerst erneuerbar
    this.energie.forEach((s, i) => {
      s.ziel = i < anzahlFossil ? 1 : 0;
      if (sofort) s.fossilAnteil = s.ziel;
    });
    this.energieMatrizen();
  }

  private energieMatrizen() {
    if (!this.fabriken || !this.kuehltuerme || !this.windmasten || !this.rotoren || !this.solar) return;
    let wi = 0;
    let si = 0;
    this.rauchQuellen = [];
    this.energie.forEach((s, i) => {
      const f = s.fossilAnteil;
      const fs = Math.max(0.0001, f);
      setze(this.fabriken!, i, s.x - 0.15, s.y, s.z + 0.1, fs);
      setze(this.kuehltuerme!, i, s.x + 0.35, s.y, s.z - 0.25, fs * 1.2);
      if (f > 0.5) this.rauchQuellen.push(new THREE.Vector3(s.x + 0.03, s.y + 0.78, s.z + 0.18), new THREE.Vector3(s.x + 0.35, s.y + 0.72, s.z - 0.25));
      const e = Math.max(0.0001, 1 - f);
      if (s.art === 'wind') {
        setze(this.windmasten!, wi, s.x - 0.3, s.y, s.z, e);
        setze(this.windmasten!, wi + 1, s.x + 0.3, s.y, s.z - 0.2, e);
        wi += 2;
      } else {
        for (let k = 0; k < 4; k++) setze(this.solar!, si + k, s.x + ((k % 2) - 0.5) * 0.4, s.y, s.z + (Math.floor(k / 2) - 0.5) * 0.32, e);
        si += 4;
      }
    });
    for (const m of [this.fabriken, this.kuehltuerme, this.windmasten, this.solar]) m.instanceMatrix.needsUpdate = true;
  }

  private projekteAktualisieren(z: WeltZustand) {
    if (!this.karte || !this.land) return;
    const vorhanden = new Set<string>();
    const slotBelegung = new Map<number, number>();
    this.dampfQuellen = [];
    this.projektRauch = [];
    for (const p of z.projekte) {
      const rIdx = this.land.regionen.findIndex((r) => r.id === p.region);
      if (rIdx < 0) continue;
      const region = this.karte.regionen[rIdx];
      const belegung = slotBelegung.get(rIdx) ?? 0;
      slotBelegung.set(rIdx, belegung + 1);
      const slot = region.projektSlots[belegung % Math.max(1, region.projektSlots.length)];
      if (slot === undefined) continue;
      const h = this.karte.hexe[slot];
      const schluessel = `${p.uid}-${p.fertig ? 'f' : 'b'}`;
      vorhanden.add(schluessel);
      let obj = this.projektObjekte.get(schluessel);
      if (!obj) {
        const def = PROJEKT_MAP[p.id];
        obj = p.fertig ? projektModell(def?.modell ?? 'zentrum') : kranModell();
        obj.position.set(h.x, h.hoehe, h.z);
        obj.rotation.y = h.zufall * Math.PI;
        obj.scale.setScalar(p.fertig ? 0.01 : 1);
        obj.userData.wachsen = p.fertig ? 0.01 : 1;
        this.projektGruppe.add(obj);
        this.projektObjekte.set(schluessel, obj);
      }
      const r = obj.userData.rauch as THREE.Vector3 | undefined;
      if (r && p.fertig) this.projektRauch.push(new THREE.Vector3(h.x + r.x, h.hoehe + r.y, h.z + r.z));
      if (obj.userData.dampf) this.dampfQuellen.push(new THREE.Vector3(h.x, h.hoehe + 0.9, h.z));
    }
    for (const [k, obj] of this.projektObjekte) {
      if (!vorhanden.has(k)) {
        this.projektGruppe.remove(obj);
        this.projektObjekte.delete(k);
      }
    }
  }

  private hexHoehenAktualisieren() {
    if (!this.hexMesh || !this.karte) return;
    const idx = this.hexMesh.userData.hexIndex as number[];
    idx.forEach((hi, i) => {
      const h = this.karte!.hexe[hi];
      const hoch = h.region === this.ausgewaehlt ? 0.12 : 0;
      setze(this.hexMesh!, i, h.x, 0, h.z, 1, 0, h.hoehe + hoch);
    });
    this.hexMesh.instanceMatrix.needsUpdate = true;
  }

  private farbenAktualisieren() {
    if (!this.hexMesh || !this.karte || !this.zustand) return;
    const z = this.zustand;
    const idx = this.hexMesh.userData.hexIndex as number[];
    const trocken = Math.max(0, Math.min(1, (z.temperatur - 1.8) / 1.5));
    const schmutz = Math.min(1, z.verschmutzung / 100);
    const regionWerte = new Map(z.regionen.map((r, i) => [i, r]));
    const skala = (v: number, gutHoch: boolean) => {
      const t = Math.max(0, Math.min(1, v / 100));
      const g = gutHoch ? t : 1 - t;
      return tmpC.setHSL(g * 0.33, 0.65, 0.48).clone();
    };
    idx.forEach((hi, i) => {
      const h = this.karte!.hexe[hi];
      let c: THREE.Color;
      if (this.overlay === 'normal') {
        c = this.hexBasisFarben[i].clone();
        c.lerp(new THREE.Color('#c9b46c'), trocken * 0.35);
        c.lerp(new THREE.Color('#857a68'), schmutz * 0.25);
      } else {
        const r = regionWerte.get(h.region);
        const v = r ? (this.overlay === 'zustimmung' ? r.zustimmung : this.overlay === 'verschmutzung' ? r.verschmutzung : r.unruhe) : 50;
        c = skala(v, this.overlay === 'zustimmung');
        c.offsetHSL(0, 0, (h.zufall - 0.5) * 0.05);
      }
      if (h.region === this.ausgewaehlt) c.offsetHSL(0, 0.05, 0.1);
      this.hexMesh!.setColorAt(i, c);
    });
    if (this.hexMesh.instanceColor) this.hexMesh.instanceColor.needsUpdate = true;
  }

  private atmosphaere(dt: number) {
    if (!this.zustand) return;
    const z = this.zustand;
    this.verschmutzungAnzeige += (z.verschmutzung - this.verschmutzungAnzeige) * Math.min(1, dt * 1.5);
    const zielWasser = Math.max(0, z.temperatur - 1.45) * 0.14;
    this.wasserStand += (zielWasser - this.wasserStand) * Math.min(1, dt * 0.8);
    this.wasser.position.y = 0.12 + this.wasserStand;
    const p = Math.min(1, this.verschmutzungAnzeige / 90);
    const reg = z.regime ? 1 : 0;
    // Zeitraffer: kurzer Sonnenlauf beim Rundenende
    let hell = 1;
    if (this.zeitraffer > 0) {
      this.zeitraffer = Math.max(0, this.zeitraffer - dt / 1.8);
      const t = 1 - this.zeitraffer;
      hell = 0.55 + 0.45 * Math.abs(Math.cos(t * Math.PI));
      const winkel = -0.9 + t * 1.8;
      this.sonne.position.set(Math.sin(winkel) * 30, 26 + Math.cos(t * Math.PI * 2) * 4, 18);
    }
    const oben = new THREE.Color('#1f3d6b').lerp(new THREE.Color('#4a4a4a'), p * 0.5).lerp(new THREE.Color('#1b1f2a'), reg * 0.6);
    const horizont = new THREE.Color('#f6a96c').lerp(new THREE.Color('#a48f73'), p * 0.7).lerp(new THREE.Color('#5d5a63'), reg * 0.7);
    oben.multiplyScalar(hell);
    horizont.multiplyScalar(0.7 + hell * 0.3);
    this.himmelMat.uniforms.oben.value.copy(oben);
    this.himmelMat.uniforms.horizont.value.copy(horizont);
    this.wasserMat.uniforms.himmel.value.copy(horizont);
    this.wasserMat.uniforms.trueb.value = p;
    const fog = this.scene.fog as THREE.Fog;
    const nebel = horizont.clone().lerp(oben, 0.35);
    fog.color.copy(nebel);
    this.wasserMat.uniforms.nebelFarbe.value.copy(nebel);
    const d = this.kamera.position.distanceTo(this.steuerung.target);
    fog.near = d * (1.15 - p * 0.45);
    fog.far = d * (3.2 - p * 1.3);
    this.wasserMat.uniforms.nebelNah.value = fog.near * 0.9;
    this.wasserMat.uniforms.nebelFern.value = fog.far * 0.85;
    this.sonne.intensity = (2.2 - p * 0.7 - reg * 0.8) * hell;
    this.sonne.color.set('#ffd8a8').lerp(new THREE.Color('#d6d3d1'), reg * 0.6 + p * 0.3);
    this.hemi.intensity = (1.1 - reg * 0.35) * (0.8 + hell * 0.2);
  }

  private rauchAktualisieren(dt: number) {
    const pos = this.rauch.geometry.attributes.position as THREE.BufferAttribute;
    const alter = this.rauch.geometry.attributes.alter as THREE.BufferAttribute;
    const farbe = this.rauch.geometry.attributes.farbe as THREE.BufferAttribute;
    const quellen = [
      ...this.rauchQuellen.map((v) => ({ v, dampf: 0 })),
      ...this.projektRauch.map((v) => ({ v, dampf: 0 })),
      ...this.dampfQuellen.map((v) => ({ v, dampf: 1 })),
    ];
    const n = pos.count;
    for (let i = 0; i < n; i++) {
      let a = alter.getX(i) + dt * 0.35;
      if (a >= 1 || a === 0) {
        if (!quellen.length || i % 240 >= quellen.length * 14) {
          alter.setX(i, 0.999);
          pos.setXYZ(i, 0, -50, 0);
          continue;
        }
        const q = quellen[i % quellen.length];
        pos.setXYZ(i, q.v.x + (Math.random() - 0.5) * 0.05, q.v.y, q.v.z + (Math.random() - 0.5) * 0.05);
        farbe.setX(i, q.dampf);
        a = Math.random() * 0.1 + 0.001;
      } else {
        pos.setXYZ(i, pos.getX(i) + dt * 0.25, pos.getY(i) + dt * 0.55, pos.getZ(i) + dt * 0.08);
      }
      alter.setX(i, a);
    }
    pos.needsUpdate = true;
    alter.needsUpdate = true;
    farbe.needsUpdate = true;
  }

  private labelsAktualisieren() {
    if (!this.karte) return;
    const breite = this.container.clientWidth;
    const hoehe = this.container.clientHeight;
    const abstand = this.kamera.position.distanceTo(this.steuerung.target);
    const nah = abstand < this.gesamtAbstand() * 0.7;
    this.karte.regionen.forEach((rg, i) => {
      const el = this.labels[i];
      if (!el) return;
      tmpP.set(rg.zentrum.x, 1.6, rg.zentrum.z).project(this.kamera);
      const sichtbar = tmpP.z < 1;
      el.style.transform = `translate(-50%, -50%) translate(${((tmpP.x + 1) / 2) * breite}px, ${((1 - tmpP.y) / 2) * hoehe}px)`;
      el.classList.toggle('nah', nah && sichtbar);
      el.style.display = sichtbar ? '' : 'none';
    });
  }

  // ───────── Schleife & Eingabe ─────────

  private schleife = () => {
    if (!this.laufend) return;
    this.animationId = requestAnimationFrame(this.schleife);
    const dt = Math.min(0.05, this.uhr.getDelta());
    const t = this.uhr.elapsedTime;

    if (this.kameraZiel) {
      this.steuerung.target.lerp(this.kameraZiel, Math.min(1, dt * 3));
      if (this.steuerung.target.distanceTo(this.kameraZiel) < 0.05) this.kameraZiel = null;
    }
    // Ziel innerhalb der Insel halten
    const tgt = this.steuerung.target;
    const max = 14;
    if (tgt.length() > max) tgt.setLength(max);
    tgt.y = 0;
    this.steuerung.update();

    this.wasserMat.uniforms.zeit.value = t;
    this.atmosphaere(dt);

    // Energie-Übergänge animieren
    let geaendert = false;
    for (const s of this.energie) {
      if (Math.abs(s.fossilAnteil - s.ziel) > 0.001) {
        s.fossilAnteil += (s.ziel - s.fossilAnteil) * Math.min(1, dt * 1.5);
        if (Math.abs(s.fossilAnteil - s.ziel) < 0.01) s.fossilAnteil = s.ziel;
        geaendert = true;
      }
    }
    if (geaendert) this.energieMatrizen();

    // Rotoren drehen
    if (this.rotoren && this.windmasten) {
      const windSlots = this.energie.filter((s) => s.art === 'wind');
      this.rotorPositionen.forEach((p, i) => {
        const slot = windSlots[Math.floor(i / 2)];
        const sichtbar = slot ? Math.max(0.0001, 1 - slot.fossilAnteil) : 0.0001;
        tmpQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), t * 2.2 + i);
        tmpS.setScalar(sichtbar);
        tmpM.compose(p, tmpQ, tmpS);
        this.rotoren!.setMatrixAt(i, tmpM);
      });
      this.rotoren.instanceMatrix.needsUpdate = true;
    }
    this.projektGruppe.traverse((o) => {
      if (o.userData.rotor) o.rotation.z = t * 2.4 + o.id;
      if (o.userData.wachsen !== undefined && o.userData.wachsen < 1) {
        o.userData.wachsen = Math.min(1, o.userData.wachsen + dt * 1.2);
        const e = 1 - Math.pow(1 - o.userData.wachsen, 3);
        o.scale.setScalar(Math.max(0.01, e));
      }
    });

    // Wolken treiben
    for (let i = 0; i < 9; i++) {
      const x = (((i - 4) * 9 + t * (0.3 + (i % 3) * 0.1) + 60) % 120) - 60;
      setze(this.wolken, i, x, 13 + (i % 3) * 2, -24 + ((i * 7) % 30), 0.8 + (i % 3) * 0.3);
    }
    this.wolken.instanceMatrix.needsUpdate = true;
    (this.wolken.material as THREE.MeshStandardMaterial).color.set(this.zustand?.regime ? '#9ca3af' : '#ffffff');

    this.rauchAktualisieren(dt);
    this.labelsAktualisieren();
    this.renderer.render(this.scene, this.kamera);
  };

  /** Abstand, aus dem die ganze Insel ins Bild passt. */
  private gesamtAbstand(): number {
    const breite = (this.karte?.ausdehnung ?? 18) * 1.08;
    const vHalb = THREE.MathUtils.degToRad(this.kamera.fov / 2);
    const hHalb = Math.atan(Math.tan(vHalb) * this.kamera.aspect);
    return Math.max(breite / Math.tan(hHalb), breite / Math.tan(vHalb) * 0.8);
  }

  kameraZuruecksetzen() {
    const d = this.gesamtAbstand();
    const polar = 0.72;
    this.kamera.position.set(0, Math.cos(polar) * d, Math.sin(polar) * d);
    this.steuerung.target.set(0, 0, 0);
    this.steuerung.maxDistance = d * 1.15;
    this.steuerung.minDistance = Math.min(14, d * 0.35);
    this.steuerung.update();
  }

  private groesse() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.kamera.aspect = w / h;
    this.kamera.fov = w < h ? 46 : 36;
    this.kamera.updateProjectionMatrix();
    this.steuerung.maxDistance = this.gesamtAbstand() * 1.15;
  }

  private beiSichtbarkeit = () => {
    if (document.hidden) cancelAnimationFrame(this.animationId);
    else if (this.laufend) {
      cancelAnimationFrame(this.animationId);
      this.uhr.getDelta();
      this.schleife();
    }
  };

  private beiPointerDown = (e: PointerEvent) => {
    this.tippStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private beiPointerUp = (e: PointerEvent) => {
    const s = this.tippStart;
    this.tippStart = null;
    if (!s || !this.hexMesh || !this.land || !this.steuerung.enabled) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10 || performance.now() - s.t > 400) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    const treffer = this.raycaster.intersectObject(this.hexMesh, false)[0];
    if (treffer && treffer.instanceId !== undefined) {
      const hi = (this.hexMesh.userData.hexIndex as number[])[treffer.instanceId];
      const region = this.karte!.hexe[hi].region;
      const id = this.land.regionen[region]?.id ?? null;
      this.regionCallback?.(id);
    } else {
      this.regionCallback?.(null);
    }
  };
}
