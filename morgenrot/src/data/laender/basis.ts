/** Typische Ausgangspolitik; Länder überschreiben nur Abweichungen. */
export const BASIS_POLITIK: Record<string, number> = {
  industrie: 1, finanzen: 1, betriebe: 1, planung: 1, steuern: 1, handel: 1,
  arbeitszeit: 1, loehne: 1, sicherung: 1, jobgarantie: 0, care: 1,
  gesundheit: 1, bildung: 1, wohnen: 1, verkehr: 1,
  energie: 1, kernkraft: 1, co2preis: 0, landwirtschaft: 0, naturschutz: 1,
  reproduktion: 2, gleichstellung: 1, minderheiten: 2, migration: 1, integration: 1, religion: 2,
  medien: 1, partizipation: 0, sicherheit: 2, opposition: 1, militaer: 1, korruption: 0,
  plattformen: 1, ki: 1, forschung: 1,
  buendnis: 1, klimadiplomatie: 1, schulden: 0,
};

export const politik = (abw: Record<string, number>): Record<string, number> => ({ ...BASIS_POLITIK, ...abw });
