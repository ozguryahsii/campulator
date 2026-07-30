import {
  calculateCampScore,
  DEFAULT_CAMPSCORE_WEIGHTS,
  roundScore,
  scoreLabel,
} from '../campscore';

describe('CampScore (docs/01 §10)', () => {
  it('dokümandaki formülü uygular: 0.45/0.35/0.20', () => {
    const result = calculateCampScore({ featuresScore: 4, userRating: 5, atmosphereScore: 3 });
    // 4*0.45 + 5*0.35 + 3*0.20 = 1.8 + 1.75 + 0.6 = 4.15 → 4.2 (tek ondalık)
    expect(result.overallScore).toBe(4.2);
  });

  it('varsayılan ağırlıkların toplamı 1', () => {
    const { features, userRating, atmosphere } = DEFAULT_CAMPSCORE_WEIGHTS;
    expect(features + userRating + atmosphere).toBeCloseTo(1);
  });

  it('özel ağırlıklarla hesaplar', () => {
    const result = calculateCampScore(
      { featuresScore: 5, userRating: 0, atmosphereScore: 0 },
      { features: 1, userRating: 0, atmosphere: 0 },
    );
    expect(result.overallScore).toBe(5);
  });

  it('0-5 aralığı dışındaki değerleri kırpar', () => {
    const result = calculateCampScore({ featuresScore: 9, userRating: -3, atmosphereScore: 5 });
    expect(result.featuresScore).toBe(5);
    expect(result.userRating).toBe(0);
  });

  it('tek ondalığa yuvarlar', () => {
    expect(roundScore(4.267)).toBe(4.3);
    expect(roundScore(4.24)).toBe(4.2);
  });

  it('skor etiketlerini doğru verir', () => {
    expect(scoreLabel(4.8)).toBe('excellent');
    expect(scoreLabel(4.0)).toBe('great');
    expect(scoreLabel(3.2)).toBe('good');
    expect(scoreLabel(2.5)).toBe('fair');
    expect(scoreLabel(1.1)).toBe('poor');
  });
});
