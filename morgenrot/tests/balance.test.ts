import { describe, expect, it } from 'vitest';
import { LAENDER } from '../src/data/laender';
import { spielen, zusammenfassung, type Strategie } from './bot';

const STRATEGIEN: Strategie[] = ['passiv', 'reformer', 'radikal', 'klug', 'zufall'];

describe('Balance über komplette Kampagnen', () => {
  for (const land of LAENDER) {
    it(`${land.name}: Kampagnen laufen stabil bis 2100`, () => {
      const zeilen: string[] = [];
      for (const st of STRATEGIEN) {
        for (const seed of [1]) {
          const { s, fehler } = spielen(land.id, st, seed);
          expect(fehler).toEqual([]);
          zeilen.push(`${st.padEnd(9)} s${seed} ${zusammenfassung(s)}`);
        }
      }
      console.log(zeilen.join('\n'));
    });
  }
});
