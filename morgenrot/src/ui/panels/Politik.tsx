// Politik: Stellschrauben, Regierungssystem, Großprojekte und Aktionen.
import { useState } from 'preact/hooks';
import { klang, vibrieren } from '../../audio/klang';
import { AKTIONEN } from '../../data/aktionen';
import { FRAKTIONEN } from '../../data/fraktionen';
import { LAND_MAP } from '../../data/laender';
import { POLITIK, SEKTOREN } from '../../data/politik';
import { PROJEKTE } from '../../data/projekte';
import type { Stellschraube } from '../../data/schema';
import { SPIELBARE_SYSTEME, SYSTEME } from '../../data/systeme';
import {
  aktionAusfuehren,
  aktionMoeglich,
  politikAendern,
  politikKosten,
  projektMoeglich,
  projektStarten,
  referendumChance,
  systemWechseln,
  systemWechselMoeglich,
} from '../../sim/engine';
import type { Effekte, Spielstand, SystemId, WertId } from '../../sim/types';
import { zahl } from '../format';
import { tippen, Wirkungen } from '../komponenten/basis';
import { spiel, ui, useSpiel, useUi } from '../store';

function stufenDiff(dial: Stellschraube, alt: number, neu: number): Effekte {
  const a = dial.stufen[alt]?.effekte ?? {};
  const n = dial.stufen[neu]?.effekte ?? {};
  const ziele: Partial<Record<WertId, number>> = {};
  for (const k of new Set([...Object.keys(a.ziele ?? {}), ...Object.keys(n.ziele ?? {})]) as Set<WertId>) {
    const d = (n.ziele?.[k] ?? 0) - (a.ziele?.[k] ?? 0);
    if (Math.abs(d) > 0.05) ziele[k] = d;
  }
  const bez: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a.beziehungen ?? {}), ...Object.keys(n.beziehungen ?? {})])) {
    const d = ((n.beziehungen as Record<string, number>)?.[k] ?? 0) - ((a.beziehungen as Record<string, number>)?.[k] ?? 0);
    if (Math.abs(d) > 0.5) bez[k] = d;
  }
  return {
    ziele,
    wachstum: (n.wachstum ?? 0) - (a.wachstum ?? 0) || undefined,
    haushalt: (n.haushalt ?? 0) - (a.haushalt ?? 0) || undefined,
    beziehungen: bez,
  };
}

function Dial({ s, dial }: { s: Spielstand; dial: Stellschraube }) {
  const aktuell = s.politik[dial.id] ?? 0;
  const [wahl, setWahl] = useState<number | null>(null);
  const regierung = s.phase === 'regierung';
  const st = wahl !== null ? dial.stufen[wahl] : null;
  const k = wahl !== null ? politikKosten(s, dial.id, wahl) : null;
  const geaendert = s.geaendert.includes(dial.id);
  const programm = s.programm[dial.id];

  const beschliessen = () => {
    if (wahl === null) return;
    const fehler = spiel.aendern((st) => politikAendern(st, dial.id, wahl));
    if (fehler) {
      klang.warnung();
      ui.toast(fehler, '⚠️', 'schlecht');
    } else {
      klang.wahl();
      vibrieren(15);
      ui.toast(`${dial.name}: ${dial.stufen[wahl].name}`, '✅', 'gut');
      setWahl(null);
    }
  };

  const diff = wahl !== null ? stufenDiff(dial, aktuell, wahl) : undefined;
  const haushalt = diff?.haushalt ?? 0;

  return (
    <div class={`dial ${geaendert ? 'geaendert' : ''}`}>
      <div class="dial-kopf">
        <div>
          <div class="dial-name">{dial.name}</div>
          <div class="dial-aktuell">{dial.stufen[aktuell].name}</div>
        </div>
        {geaendert && <span class="badge gold">neu</span>}
        {!regierung && programm !== undefined && programm !== aktuell && (
          <span class="badge schlecht" title="Dein Programm">vorher: {dial.stufen[programm].name}</span>
        )}
      </div>
      <div class="dial-stufen">
        {dial.stufen.map((stufe, i) => {
          const gesperrt = stufe.bedingung && !stufe.bedingung(s);
          return (
            <button
              class={`${i === aktuell ? 'aktuell' : ''} ${gesperrt ? 'gesperrt' : ''} ${i === wahl ? 'gewaehlt' : ''}`}
              onClick={tippen(() => setWahl(i === aktuell || i === wahl ? null : i))}
              aria-label={stufe.name}
            >
              {gesperrt ? '🔒' : i + 1}
            </button>
          );
        })}
      </div>
      {st && wahl !== null && (
        <div class="dial-detail">
          <div class="stufen-name">{st.name}</div>
          <div class="klein" style={{ color: 'var(--text-2)' }}>
            {st.text}
          </div>
          <Wirkungen effekte={diff} />
          {k && k.widerstand.length > 0 && (
            <div class="wirkungen">
              {k.widerstand.slice(0, 6).map((w) => (
                <span class={`wirkung ${w.wert > 0 ? 'gut' : 'schlecht'}`}>
                  {FRAKTIONEN[w.f].icon} {FRAKTIONEN[w.f].kurz} {w.wert > 0 ? '+' : '−'}
                  {zahl(Math.abs(w.wert))}
                </span>
              ))}
            </div>
          )}
          {Math.abs(haushalt) > 0.05 && (
            <div class="klein" style={{ color: haushalt > 0 ? 'var(--warn)' : 'var(--gut)' }}>
              {haushalt > 0 ? 'Kostet' : 'Spart'} {zahl(Math.abs(haushalt), 1)} % des BIP pro Jahr
            </div>
          )}
          {st.wechsel && wahl > aktuell && <div class="klein muted" style={{ marginTop: 4 }}>⚡ Der Wechsel löst kurzfristige Reaktionen aus.</div>}
          {regierung ? (
            <>
              <div class="aktion-zeile">
                <button class="knopf primaer" disabled={!k?.moeglich} onClick={tippen(beschliessen)}>
                  Beschließen
                </button>
                <span class="kosten">★ {k?.pk}</span>
              </div>
              {k && !k.moeglich && k.grund && <div class="hinweis">{k.grund}</div>}
            </>
          ) : (
            <div class="hinweis">Du regierst gerade nicht.</div>
          )}
        </div>
      )}
    </div>
  );
}

function SystemAbschnitt({ s }: { s: Spielstand }) {
  const [offen, setOffen] = useState<SystemId | null>(null);
  const aktuell = SYSTEME[s.system];
  return (
    <div>
      <div class="karte" style={{ borderColor: 'rgba(242,107,79,0.4)' }}>
        <div class="klein muted">Aktuelles System</div>
        <h3 style={{ fontSize: 21, margin: '2px 0 6px' }}>
          {aktuell.icon} {aktuell.name}
        </h3>
        <p class="klein" style={{ color: 'var(--text-2)' }}>
          {aktuell.text}
        </p>
      </div>
      <p class="klein muted">
        Das politische System bestimmt, wie schnell du entscheiden kannst, wie genau deine Informationen sind, wie legitim deine Herrschaft ist – und ob du abgewählt werden kannst.
      </p>
      {SPIELBARE_SYSTEME.filter((x) => x.id !== s.system).map((sys) => {
        const fehler = systemWechselMoeglich(s, sys.id);
        const auf = offen === sys.id;
        const demokratisch = sys.wahlen;
        return (
          <div class="dial">
            <button style={{ width: '100%', textAlign: 'left' }} onClick={tippen(() => setOffen(auf ? null : sys.id))}>
              <div class="dial-kopf">
                <div>
                  <div class="dial-name">
                    {sys.icon} {sys.name}
                  </div>
                  <div class="klein muted">{sys.weg === 'referendum' ? 'Referendum' : sys.weg === 'notstand' ? 'Ausnahmezustand' : 'Machtübernahme'}</div>
                </div>
                <span class={`badge ${fehler ? '' : 'gut'}`}>{fehler ? 'gesperrt' : 'möglich'}</span>
              </div>
            </button>
            {auf && (
              <div class="dial-detail">
                <p class="klein" style={{ color: 'var(--text-2)' }}>
                  {sys.text}
                </p>
                <div class="raster" style={{ gap: 8 }}>
                  <div>
                    <div class="klein gut" style={{ fontWeight: 700 }}>
                      Stärken
                    </div>
                    {sys.staerken.map((x) => (
                      <div class="klein">+ {x}</div>
                    ))}
                  </div>
                  <div>
                    <div class="klein schlecht" style={{ fontWeight: 700 }}>
                      Schwächen
                    </div>
                    {sys.schwaechen.map((x) => (
                      <div class="klein">− {x}</div>
                    ))}
                  </div>
                </div>
                <div class="klein muted" style={{ marginTop: 8 }}>
                  Entscheidungstempo: {sys.kostenFaktor < 0.85 ? 'sehr hoch' : sys.kostenFaktor < 1 ? 'hoch' : sys.kostenFaktor > 1 ? 'langsam' : 'normal'} · Information:{' '}
                  {sys.infoQualitaet < 0.7 ? 'geschönt' : 'verlässlich'} · Wahlen: {demokratisch ? 'ja' : 'nein'}
                </div>
                <div class="klein" style={{ marginTop: 6 }}>
                  📋 {sys.voraussetzungText}
                </div>
                {sys.weg === 'referendum' && !fehler && SYSTEME[s.system].wahlen && (
                  <div class="klein" style={{ marginTop: 4 }}>
                    🗳️ Erfolgschance des Referendums: <b>{zahl(referendumChance(s) * 100)} %</b>
                  </div>
                )}
                <div class="aktion-zeile">
                  <button
                    class={`knopf ${demokratisch ? 'primaer' : ''}`}
                    disabled={!!fehler}
                    onClick={tippen(() => {
                      const r = spiel.aendern((st) => systemWechseln(st, sys.id));
                      if (r.erfolg) klang.erfolg();
                      else klang.warnung();
                      ui.setzen({ ergebnisText: r.text });
                      setOffen(null);
                    })}
                  >
                    {sys.weg === 'referendum' ? 'Verfassungsänderung' : sys.weg === 'notstand' ? 'Notstand ausrufen' : 'Macht übernehmen'}
                  </button>
                  <span class="kosten">★ {sys.wechselKosten}</span>
                </div>
                {fehler && <div class="hinweis">{fehler}</div>}
                {!demokratisch && <div class="hinweis">⚠️ Achtung: Ohne freie Wahlen verlierst du Legitimität und verlässliche Informationen. Die Geschichte zeigt, wohin das führt.</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProjekteAbschnitt({ s }: { s: Spielstand }) {
  const [offen, setOffen] = useState<string | null>(null);
  const l = LAND_MAP[s.land];
  return (
    <div>
      {s.projekte.length > 0 && (
        <>
          <div class="abschnitt">Im Bau</div>
          {s.projekte.map((p) => {
            const def = PROJEKTE.find((x) => x.id === p.id)!;
            const region = l.regionen.find((r) => r.id === p.region)!;
            return (
              <div class="meldung">
                <span class="m-icon">{def.icon}</span>
                <span style={{ flex: 1 }}>
                  <b>{def.name}</b> <span class="muted">· {region.name}</span>
                  <div class="meter-balken">
                    <div style={{ width: `${(p.fortschritt / def.dauer) * 100}%`, background: 'var(--akzent-2)' }} />
                  </div>
                </span>
              </div>
            );
          })}
        </>
      )}
      <div class="abschnitt">Großprojekte</div>
      <p class="klein muted">Projekte werden in einer Region gebaut, kosten während des Baus Geld und wirken danach dauerhaft. Du kannst auch direkt auf eine Region der Karte tippen.</p>
      {PROJEKTE.map((p) => {
        const auf = offen === p.id;
        const anzahl = s.fertig.filter((x) => x.id === p.id).length;
        const regionen = l.regionen.filter((r) => p.regionen.includes(r.typ));
        if (!regionen.length) return null;
        const gesperrt = p.bedingung && !p.bedingung(s);
        return (
          <div class="dial">
            <button style={{ width: '100%', textAlign: 'left' }} onClick={tippen(() => setOffen(auf ? null : p.id))}>
              <div class="dial-kopf">
                <div>
                  <div class="dial-name">
                    {p.icon} {p.name}
                  </div>
                  <div class="klein muted">
                    {p.dauer / 2} Jahre · {zahl(p.kosten, 2)} % BIP/Jahr {p.max ? `· ${anzahl}/${p.max}` : ''}
                  </div>
                </div>
                {gesperrt ? <span class="badge">🔒</span> : <span class="kosten">★ {p.pk}</span>}
              </div>
            </button>
            {auf && (
              <div class="dial-detail">
                <p class="klein" style={{ color: 'var(--text-2)' }}>
                  {p.text}
                </p>
                <Wirkungen effekte={p.effekte} />
                {gesperrt && <div class="hinweis">{p.bedingungText}</div>}
                <div class="abschnitt" style={{ marginTop: 10 }}>
                  Region wählen
                </div>
                {regionen.map((r) => {
                  const fehler = projektMoeglich(s, p.id, r.id);
                  return (
                    <button
                      class="liste-knopf"
                      disabled={!!fehler}
                      style={fehler ? { opacity: 0.45 } : undefined}
                      onClick={tippen(() => {
                        const f = spiel.aendern((st) => projektStarten(st, p.id, r.id));
                        if (f) ui.toast(f, '⚠️', 'schlecht');
                        else {
                          klang.wahl();
                          ui.toast(`${p.name} in ${r.name} begonnen`, '🏗️', 'gut');
                          setOffen(null);
                        }
                      })}
                    >
                      <span class="icon">📍</span>
                      <span>
                        {r.name}
                        {fehler && <div class="klein muted">{fehler}</div>}
                      </span>
                      <span class="pfeil">›</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AktionenAbschnitt({ s, nur }: { s: Spielstand; nur?: 'innen' | 'aussen' | 'bewegung' }) {
  const liste = AKTIONEN.filter((a) => a.phase.includes(s.phase) && (!nur || a.kategorie === nur));
  const kategorien: { id: string; name: string }[] = [
    { id: 'innen', name: 'Innenpolitik' },
    { id: 'aussen', name: 'Außenpolitik' },
    { id: 'bewegung', name: s.phase === 'regime' ? 'Widerstand' : 'Bewegung' },
  ];
  return (
    <div>
      {s.phase === 'regime' && !nur && (
        <div class="karte" style={{ borderColor: 'rgba(239,90,95,0.5)' }}>
          <h3>Widerstand</h3>
          <div class="meter-balken" style={{ height: 10 }}>
            <div style={{ width: `${s.widerstand}%`, background: 'linear-gradient(90deg,#f26b4f,#f2b84b)' }} />
          </div>
          <p class="klein muted" style={{ marginTop: 8, marginBottom: 0 }}>
            Bei 100 fällt das Regime. Unruhe, Solidarität und internationale Unterstützung lassen den Widerstand wachsen, Überwachung bremst ihn.
          </p>
        </div>
      )}
      {kategorien.map((k) => {
        const aktionen = liste.filter((a) => a.kategorie === k.id);
        if (!aktionen.length) return null;
        return (
          <>
            {!nur && <div class="abschnitt">{k.name}</div>}
            {aktionen.map((a) => {
              const fehler = aktionMoeglich(s, a.id);
              return (
                <div class="dial">
                  <div class="dial-kopf">
                    <div style={{ flex: 1 }}>
                      <div class="dial-name">
                        {a.icon} {a.name}
                      </div>
                      <div class="klein" style={{ color: 'var(--text-2)', marginTop: 3 }}>
                        {a.text}
                      </div>
                    </div>
                  </div>
                  <div class="aktion-zeile">
                    <button
                      class="knopf klein"
                      disabled={!!fehler}
                      onClick={tippen(() => {
                        const text = spiel.aendern((st) => aktionAusfuehren(st, a.id));
                        klang.wahl();
                        ui.setzen({ ergebnisText: text });
                      })}
                    >
                      Ausführen
                    </button>
                    <span class="kosten">★ {a.pk}</span>
                  </div>
                  {fehler && <div class="hinweis">{fehler}</div>}
                </div>
              );
            })}
          </>
        );
      })}
    </div>
  );
}

export function Politik() {
  const s = useSpiel();
  const u = useUi();
  const regierung = s.phase === 'regierung';
  const standard = regierung ? 'wirtschaft' : 'aktionen';
  const sektor = u.unterseite ?? standard;
  const chips = [
    ...(regierung ? [] : [{ id: 'aktionen', name: s.phase === 'regime' ? '✊ Widerstand' : '✊ Bewegung' }]),
    ...SEKTOREN.map((x) => ({ id: x.id, name: `${x.icon} ${x.name}` })),
    ...(regierung
      ? [
          { id: 'system', name: '🏛️ System' },
          { id: 'projekte', name: '🏗️ Projekte' },
          { id: 'aktionen', name: '⚡ Aktionen' },
        ]
      : []),
  ];
  const sek = SEKTOREN.find((x) => x.id === sektor);
  return (
    <div>
      <div class="chips">
        {chips.map((c) => (
          <button class={`chip ${sektor === c.id ? 'aktiv' : ''}`} onClick={tippen(() => ui.setzen({ unterseite: c.id }))}>
            {c.name}
          </button>
        ))}
      </div>
      {sek && (
        <>
          <p class="klein muted" style={{ marginTop: 0 }}>
            {sek.text}
          </p>
          {!regierung && (
            <div class="hinweis" style={{ marginBottom: 10 }}>
              Die Regierung bestimmt gerade die Politik. Rot markiert ist, was sie von deinem Programm zurückgenommen hat.
            </div>
          )}
          {POLITIK.filter((d) => d.sektor === sektor).map((d) => (
            <Dial s={s} dial={d} key={d.id} />
          ))}
        </>
      )}
      {sektor === 'system' && <SystemAbschnitt s={s} />}
      {sektor === 'projekte' && <ProjekteAbschnitt s={s} />}
      {sektor === 'aktionen' && <AktionenAbschnitt s={s} />}
    </div>
  );
}
