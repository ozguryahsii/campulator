# Campulator — Veri Modeli Taslağı

## Temel Tablolar

### users

- id
- email
- password_hash
- email_verified_at
- status
- created_at
- deleted_at

### user_profiles

- user_id
- display_name
- avatar_url
- bio
- locale
- trust_level
- marketing_consent
- created_at
- updated_at

### auth_providers

- id
- user_id
- provider
- provider_user_id

### refresh_tokens

- id
- user_id
- token_hash
- device_id
- expires_at
- revoked_at

### places

- id
- name
- slug
- description
- country_code
- region
- city
- exact_latitude
- exact_longitude
- public_latitude
- public_longitude
- location_precision
- approximate_radius_meters default 500
- fee_type
- operating_status
- seasonal_open_from
- seasonal_open_to
- created_by
- publication_status
- primary_activity
- photo_status
- created_at
- updated_at

### activities

- id
- code
- name_key
- marker_priority

Kodlar:

- CARAVAN
- TENT
- PICNIC
- BARBECUE

### place_activities

- place_id
- activity_id
- is_allowed
- verification_status
- last_verified_at

### amenities

- id
- code
- name_key
- weight
- applicable_activity_mask

### place_amenities

- place_id
- amenity_id
- value
- verification_status
- last_verified_at
- confirmation_count
- dispute_count

### access_conditions

- place_id
- road_type
- normal_car
- high_clearance
- four_by_four_required

### atmosphere_metrics

- place_id
- cell_signal
- quietness
- crowd_level
- privacy
- night_calm
- social_level

### place_scores

- place_id
- features_score
- user_rating
- atmosphere_score
- overall_score
- calculated_at

### user_ratings

- id
- user_id
- place_id
- cleanliness
- safety
- scenery
- accessibility
- value_for_money
- overall_user_score
- visit_date
- rating_period_year
- is_active
- created_at
- updated_at

Kural: user_id + place_id + rating_period_year unique.

### reviews

- id
- user_id
- place_id
- rating_id
- body
- status
- helpful_count
- visit_date
- created_at
- updated_at

### review_replies

- id
- review_id
- user_id
- business_id
- body
- is_official_response
- created_at

### photos

- id
- uploader_user_id
- place_id
- review_id
- storage_key
- mime_type
- size_bytes
- status
- created_at

### change_requests

- id
- place_id
- submitted_by
- type
- payload_json
- evidence_text
- status
- created_at
- reviewed_at
- reviewed_by

### verifications

- id
- place_id
- target_type
- target_id
- user_id
- verdict
- created_at

### reports

- id
- reporter_user_id
- target_type
- target_id
- category
- description
- status
- created_at

### collections

- id
- user_id
- name
- description
- cover_photo_id
- is_private
- share_token nullable
- created_at

### collection_items

- collection_id
- place_id
- sort_order
- created_at

### saved_searches

- id
- user_id
- name
- search_text
- criteria_json
- created_at
- updated_at

### search_history

- id
- user_id
- search_text
- criteria_json
- created_at

### businesses

- id
- owner_user_id
- name
- verification_status
- verified_by
- verified_at

### business_places

- business_id
- place_id

### trust_events

- id
- user_id
- event_type
- score_delta
- source_type
- source_id
- created_at

### notifications

- id
- user_id
- type
- title_key
- body_key
- payload_json
- read_at
- created_at

### device_tokens

- id
- user_id
- platform
- fcm_token
- device_id
- last_seen_at
- revoked_at

### moderation_items

- id
- item_type
- item_id
- reason
- status
- created_at
- reviewed_at
- reviewed_by

### audit_logs

- id
- actor_user_id
- action
- entity_type
- entity_id
- old_value_json
- new_value_json
- created_at

## Önemli Enum’lar

location_precision:

- EXACT
- APPROXIMATE

fee_type:

- FREE
- PAID
- UNKNOWN

operating_status:

- OPEN
- TEMPORARILY_CLOSED
- PERMANENTLY_CLOSED
- SEASONAL

publication_status:

- DRAFT
- PENDING_REVIEW
- PUBLISHED
- REJECTED
- MERGED
- ARCHIVED

verification_status:

- UNVERIFIED
- COMMUNITY_SUPPORTED
- ADMIN_VERIFIED
- DISPUTED

trust_level:

- NEW_USER
- CONTRIBUTOR
- TRUSTED_CONTRIBUTOR
- EXPERT_CAMPER
