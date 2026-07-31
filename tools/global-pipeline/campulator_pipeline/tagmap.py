TRUE = {"yes","true","1","designated","permissive","customers"}
FALSE = {"no","false","0","private"}

def tri(v):
    if v is None:
        return None
    v = v.strip().lower()
    if v in TRUE: return True
    if v in FALSE: return False
    return None

def first(tags, *keys):
    for k in keys:
        if tags.get(k):
            return tags[k].strip()
    return None

def activity_types(tags):
    out = []
    tourism = tags.get("tourism")
    if tourism in {"camp_site","camp_pitch"}: out.append("TENT")
    if tourism == "caravan_site" or tri(first(tags,"caravans","motorhome","campervan")) is True:
        out.append("CARAVAN")
    if tri(first(tags,"picnic","picnic_table")) is True: out.append("PICNIC")
    if tri(first(tags,"bbq","barbecue")) is True: out.append("BARBECUE")
    return sorted(set(out))

def amenities(tags):
    mapping = {
      "toilets": ("toilets","amenity:toilets"),
      "shower": ("shower","showers"),
      "drinking_water": ("drinking_water","water:potable"),
      "electricity": ("electricity","power_supply"),
      "wifi": ("internet_access:wlan","wifi"),
      "market": ("shop","market"),
      "restaurant": ("restaurant","amenity:restaurant"),
      "waste_disposal": ("waste_disposal","waste_basket"),
      "sanitary_dump_station": ("sanitary_dump_station","chemical_toilet_disposal"),
      "picnic_table": ("picnic_table",),
      "parking": ("parking",),
      "lighting": ("lit",),
      "wheelchair_accessible": ("wheelchair",),
      "laundry": ("laundry",),
      "kitchen": ("kitchen",)
    }
    return {name: tri(first(tags,*keys)) for name,keys in mapping.items()}

def fee_type(tags):
    v = tri(tags.get("fee"))
    return "PAID" if v is True else "FREE" if v is False else "UNKNOWN"

def completeness(tags):
    keys = ["name","phone","contact:phone","website","contact:website",
            "opening_hours","fee","toilets","shower","drinking_water","electricity"]
    score = round(sum(1 for k in keys if tags.get(k)) / len(keys) * 100)
    return score
