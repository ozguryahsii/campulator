# Campulator — Yönetici Paneli Promptu

Build a production-oriented Campulator administration and moderation panel using:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

The panel must use a professional dark-neutral admin design with Campulator green accents.

## Main sections

1. Dashboard
2. Moderation Queue
3. Places
4. Duplicate Place Review
5. Change Requests
6. Reports
7. Reviews and Photos
8. Users
9. Trust Levels
10. Businesses
11. Score Configuration
12. Amenities and Activities
13. Notifications
14. Localization
15. Audit Logs
16. System Settings

## Dashboard

Show:

- pending moderation count
- new places
- change requests
- reports
- active users
- new reviews
- photo uploads
- CampScore recalculations
- verified businesses

## Moderation Queue

Default sorting:

- oldest first

Filters:

- item type
- user trust level
- date range
- status
- place
- report category

Actions:

- approve
- reject
- request changes
- merge duplicate
- archive
- add internal note

## Place Management

Edit:

- name
- description
- exact coordinates
- public coordinates
- exact/approximate location
- fee type
- operating status
- activities
- amenities
- access
- atmosphere
- photos
- publication state

For approximate location:

- show protected exact coordinate only to authorized admins
- fixed 500 m public radius

## Duplicate Merge

Create a safe merge workflow:

- choose source and target
- preview merged result
- preserve reviews
- preserve photos
- preserve ratings
- preserve contribution history
- transaction-based merge
- audit log

## User Management

Show:

- profile
- email verification
- trust level
- contribution stats
- reports
- moderation history
- role
- active sessions

Actions:

- change trust level
- suspend
- unsuspend
- revoke sessions
- verify business relation

Numeric trust score must be visible only to admins.

## Business Management

- manual verification in v1
- assign business to places
- review business change requests
- show official replies
- show business stats access

## CampScore Configuration

Editable weights:

- Features Score 45%
- User Rating 35%
- Atmosphere Score 20%

Amenities should have configurable weights and applicable activity types.

## Reports

Categories:

- spam
- incorrect information
- abuse
- inappropriate photo
- fake user/review
- safety risk
- wrong location
- closed business
- prohibited activity
- other

Reported content remains public until admin decision.

## Audit Logs

Show:

- actor
- action
- entity
- previous value
- new value
- timestamp
- IP/device metadata when available

All moderation and score-impacting actions must be audited.

## Localization

Manage:

- Turkish
- English
- future locales

Do not allow hardcoded user-facing strings in admin modules where translation keys should be used.
