import {
  effectivePublicationStatus,
  isImportable,
  mapActivities,
  mapAddress,
  mapAmenities,
  mapDescription,
  mapFeeType,
  mapTags,
  photoStatus,
  primaryActivity,
  publicationStatus,
  slugify,
  type PipelinePhoto,
  type PipelinePlace,
} from '../import/osm-mapping';

function place(overrides: Partial<PipelinePlace> = {}): PipelinePlace {
  return {
    external_id: 'osm:node/123456789',
    name: 'Kızılcahamam Kamp Alanı',
    coordinates: { latitude: 40.47, longitude: 32.65 },
    activity_types: ['TENT'],
    fee_type: 'FREE',
    amenities: {},
    source_url: 'https://www.openstreetmap.org/node/123456789',
    completeness_score: 70,
    ...overrides,
  };
}

function photo(overrides: Partial<PipelinePhoto> = {}): PipelinePhoto {
  return {
    place_external_id: 'osm:node/123456789',
    provider: 'wikimedia',
    source_page_url: 'https://commons.wikimedia.org/wiki/File:Camp.jpg',
    original_url: 'https://upload.wikimedia.org/Camp.jpg',
    attribution_text: 'Foto: Biri / CC BY-SA 4.0',
    confidence: 0.9,
    is_primary_candidate: true,
    ...overrides,
  };
}

describe('mapActivities', () => {
  it('yalnızca tanınan kodları alır', () => {
    expect(mapActivities(['CARAVAN', 'HIKING', 'PICNIC'])).toEqual(['CARAVAN', 'PICNIC']);
  });

  it('hiç tanınan kod yoksa TENT varsayar', () => {
    expect(mapActivities([])).toEqual(['TENT']);
    expect(mapActivities(['SKIING'])).toEqual(['TENT']);
  });
});

describe('mapAmenities', () => {
  it('yalnızca true olan ve eşlemesi bulunan imkânları döndürür', () => {
    expect(
      mapAmenities({
        toilets: true,
        shower: false,
        drinking_water: null,
        wifi: true,
        bilinmeyen_imkan: true,
      }),
    ).toEqual(['WC', 'WIFI']);
  });

  it('boş nesne için boş dizi döndürür', () => {
    expect(mapAmenities({})).toEqual([]);
  });

  it('karavan sahasında elektrik varsa RV_HOOKUP ekler', () => {
    expect(mapAmenities({}, { tourism: 'caravan_site', power_supply: 'yes' })).toEqual([
      'RV_HOOKUP',
    ]);
    // Çadır alanında aynı etiket RV_HOOKUP üretmez
    expect(mapAmenities({}, { tourism: 'camp_site', power_supply: 'yes' })).toEqual([]);
  });

  it('aynı kod iki kaynaktan gelse de tekrarlanmaz', () => {
    const codes = mapAmenities({ electricity: true }, { tourism: 'caravan_site', electricity: 'yes' });
    expect(codes).toEqual(['ELECTRICITY', 'RV_HOOKUP']);
  });
});

describe('mapAddress', () => {
  it('addr:* etiketlerinden ülke/bölge/şehir çıkarır', () => {
    expect(
      mapAddress({ 'addr:country': 'tr', 'addr:province': 'Ankara', 'addr:city': 'Kızılcahamam' }),
    ).toEqual({ countryCode: 'TR', region: 'Ankara', city: 'Kızılcahamam' });
  });

  it('iki harfli olmayan ülke kodunu yok sayar; etiket yoksa null döner', () => {
    expect(mapAddress({ 'addr:country': 'Türkiye' }).countryCode).toBeNull();
    expect(mapAddress(undefined)).toEqual({ countryCode: null, region: null, city: null });
  });
});

describe('mapDescription', () => {
  it('açıklama etiketini kırpar, yoksa null döner', () => {
    expect(mapDescription({ description: '  Orman içinde kamp alanı  ' })).toBe(
      'Orman içinde kamp alanı',
    );
    expect(mapDescription({})).toBeNull();
  });
});

describe('mapTags', () => {
  it('OSM etiketlerinden doğa/izin etiketleri çıkarır', () => {
    const tags = mapTags({ dog: 'yes', natural: 'wood', openfire: 'yes' });
    expect(tags).toEqual(expect.arrayContaining(['PET_FRIENDLY', 'FIRE_ALLOWED', 'FOREST']));
  });

  it('eşleşme yoksa veya etiket yoksa boş döner', () => {
    expect(mapTags(undefined)).toEqual([]);
    expect(mapTags({ tourism: 'camp_site' })).toEqual([]);
  });

  it('"no" değerini olumlu saymaz', () => {
    expect(mapTags({ dog: 'no' })).toEqual([]);
  });

  it('rakımdan dağ etiketi türetir', () => {
    expect(mapTags({ ele: '1300' })).toEqual(['MOUNTAIN']);
    expect(mapTags({ ele: '400' })).toEqual([]);
  });
});

describe('isImportable', () => {
  it('adsız veya çok kısa adlı kaydı eler', () => {
    expect(isImportable(place({ name: null }))).toBe(false);
    expect(isImportable(place({ name: ' a ' }))).toBe(false);
  });

  it('geçersiz veya 0,0 koordinatı eler', () => {
    expect(isImportable(place({ coordinates: { latitude: NaN, longitude: 32 } }))).toBe(false);
    expect(isImportable(place({ coordinates: { latitude: 0, longitude: 0 } }))).toBe(false);
  });

  it('geçerli kaydı kabul eder', () => {
    expect(isImportable(place())).toBe(true);
  });
});

describe('slugify', () => {
  it('Türkçe karakterleri sadeleştirir ve kimlik son eki ekler', () => {
    const slug = slugify('Kızılcahamam Şelale Kampı', 'osm:node/123456789');
    expect(slug).toBe('kizilcahamam-selale-kampi-23456789');
  });

  it('ad tamamen sembolse yedek slug üretir', () => {
    // Son ek kimliğin alfasayısal hâlinin son 8 karakteri: "osmnode42" → "smnode42"
    expect(slugify('!!!', 'osm:node/42')).toBe('nokta-smnode42');
  });
});

describe('publicationStatus', () => {
  it('requires_review işaretliyse moderasyona düşer', () => {
    expect(publicationStatus(place({ requires_review: true }))).toBe('PENDING_REVIEW');
  });

  it('veri fakiri kayıt moderasyona düşer', () => {
    expect(publicationStatus(place({ completeness_score: 20 }))).toBe('PENDING_REVIEW');
  });

  it('yeterli veri varsa yayımlanır', () => {
    expect(publicationStatus(place({ completeness_score: 45 }))).toBe('PUBLISHED');
  });
});

describe('effectivePublicationStatus', () => {
  it('yeni kayıtta kaynağın kararı geçerlidir', () => {
    expect(effectivePublicationStatus(undefined, 'PUBLISHED')).toBe('PUBLISHED');
    expect(effectivePublicationStatus(null, 'PENDING_REVIEW')).toBe('PENDING_REVIEW');
  });

  it('moderatör yayımladıysa tekrar içe aktarım kuyruğa geri düşürmez', () => {
    expect(effectivePublicationStatus('PUBLISHED', 'PENDING_REVIEW')).toBe('PUBLISHED');
    expect(effectivePublicationStatus('REJECTED', 'PENDING_REVIEW')).toBe('REJECTED');
  });

  it('hâlâ beklemedeyse kaynağın güncel kararı uygulanır', () => {
    expect(effectivePublicationStatus('PENDING_REVIEW', 'PUBLISHED')).toBe('PUBLISHED');
  });
});

describe('mapFeeType', () => {
  it('bilinmeyen değerleri UNKNOWN yapar', () => {
    expect(mapFeeType('PAID')).toBe('PAID');
    expect(mapFeeType('FREE')).toBe('FREE');
    expect(mapFeeType(undefined)).toBe('UNKNOWN');
    expect(mapFeeType('DONATION')).toBe('UNKNOWN');
  });
});

describe('primaryActivity', () => {
  it('marker önceliğine uyar: Karavan > Çadır > Piknik > Mangal', () => {
    expect(primaryActivity(['PICNIC', 'CARAVAN', 'TENT'])).toBe('CARAVAN');
    expect(primaryActivity(['BARBECUE', 'PICNIC'])).toBe('PICNIC');
    expect(primaryActivity([])).toBe('TENT');
  });
});

describe('photoStatus', () => {
  it('yüksek güvenli birincil aday yayımlanır', () => {
    expect(photoStatus(photo())).toBe('PUBLISHED');
  });

  it('düşük güven veya birincil olmayan aday moderasyona düşer', () => {
    expect(photoStatus(photo({ confidence: 0.4 }))).toBe('PENDING');
    expect(photoStatus(photo({ is_primary_candidate: false }))).toBe('PENDING');
  });

  it('varsayılan eşik 0.6: 300 m mesafedeki aday yayımlanır', () => {
    // Güven skoru saf mesafedir: 750 m yarıçapta 0.6 ≈ 300 m
    expect(photoStatus(photo({ confidence: 0.6 }))).toBe('PUBLISHED');
    expect(photoStatus(photo({ confidence: 0.59 }))).toBe('PENDING');
  });

  it('eşik dışarıdan verilebilir', () => {
    expect(photoStatus(photo({ confidence: 0.65 }), 0.9)).toBe('PENDING');
    expect(photoStatus(photo({ confidence: 0.3 }), 0.2)).toBe('PUBLISHED');
  });
});
