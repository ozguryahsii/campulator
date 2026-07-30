import html, math, os, re, requests
from urllib.parse import quote
from .models import PhotoRecord

API = "https://commons.wikimedia.org/w/api.php"

def haversine(lat1,lon1,lat2,lon2):
    r=6371000
    p1,p2=math.radians(lat1),math.radians(lat2)
    dp=math.radians(lat2-lat1); dl=math.radians(lon2-lon1)
    a=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.atan2(math.sqrt(a),math.sqrt(1-a))

def clean(v):
    if not v: return None
    return html.unescape(re.sub(r"<[^>]+>","",v)).strip() or None

class WikimediaClient:
    def __init__(self):
        self.radius=int(os.getenv("WIKIMEDIA_RADIUS_METERS","750"))
        self.limit=int(os.getenv("WIKIMEDIA_MAX_CANDIDATES","8"))
        self.timeout=int(os.getenv("HTTP_TIMEOUT_SECONDS","20"))
        self.s=requests.Session()
        self.s.headers["User-Agent"]=os.getenv(
            "WIKIMEDIA_USER_AGENT","CampulatorDataPipeline/1.0 (contact@example.com)"
        )

    def search(self, lat, lon):
        p={"action":"query","format":"json","generator":"geosearch",
           "ggsprimary":"all","ggsnamespace":6,"ggsradius":self.radius,
           "ggscoord":f"{lat}|{lon}","ggslimit":self.limit,
           "prop":"imageinfo|coordinates",
           "iiprop":"url|extmetadata","iiurlwidth":1200}
        r=self.s.get(API,params=p,timeout=self.timeout)
        r.raise_for_status()
        return list(r.json().get("query",{}).get("pages",{}).values())

    def convert(self, place, page):
        infos=page.get("imageinfo") or []
        if not infos: return None
        info=infos[0]; meta=info.get("extmetadata") or {}
        lic=clean((meta.get("LicenseShortName") or {}).get("value"))
        if not lic: return None
        coords=page.get("coordinates") or []
        plat=coords[0].get("lat") if coords else None
        plon=coords[0].get("lon") if coords else None
        dist=haversine(place.coordinates.latitude,place.coordinates.longitude,plat,plon) if plat is not None else None
        proximity=0 if dist is None else max(0,1-dist/max(self.radius,1))
        confidence=round(proximity,4)
        title=page.get("title","")
        artist=clean((meta.get("Artist") or {}).get("value"))
        source=(meta.get("ImageDescriptionUrl") or {}).get("value") or \
               f"https://commons.wikimedia.org/wiki/{quote(title.replace(' ','_'))}"
        return PhotoRecord(
            place_external_id=place.external_id,
            provider="wikimedia_commons",
            source_page_url=source,
            original_url=info["url"],
            thumbnail_url=info.get("thumburl"),
            title=title,
            author=artist,
            license=lic,
            license_url=clean((meta.get("LicenseUrl") or {}).get("value")),
            attribution_text=" — ".join(x for x in [title.replace("File:",""),artist,lic] if x),
            distance_meters=dist,
            confidence=confidence,
            requires_review=confidence < 0.85
        )
