"""Overpass API üzerinden kamp/karavan noktalarını çeker.

PBF indirmeden hızlı başlangıç için alternatif kaynak. Çıktı biçimi
osm_handler ile birebir aynıdır (PlaceRecord), bu yüzden aynı importer
kullanılabilir.

Overpass ücretsiz ve kotalıdır: geniş alanları küçük kutulara bölerek,
istekler arasında bekleyerek çekin.
"""
from pathlib import Path
import json
import time

import requests

from .models import PlaceRecord, Coordinates
from .tagmap import first, activity_types, amenities, fee_type, completeness

# osm_handler pyosmium gerektirir; Overpass yolu onsuz çalışabilsin diye
# bu iki tanım burada tekrarlanır.
TARGET = {"camp_site", "caravan_site", "camp_pitch"}


def append_jsonl(path: Path, payload: dict):
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")

DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter"

# Bir sunucu kota/bakım nedeniyle cevap vermezse sırayla denenir.
MIRRORS = [
    DEFAULT_ENDPOINT,
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# Overpass, requests'in varsayılan User-Agent'ıyla gelen istekleri 406 ile
# reddeder; kendini tanıtan bir UA zorunludur.
HEADERS = {
    "User-Agent": "Campulator/0.1 (camping data importer; +https://github.com/ozguryahsii/campulator)",
    "Accept": "application/json",
}

QUERY_TEMPLATE = """
[out:json][timeout:{timeout}];
(
  node["tourism"~"^(camp_site|caravan_site|camp_pitch)$"]({bbox});
  way["tourism"~"^(camp_site|caravan_site|camp_pitch)$"]({bbox});
  relation["tourism"~"^(camp_site|caravan_site|camp_pitch)$"]({bbox});
);
out center tags;
"""


def fetch_bbox(
    bbox: tuple[float, float, float, float],
    endpoint: str | None = None,
    timeout: int = 180,
) -> list[dict]:
    """bbox = (min_lat, min_lng, max_lat, max_lng) — Overpass sırası budur.

    Verilen sunucu (yoksa varsayılan liste) sırayla denenir; hepsi
    başarısız olursa son hata yükseltilir.
    """
    query = QUERY_TEMPLATE.format(
        bbox=",".join(str(v) for v in bbox), timeout=timeout - 20
    )
    endpoints = [endpoint] if endpoint else MIRRORS
    last_error: Exception | None = None

    for url in endpoints:
        try:
            response = requests.post(
                url, data={"data": query}, headers=HEADERS, timeout=timeout
            )
            # 429/504: kota veya yoğunluk — diğer sunucuyu dene
            response.raise_for_status()
            return response.json().get("elements", [])
        except Exception as exc:
            last_error = exc
            if url != endpoints[-1]:
                print(f"    ({url} yanıt vermedi: {exc}) — sıradaki sunucu deneniyor")
                time.sleep(2)

    raise last_error if last_error else RuntimeError("Overpass sunucusu bulunamadı")


def element_to_record(element: dict) -> PlaceRecord | None:
    tags = element.get("tags") or {}
    if tags.get("tourism") not in TARGET:
        return None

    # node'da lat/lon doğrudan; way/relation'da `out center` merkezi verir
    center = element.get("center") or {}
    lat = element.get("lat", center.get("lat"))
    lon = element.get("lon", center.get("lon"))
    if lat is None or lon is None:
        return None

    typ = element["type"]
    obj_id = element["id"]
    name = first(tags, "name", "name:en", "operator")
    score = completeness(tags)
    return PlaceRecord(
        external_id=f"osm:{typ}:{obj_id}",
        name=name,
        coordinates=Coordinates(latitude=lat, longitude=lon),
        activity_types=activity_types(tags),
        fee_type=fee_type(tags),
        amenities=amenities(tags),
        contact={
            "phone": first(tags, "contact:phone", "phone"),
            "email": first(tags, "contact:email", "email"),
            "website": first(tags, "contact:website", "website", "url"),
        },
        opening_hours=tags.get("opening_hours"),
        operating_status="OPEN",
        source_tags=tags,
        source_url=f"https://www.openstreetmap.org/{typ}/{obj_id}",
        photo_refs=[tags[k] for k in ("wikimedia_commons", "wikidata", "image") if tags.get(k)],
        completeness_score=score,
        requires_review=(not name or score < 45),
    )


def split_bbox(
    bbox: tuple[float, float, float, float], step: float
) -> list[tuple[float, float, float, float]]:
    """Geniş alanı Overpass kotasına uygun kutulara böler."""
    min_lat, min_lng, max_lat, max_lng = bbox
    boxes = []
    lat = min_lat
    while lat < max_lat:
        lng = min_lng
        while lng < max_lng:
            boxes.append((lat, lng, min(lat + step, max_lat), min(lng + step, max_lng)))
            lng += step
        lat += step
    return boxes


def fetch_to_jsonl(
    bbox: tuple[float, float, float, float],
    output: Path,
    step: float = 2.0,
    sleep_seconds: float = 5.0,
    endpoint: str | None = None,
) -> dict:
    """bbox'ı parçalayıp places.jsonl üretir; aynı kayıt iki kez yazılmaz."""
    output.mkdir(parents=True, exist_ok=True)
    places_path = output / "places.jsonl"
    if places_path.exists():
        places_path.unlink()

    stats = {"boxes": 0, "elements": 0, "written": 0, "skipped": 0, "errors": 0, "missing": 0}
    seen: set[str] = set()

    def process(box, retry: bool) -> bool:
        """Bir kutuyu çeker ve yazar. Başarısızsa False döner."""
        try:
            elements = fetch_bbox(box, endpoint=endpoint)
        except Exception as exc:  # kota/zaman aşımı
            print(f"  ! {box}: {exc}")
            time.sleep(sleep_seconds * (4 if retry else 2))
            return False

        stats["elements"] += len(elements)
        for element in elements:
            record = element_to_record(element)
            if record is None or record.external_id in seen:
                stats["skipped"] += 1
                continue
            seen.add(record.external_id)
            append_jsonl(places_path, record.model_dump(mode="json"))
            stats["written"] += 1

        print(f"  {box} → {stats['written']} kayıt")
        time.sleep(sleep_seconds)
        return True

    failed: list[tuple[float, float, float, float]] = []
    for box in split_bbox(bbox, step):
        stats["boxes"] += 1
        if not process(box, retry=False):
            failed.append(box)

    # Başarısız kutular sessizce kaybolursa o bölgeler haritada hiç görünmez
    # (ör. Trakya). Bu yüzden hepsi sonda bir kez daha denenir.
    if failed:
        print(f"\n{len(failed)} kutu başarısızdı, yeniden deneniyor...")
        still_failed = [box for box in failed if not process(box, retry=True)]
        stats["errors"] = len(still_failed)
        stats["missing"] = len(still_failed)
        if still_failed:
            (output / "failed-boxes.json").write_text(
                json.dumps([list(box) for box in still_failed], indent=2), encoding="utf-8"
            )
            print(
                f"\nUYARI: {len(still_failed)} kutu hâlâ çekilemedi; bu bölgeler EKSİK.\n"
                f"Listesi: {output / 'failed-boxes.json'}\n"
                "Bu kutuları --bbox ile tek tek yeniden çekip içe aktarabilirsiniz."
            )

    return stats
