from pathlib import Path
import json
import osmium
from .models import PlaceRecord, Coordinates
from .tagmap import first, activity_types, amenities, fee_type, completeness

TARGET = {"camp_site","caravan_site","camp_pitch"}

def append_jsonl(path: Path, payload: dict):
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False, separators=(",",":")) + "\n")

class CampHandler(osmium.SimpleHandler):
    def __init__(self, output: Path):
        super().__init__()
        self.output = output
        self.stats = {"seen":0,"written":0,"rejected":0}

    def _write(self, typ, obj_id, tags, lat, lon):
        self.stats["seen"] += 1
        try:
            name = first(tags,"name","name:en","operator")
            score = completeness(tags)
            rec = PlaceRecord(
                external_id=f"osm:{typ}:{obj_id}",
                name=name,
                coordinates=Coordinates(latitude=lat,longitude=lon),
                activity_types=activity_types(tags),
                fee_type=fee_type(tags),
                amenities=amenities(tags),
                contact={
                  "phone": first(tags,"contact:phone","phone"),
                  "email": first(tags,"contact:email","email"),
                  "website": first(tags,"contact:website","website","url")
                },
                opening_hours=tags.get("opening_hours"),
                operating_status="OPEN",
                source_tags=tags,
                source_url=f"https://www.openstreetmap.org/{typ}/{obj_id}",
                photo_refs=[tags[k] for k in ("wikimedia_commons","wikidata","image") if tags.get(k)],
                completeness_score=score,
                requires_review=(not name or score < 45)
            )
            append_jsonl(self.output/"places.jsonl", rec.model_dump(mode="json"))
            self.stats["written"] += 1
        except Exception as exc:
            append_jsonl(self.output/"rejected.jsonl",
                         {"source_id":f"osm:{typ}:{obj_id}","error":str(exc),"tags":tags})
            self.stats["rejected"] += 1

    def node(self, n):
        tags = dict(n.tags)
        if tags.get("tourism") in TARGET and n.location.valid():
            self._write("node",n.id,tags,n.location.lat,n.location.lon)

    def way(self, w):
        tags = dict(w.tags)
        if tags.get("tourism") not in TARGET:
            return
        pts = [(nr.location.lat,nr.location.lon) for nr in w.nodes if nr.location.valid()]
        if not pts:
            append_jsonl(self.output/"rejected.jsonl",
                         {"source_id":f"osm:way:{w.id}","error":"missing_locations","tags":tags})
            self.stats["rejected"] += 1
            return
        self._write("way",w.id,tags,
                    sum(p[0] for p in pts)/len(pts),
                    sum(p[1] for p in pts)/len(pts))

    def relation(self, r):
        tags = dict(r.tags)
        if tags.get("tourism") in TARGET:
            append_jsonl(self.output/"rejected.jsonl",
                         {"source_id":f"osm:relation:{r.id}",
                          "error":"relation_needs_area_centroid_pass","tags":tags})
            self.stats["rejected"] += 1
