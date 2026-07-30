/**
 * Smart Match — docs/01_urun_gereksinimleri.md §7.2
 *
 * Tüm seçilen kriterler eşit ağırlıklıdır.
 * Smart Match = eşleşen kriter sayısı / toplam seçilen kriter sayısı × 100
 * Tüm noktalar gösterilir; yüksek eşleşmeden düşüğe sıralanır.
 */

export interface SmartMatchResult {
  matchedCriteria: string[];
  missingCriteria: string[];
  matchPercentage: number;
}

export function calculateSmartMatch(
  selectedCriteria: readonly string[],
  placeCriteria: ReadonlySet<string> | readonly string[],
): SmartMatchResult {
  const placeSet = placeCriteria instanceof Set ? placeCriteria : new Set(placeCriteria);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const criterion of selectedCriteria) {
    if (placeSet.has(criterion)) matched.push(criterion);
    else missing.push(criterion);
  }

  const matchPercentage =
    selectedCriteria.length === 0
      ? 0
      : Math.round((matched.length / selectedCriteria.length) * 100);

  return { matchedCriteria: matched, missingCriteria: missing, matchPercentage };
}
