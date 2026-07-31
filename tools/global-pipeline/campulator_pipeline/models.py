from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field

class Coordinates(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

class PlaceRecord(BaseModel):
    schema_version: str = "1.0"
    external_id: str
    name: str | None = None
    coordinates: Coordinates
    activity_types: list[str]
    fee_type: Literal["FREE","PAID","UNKNOWN"] = "UNKNOWN"
    amenities: dict[str, bool | None]
    contact: dict[str, str | None]
    opening_hours: str | None = None
    operating_status: str = "UNKNOWN"
    source_tags: dict[str, str]
    source_url: str
    attribution: str = "© OpenStreetMap contributors"
    photo_refs: list[str] = []
    completeness_score: int = Field(ge=0, le=100)
    requires_review: bool = False
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PhotoRecord(BaseModel):
    place_external_id: str
    provider: Literal["wikimedia_commons"]
    source_page_url: str
    original_url: str
    thumbnail_url: str | None = None
    title: str | None = None
    author: str | None = None
    license: str | None = None
    license_url: str | None = None
    attribution_text: str
    distance_meters: float | None = None
    confidence: float = Field(ge=0, le=1)
    is_primary_candidate: bool = False
    requires_review: bool = True
