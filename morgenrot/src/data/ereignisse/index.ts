import type { EreignisDef } from '../schema';
import { FRAKTIONS_EREIGNISSE } from './fraktionen';
import { GESELLSCHAFT_EREIGNISSE } from './gesellschaft';
import { LAENDER_EREIGNISSE } from './laender';
import { POLITIK_EREIGNISSE } from './politik';
import { SYSTEM_EREIGNISSE } from './system';
import { TECHNIK_EREIGNISSE } from './technik';
import { UMWELT_EREIGNISSE } from './umwelt';
import { WELT_EREIGNISSE } from './welt';
import { WIRTSCHAFT_EREIGNISSE } from './wirtschaft';
import { ZUKUNFT_EREIGNISSE } from './zukunft';

export const EREIGNISSE: EreignisDef[] = [
  ...SYSTEM_EREIGNISSE,
  ...WIRTSCHAFT_EREIGNISSE,
  ...UMWELT_EREIGNISSE,
  ...GESELLSCHAFT_EREIGNISSE,
  ...POLITIK_EREIGNISSE,
  ...WELT_EREIGNISSE,
  ...TECHNIK_EREIGNISSE,
  ...ZUKUNFT_EREIGNISSE,
  ...FRAKTIONS_EREIGNISSE,
  ...LAENDER_EREIGNISSE,
];

export const EREIGNIS_MAP: Record<string, EreignisDef> = Object.fromEntries(EREIGNISSE.map((e) => [e.id, e]));
