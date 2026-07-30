# Campulator — Mobil UI ve Uygulama Geliştirme Promptu

Aşağıdaki prompt React Native + Expo tabanlı AI coding aracına verilebilir.

---

Build a production-oriented cross-platform mobile application named “Campulator” using React Native, Expo, and TypeScript.

The app is a dark-mode camping, caravan, picnic, and barbecue discovery platform. It must feel modern, premium, map-first, data-driven, and trustworthy.

## Brand and visual direction

Use the selected Campulator logo as the primary brand reference:

- map-pin silhouette
- green tent symbol
- calculator/grid detail
- slate blue-gray wordmark
- primary accent: natural bright green
- dark navy / charcoal surfaces
- clean white and blue-gray text
- subtle green glow for active states
- rounded cards
- soft elevation
- modern sans-serif typography
- minimal map screen
- information-rich detail and comparison screens

Suggested tokens:

- background: #08131F
- surface: #0E1B2B
- elevatedSurface: #122338
- primary: #78C043
- primaryBright: #8ED14F
- textPrimary: #F4F7FA
- textSecondary: #A7B3C2
- border: rgba(255,255,255,0.08)
- fireAccent: #FF8A3D

Use semantic design tokens so a light theme can be added later, but only ship dark mode in v1.

## Navigation

Bottom tabs:

1. Explore
2. Search
3. Add
4. Saved
5. Profile

## Onboarding

Flow:

- logo animation
- language selection: Türkçe / English
- 3 onboarding pages
- login/register
- guest mode
- email verification for email/password accounts

## Explore screen

Create a minimal dark Google Maps screen with:

- top search field
- filter button
- quick filter chips
- map/list toggle
- user location button
- dynamic markers
- clusters
- horizontally scrollable nearby place cards
- marker-card synchronization
- cluster tap zooms and lists matching places below

Markers:

- main body always Campulator green
- primary activity icon based on priority:
  Caravan > Tent > Picnic > Barbecue
- additional supported activities displayed as +N badge
- filtering must use all supported activities, not only the primary marker icon

## Search screen

Two modes:

1. text search by place name, city, region, country
2. Smart Match criteria selection

Smart Match:

- all selected criteria have equal weight
- all places remain visible
- sort by match percentage descending
- show matched and missing criteria
- list/map toggle
- saved searches and recent searches at top

## Filters screen

Create a premium dark filter screen with grouped cards.

Required:

- Access & fees: Free, Paid
- Activities: Caravan, Tent, Picnic, Barbecue
- Amenities: WC, Shower, Drinking Water, Electricity, Market, Table, Trash, Wi-Fi, Parking, Lighting, Accessible, RV Hookup, Gray Water
- Permissions: Fire Permitted, Barbecue Permitted, Pet Friendly
- Access: Asphalt, Normal Car, High Clearance, 4x4 Required
- Nature: Lakeside, Seaside, Forest, Mountain
- Family Friendly
- Quietness
- Crowd Level
- Cell Signal
- User Rating slider
- Distance slider
- Operating Status
- Include Permanently Closed toggle
- large Show Results CTA with result count

## Place detail screen

Information-rich, tabbed or collapsible:

- image gallery
- photo waiting placeholder
- place name
- exact/approximate location badge
- operating status badge
- primary activity and supported activities
- overall CampScore
- Features Score
- User Rating
- Atmosphere Score
- amenities
- access conditions
- atmosphere data
- latest verification date
- reviews
- photos
- main actions: Save, Directions, Compare
- contribution menu: Rate, Review, Add Photo, Verify Info, Report, Suggest Change

## CampScore

Overall:
(featuresScore * 0.45) + (userRating * 0.35) + (atmosphereScore * 0.20)

Display all scores out of 5 with one decimal.

## Add place flow

Multi-step form:

- required: place name, map location, at least one activity
- optional: fee, amenities, access, atmosphere, description, photos
- exact or approximate location
- approximate means fixed 500 m radius
- progress percentage
- photo optional
- show “Photo Pending” when missing
- duplicate detection warning

## Ratings and reviews

Rating input:

- full stars only, 1–5
- categories: cleanliness, safety, scenery, accessibility, value for money
- averages may be decimal
- one new rating per user per 12 months
- existing rating editable
- visit date optional

Reviews:

- immediate publication
- one-level replies
- helpful action
- report action
- photo reviews
- verified business official response
- filters: newest, most helpful, highest, lowest, with photos

## Saved screen

Two sections:

- Collections
- Saved Searches

Collections:

- user-created
- private
- drag-and-drop ordering
- one place can exist in multiple collections

## Compare screen

Compare 2 or 3 places:

- horizontally scrollable columns
- CampScore and three sub-scores
- fee
- activities
- amenities
- permissions
- road access
- cell signal
- quietness
- crowd level
- operating status
- exact/approximate location
- Smart Match score when available

## Profile

Public:

- name
- photo
- bio
- trust badge
- contribution stats
- reviews
- added places
- uploaded photos

Private:

- favorites
- collections
- saved searches

No follow system.

## Trust levels

- New User
- Contributor
- Trusted Contributor
- Expert Camper

Show level badge, never show numeric trust score.

## Notifications

- in-app notification center
- Firebase Cloud Messaging
- user preferences
- notification deep links

## i18n

- Turkish and English in v1
- no hardcoded UI copy
- use i18next
- all dates, numbers, distance, and units localized

## Architecture

Use:

- Expo
- TypeScript
- React Navigation
- Zustand
- TanStack Query
- React Hook Form
- Zod
- react-native-maps
- i18next
- Firebase Messaging integration

Generate:

1. folder structure
2. theme tokens
3. navigation
4. reusable components
5. authentication flow
6. API client
7. mock data
8. screen implementations
9. loading, empty, error states
10. accessibility and reduced motion support

Do not generate a generic bright template. The result must closely follow the premium dark Campulator visual identity.
