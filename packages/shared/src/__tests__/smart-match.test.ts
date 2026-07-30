import { calculateSmartMatch } from '../smart-match';

describe('Smart Match (docs/01 §7.2)', () => {
  it('eşleşen/toplam × 100 yüzdesini hesaplar', () => {
    const result = calculateSmartMatch(
      ['activity:TENT', 'fee:FREE', 'amenity:WC', 'tag:LAKESIDE'],
      new Set(['activity:TENT', 'fee:FREE']),
    );
    expect(result.matchPercentage).toBe(50);
    expect(result.matchedCriteria).toEqual(['activity:TENT', 'fee:FREE']);
    expect(result.missingCriteria).toEqual(['amenity:WC', 'tag:LAKESIDE']);
  });

  it('tüm kriterler eşleşince %100 döner', () => {
    const result = calculateSmartMatch(['a', 'b'], ['a', 'b', 'c']);
    expect(result.matchPercentage).toBe(100);
    expect(result.missingCriteria).toHaveLength(0);
  });

  it('hiç eşleşme yoksa %0 döner ve eksikleri listeler', () => {
    const result = calculateSmartMatch(['x', 'y'], []);
    expect(result.matchPercentage).toBe(0);
    expect(result.missingCriteria).toEqual(['x', 'y']);
  });

  it('kriter seçilmezse %0 döner (sıfıra bölme yok)', () => {
    expect(calculateSmartMatch([], ['a']).matchPercentage).toBe(0);
  });

  it('tüm kriterler eşit ağırlıklıdır (sıra etkilemez)', () => {
    const a = calculateSmartMatch(['p', 'q', 'r'], ['p']);
    const b = calculateSmartMatch(['r', 'q', 'p'], ['p']);
    expect(a.matchPercentage).toBe(b.matchPercentage);
  });
});
