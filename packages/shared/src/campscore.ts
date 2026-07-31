/**
 * CampScore hesabı — docs/01_urun_gereksinimleri.md §10
 *
 * CampScore = (Features Score × 0.45) + (User Rating × 0.35) + (Atmosphere Score × 0.20)
 * Tüm bileşenler 5 üzerinden; sonuç tek ondalıkla gösterilir.
 * Ağırlıklar backend'de konfigürasyon tablosunda tutulur; buradaki değerler varsayılandır.
 */

export interface CampScoreWeights {
  features: number;
  userRating: number;
  atmosphere: number;
}

export const DEFAULT_CAMPSCORE_WEIGHTS: CampScoreWeights = {
  features: 0.45,
  userRating: 0.35,
  atmosphere: 0.2,
};

export interface CampScoreInput {
  featuresScore: number;
  userRating: number;
  atmosphereScore: number;
}

export interface CampScoreResult extends CampScoreInput {
  overallScore: number;
}

const clamp = (value: number, min = 0, max = 5) => Math.min(max, Math.max(min, value));

/** 5 üzerinden değeri tek ondalığa yuvarlar (ör. 4.267 → 4.3) */
export const roundScore = (value: number): number => Math.round(value * 10) / 10;

export function calculateCampScore(
  input: CampScoreInput,
  weights: CampScoreWeights = DEFAULT_CAMPSCORE_WEIGHTS,
): CampScoreResult {
  const features = clamp(input.featuresScore);
  const userRating = clamp(input.userRating);
  const atmosphere = clamp(input.atmosphereScore);

  const overall =
    features * weights.features + userRating * weights.userRating + atmosphere * weights.atmosphere;

  return {
    featuresScore: roundScore(features),
    userRating: roundScore(userRating),
    atmosphereScore: roundScore(atmosphere),
    overallScore: roundScore(overall),
  };
}

/** Skor etiketi (UI rozetleri için) */
export type ScoreLabel = 'excellent' | 'great' | 'good' | 'fair' | 'poor';

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 4.5) return 'excellent';
  if (score >= 4.0) return 'great';
  if (score >= 3.0) return 'good';
  if (score >= 2.0) return 'fair';
  return 'poor';
}
