// Prozeduraler Klang über die Web Audio API: ruhige Hintergrundmusik und dezente UI-Töne.
class Klang {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musikGain: GainNode | null = null;
  private musikLaeuft = false;
  private akkordIndex = 0;
  private akkordTimer = 0;
  private stimmen: OscillatorNode[] = [];
  ton = true;
  musik = true;

  /** Muss nach einer Nutzeraktion aufgerufen werden (Autoplay-Regeln der Browser). */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.musikGain = this.ctx.createGain();
      this.musikGain.gain.value = 0;
      this.musikGain.connect(this.master);
      if (this.musik) this.musikStarten();
    } catch {
      this.ctx = null;
    }
  }

  setTon(an: boolean) {
    this.ton = an;
  }

  setMusik(an: boolean) {
    this.musik = an;
    if (an) this.musikStarten();
    else this.musikStoppen();
  }

  private blip(freq: number, dauer: number, typ: OscillatorType = 'sine', lautstaerke = 0.12, verzoegerung = 0) {
    if (!this.ton || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime + verzoegerung;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = typ;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lautstaerke, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dauer + 0.05);
  }

  klick() {
    this.blip(880, 0.08, 'sine', 0.06);
  }
  wahl() {
    this.blip(660, 0.12, 'triangle', 0.08);
    this.blip(990, 0.16, 'triangle', 0.06, 0.06);
  }
  erfolg() {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.4, 'triangle', 0.07, i * 0.08));
  }
  warnung() {
    this.blip(220, 0.35, 'sawtooth', 0.04);
    this.blip(196, 0.45, 'sawtooth', 0.035, 0.15);
  }
  runde() {
    [392, 523, 659].forEach((f, i) => this.blip(f, 0.9, 'sine', 0.06, i * 0.12));
  }

  // ───────── Musik: langsam wechselnde Akkordflächen ─────────
  private static AKKORDE = [
    [220.0, 277.18, 329.63, 440.0], // A-Dur
    [196.0, 246.94, 293.66, 392.0], // G-Dur
    [174.61, 220.0, 261.63, 349.23], // F-Dur
    [164.81, 207.65, 246.94, 329.63], // E-Dur
    [220.0, 261.63, 329.63, 392.0], // Am7
    [146.83, 220.0, 293.66, 369.99], // D-Dur
  ];

  private musikStarten() {
    if (!this.ctx || !this.musikGain || this.musikLaeuft) return;
    this.musikLaeuft = true;
    this.musikGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musikGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 3);
    this.naechsterAkkord();
  }

  private musikStoppen() {
    if (!this.ctx || !this.musikGain) return;
    this.musikLaeuft = false;
    clearTimeout(this.akkordTimer);
    this.musikGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musikGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
  }

  private naechsterAkkord() {
    if (!this.ctx || !this.musikGain || !this.musikLaeuft) return;
    const ctx = this.ctx;
    const akkord = Klang.AKKORDE[this.akkordIndex % Klang.AKKORDE.length];
    this.akkordIndex += 1 + (Math.random() < 0.3 ? 1 : 0);
    const t = ctx.currentTime;
    const dauer = 9;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(1400, t + dauer / 2);
    filter.frequency.linearRampToValueAtTime(500, t + dauer);
    filter.connect(this.musikGain);
    for (const [i, f] of akkord.entries()) {
      for (const verstimmung of [-4, 4]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = (i === 0 ? f / 2 : f) * Math.pow(2, verstimmung / 1200);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18 / akkord.length, t + 3);
        g.gain.linearRampToValueAtTime(0.18 / akkord.length, t + dauer - 2);
        g.gain.linearRampToValueAtTime(0, t + dauer + 1);
        o.connect(g);
        g.connect(filter);
        o.start(t);
        o.stop(t + dauer + 1.2);
        this.stimmen.push(o);
      }
    }
    // Gelegentliche Glockentöne
    {
      const ton = akkord[Math.floor(Math.random() * akkord.length)] * 2;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = ton;
      g.gain.setValueAtTime(0, t + 2);
      g.gain.linearRampToValueAtTime(0.05, t + 2.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
      o.connect(g);
      g.connect(this.musikGain);
      o.start(t + 2);
      o.stop(t + 6.2);
    }
    this.stimmen = this.stimmen.slice(-24);
    this.akkordTimer = window.setTimeout(() => this.naechsterAkkord(), (dauer - 1.5) * 1000);
  }
}

export const klang = new Klang();

let haptikAn = true;
export function setHaptik(an: boolean) {
  haptikAn = an;
}
export function vibrieren(ms = 8) {
  if (!haptikAn) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* nicht unterstützt */
  }
}
