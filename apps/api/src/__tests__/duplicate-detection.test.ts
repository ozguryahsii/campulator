/**
 * Mükerrer tespiti yardımcılarının davranış testleri (docs/01 §14).
 * Servisteki saf fonksiyonların aynısı; veritabanı gerektirmez.
 */

function normalizeName(name: string): string {
  return name
    .toLocaleLowerCase('tr')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİi]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function namesSimilar(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const distance = levenshtein(na, nb);
  return distance <= Math.max(2, Math.floor(Math.min(na.length, nb.length) * 0.25));
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

describe('İsim normalizasyonu', () => {
  it('Türkçe karakterleri sadeleştirir', () => {
    expect(normalizeName('Çıralı Kamp Alanı')).toBe('cirali kamp alani');
    expect(normalizeName('Kazdağı Ormanı')).toBe('kazdagi ormani');
  });

  it('noktalama ve fazla boşlukları temizler', () => {
    expect(normalizeName('Salda  Gölü -- Kamp!')).toBe('salda golu kamp');
  });
});

describe('İsim benzerliği (docs/01 §14)', () => {
  it('Türkçe karakter farkı olan aynı ismi yakalar', () => {
    expect(namesSimilar('Akyaka Sakin Orman Kampı', 'Akyaka Sakin Orman Kampi')).toBe(true);
  });

  it('kapsayan isimleri benzer sayar', () => {
    expect(namesSimilar('Datça Gizli Koy', 'Datça Gizli Koy Kamp Alanı')).toBe(true);
  });

  it('farklı isimleri benzer saymaz', () => {
    expect(namesSimilar('Salda Gölü Kampı', 'Uzungöl Karavan Parkı')).toBe(false);
  });

  it('boş isimde false döner', () => {
    expect(namesSimilar('', 'Salda')).toBe(false);
  });
});

describe('Mesafe hesabı', () => {
  it('aynı koordinatta 0 döner', () => {
    expect(haversineMeters(39.9, 32.8, 39.9, 32.8)).toBe(0);
  });

  it('yakın noktalarda mükerrer eşiğinin (300 m) altında kalır', () => {
    // ~0.0005 derece ≈ 55 m
    expect(haversineMeters(37.05, 28.32, 37.0503, 28.3202)).toBeLessThan(300);
  });

  it('Ankara-Salda arası ~350 km üzerindedir', () => {
    const distance = haversineMeters(39.925, 32.866, 37.5417, 29.6708);
    expect(distance / 1000).toBeGreaterThan(350);
    expect(distance / 1000).toBeLessThan(420);
  });
});
