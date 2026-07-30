# Campulator Global JSONL Pipeline

OpenStreetMap Planet PBF içinden dünya genelindeki kamp alanlarını çıkarır,
Campulator JSONL şemasına dönüştürür ve Wikimedia Commons üzerinden açık lisanslı
fotoğraf adaylarıyla zenginleştirir.

## Neden Google fotoğrafı yok?

Google Maps/Places fotoğraflarını toplu şekilde indirip kalıcı bir kamp veri setinde
saklamak bu pipeline'a eklenmemiştir. Google içerikleri yalnızca Google'ın izin verdiği
kullanıcıya dönük, anlık kullanım senaryolarında kullanılmalıdır.

## Çalıştırma

```bash
cp .env.example .env
docker compose build

mkdir -p data/input data/output
wget -O data/input/planet-latest.osm.pbf   https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf

docker compose run --rm pipeline run   --pbf /data/input/planet-latest.osm.pbf   --output /data/output
```

Çıktılar:
- `places.jsonl`
- `photos.jsonl`
- `rejected.jsonl`
- `stats.json`

Ana OSM filtreleri:
- `tourism=camp_site`
- `tourism=caravan_site`
- `tourism=camp_pitch`
