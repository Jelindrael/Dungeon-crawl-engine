// Detailansicht einer Region mit Kennzahlen und Bauprojekten.
import { useState } from 'preact/hooks';
import { klang } from '../../audio/klang';
import { LAND_MAP } from '../../data/laender';
import { PROJEKTE, PROJEKT_MAP } from '../../data/projekte';
import { projektMoeglich, projektStarten } from '../../sim/engine';
import { REGION_TYP_NAMEN, regionsWerte } from '../../sim/regionen';
import { prozentFarbe, zahl } from '../format';
import { Meter, Sheet, tippen, Wirkungen } from '../komponenten/basis';
import { spiel, ui, useSpiel } from '../store';

export function RegionPanel({ id }: { id: string }) {
  const s = useSpiel();
  const [offen, setOffen] = useState<string | null>(null);
  const l = LAND_MAP[s.land];
  const r = l.regionen.find((x) => x.id === id);
  const werte = regionsWerte(s).find((x) => x.region.id === id);
  if (!r || !werte) return null;
  const fertig = s.fertig.filter((p) => p.region === id);
  const laufend = s.projekte.filter((p) => p.region === id);
  const moegliche = PROJEKTE.filter((p) => p.regionen.includes(r.typ));
  const schliessen = () => ui.setzen({ region: null });

  return (
    <Sheet titel={r.name} schliessen={schliessen}>
      <div class="klein muted" style={{ marginBottom: 10 }}>
        {REGION_TYP_NAMEN[r.typ]}
      </div>
      <div class="karte">
        <Meter label="Zustimmung in der Region" wert={werte.zustimmung} text={`${zahl(werte.zustimmung)} %`} farbe={prozentFarbe(werte.zustimmung * 1.3)} />
        <Meter label="Verschmutzung" wert={werte.verschmutzung} farbe={prozentFarbe(werte.verschmutzung, false)} />
        <Meter label="Unruhe" wert={werte.unruhe} farbe={prozentFarbe(werte.unruhe, false)} />
      </div>

      {(fertig.length > 0 || laufend.length > 0) && (
        <>
          <div class="abschnitt">Projekte in der Region</div>
          {laufend.map((p) => {
            const def = PROJEKT_MAP[p.id];
            return (
              <div class="meldung">
                <span class="m-icon">🏗️</span>
                <span style={{ flex: 1 }}>
                  <b>{def.name}</b> <span class="muted">· im Bau</span>
                  <div class="meter-balken">
                    <div style={{ width: `${(p.fortschritt / def.dauer) * 100}%`, background: 'var(--akzent-2)' }} />
                  </div>
                </span>
              </div>
            );
          })}
          {fertig.map((p) => {
            const def = PROJEKT_MAP[p.id];
            return (
              <div class="meldung">
                <span class="m-icon">{def.icon}</span>
                <span>
                  <b>{def.name}</b> <span class="muted">· fertig</span>
                </span>
              </div>
            );
          })}
        </>
      )}

      {s.phase === 'regierung' && (
        <>
          <div class="abschnitt">Bauen</div>
          {moegliche.map((p) => {
            const fehler = projektMoeglich(s, p.id, id);
            const auf = offen === p.id;
            return (
              <div class="dial">
                <button style={{ width: '100%', textAlign: 'left' }} onClick={tippen(() => setOffen(auf ? null : p.id))}>
                  <div class="dial-kopf">
                    <div>
                      <div class="dial-name">
                        {p.icon} {p.name}
                      </div>
                      <div class="klein muted">
                        {p.dauer / 2} Jahre · {zahl(p.kosten, 2)} % BIP/Jahr
                      </div>
                    </div>
                    <span class="kosten">★ {p.pk}</span>
                  </div>
                </button>
                {auf && (
                  <div class="dial-detail">
                    <p class="klein" style={{ color: 'var(--text-2)' }}>
                      {p.text}
                    </p>
                    <Wirkungen effekte={p.effekte} />
                    <div class="aktion-zeile">
                      <button
                        class="knopf primaer"
                        disabled={!!fehler}
                        onClick={tippen(() => {
                          const f = spiel.aendern((st) => projektStarten(st, p.id, id));
                          if (f) ui.toast(f, '⚠️', 'schlecht');
                          else {
                            klang.wahl();
                            ui.toast(`${p.name} begonnen`, '🏗️', 'gut');
                            setOffen(null);
                          }
                        })}
                      >
                        Bau beginnen
                      </button>
                    </div>
                    {fehler && <div class="hinweis">{fehler}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </Sheet>
  );
}
