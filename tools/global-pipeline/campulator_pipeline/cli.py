from pathlib import Path
import json, os
import typer
from dotenv import load_dotenv
from .models import PlaceRecord
from .overpass import append_jsonl, fetch_to_jsonl

app=typer.Typer(no_args_is_help=True)

def _reset_output(output: Path):
    output.mkdir(parents=True,exist_ok=True)
    for n in ("places.jsonl","photos.jsonl","rejected.jsonl","stats.json"):
        p=output/n
        if p.exists(): p.unlink()

def _enrich_photos(output: Path):
    """places.jsonl'daki her nokta için Wikimedia Commons fotoğrafı arar."""
    from .wikimedia import WikimediaClient

    client=WikimediaClient()
    min_conf=float(os.getenv("PHOTO_MIN_CONFIDENCE","0.60"))
    ps={"places":0,"candidates":0,"accepted":0,"errors":0}
    with (output/"places.jsonl").open(encoding="utf-8") as f:
        for line in f:
            ps["places"]+=1
            place=PlaceRecord.model_validate_json(line)
            try:
                found=[]
                for page in client.search(place.coordinates.latitude,place.coordinates.longitude):
                    p=client.convert(place,page)
                    if p:
                        ps["candidates"]+=1
                        if p.confidence>=min_conf:
                            found.append(p)
                found.sort(key=lambda x:x.confidence,reverse=True)
                if found: found[0].is_primary_candidate=True
                for p in found:
                    append_jsonl(output/"photos.jsonl",p.model_dump(mode="json"))
                    ps["accepted"]+=1
            except Exception:
                ps["errors"]+=1
    return ps

@app.command()
def run(
    pbf: Path=typer.Option(...,exists=True,readable=True),
    output: Path=typer.Option(...),
    enrich_wikimedia: bool=True
):
    """OSM PBF dosyasından places.jsonl/photos.jsonl üretir (pyosmium gerekir)."""
    from .osm_handler import CampHandler

    load_dotenv()
    _reset_output(output)

    h=CampHandler(output)
    h.apply_file(str(pbf),locations=True,idx="flex_mem")
    stats={"osm":h.stats}

    if enrich_wikimedia:
        stats["wikimedia"]=_enrich_photos(output)

    (output/"stats.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding="utf-8")
    typer.echo(json.dumps(stats,ensure_ascii=False,indent=2))

@app.command()
def fetch(
    bbox: str=typer.Option(...,help="min_lat,min_lng,max_lat,max_lng (Türkiye: 35.8,25.6,42.2,44.9)"),
    output: Path=typer.Option(...),
    step: float=typer.Option(2.0,help="Alanı kaç derecelik kutulara böleceği"),
    sleep_seconds: float=typer.Option(5.0,help="İstekler arası bekleme (Overpass kotası)"),
    enrich_wikimedia: bool=False
):
    """PBF indirmeden Overpass API üzerinden places.jsonl üretir."""
    load_dotenv()
    parts=[float(v) for v in bbox.split(",")]
    if len(parts)!=4:
        raise typer.BadParameter("bbox biçimi: min_lat,min_lng,max_lat,max_lng")

    _reset_output(output)
    stats={"overpass":fetch_to_jsonl((parts[0],parts[1],parts[2],parts[3]),output,step,sleep_seconds)}

    if enrich_wikimedia:
        stats["wikimedia"]=_enrich_photos(output)

    (output/"stats.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding="utf-8")
    typer.echo(json.dumps(stats,ensure_ascii=False,indent=2))

if __name__=="__main__":
    app()
