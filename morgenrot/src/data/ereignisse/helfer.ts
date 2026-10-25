import type { Effekte } from '../../sim/types';
import type { EreignisOption } from '../schema';

export const o = (text: string, effekte?: Effekte, extra: Partial<EreignisOption> = {}): EreignisOption => ({
  text,
  effekte,
  ...extra,
});

export const ALLE_PHASEN: ('regierung' | 'opposition' | 'regime')[] = ['regierung', 'opposition', 'regime'];
