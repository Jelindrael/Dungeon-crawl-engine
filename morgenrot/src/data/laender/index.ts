import type { LandDef } from '../schema';
import { BRASILIEN } from './brasilien';
import { CHILE } from './chile';
import { DEUTSCHLAND } from './deutschland';
import { INDIEN } from './indien';
import { INDONESIEN } from './indonesien';
import { POLEN } from './polen';
import { SUEDAFRIKA } from './suedafrika';
import { USA } from './usa';

export const LAENDER: LandDef[] = [DEUTSCHLAND, CHILE, BRASILIEN, POLEN, SUEDAFRIKA, INDONESIEN, INDIEN, USA];

export const LAND_MAP: Record<string, LandDef> = Object.fromEntries(LAENDER.map((l) => [l.id, l]));
