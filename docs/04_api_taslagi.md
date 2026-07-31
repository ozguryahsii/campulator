# Campulator — REST API Taslağı

## Auth

- POST /auth/register
- POST /auth/login
- POST /auth/google
- POST /auth/apple
- POST /auth/verify-email
- POST /auth/resend-verification
- POST /auth/refresh
- POST /auth/logout
- DELETE /auth/account

## Profile

- GET /me
- PATCH /me
- GET /users/:id
- GET /users/:id/contributions
- GET /users/:id/reviews

## Places

- GET /places
- GET /places/:id
- POST /places
- PATCH /places/:id
- POST /places/:id/change-requests
- POST /places/:id/verifications
- POST /places/:id/report
- GET /places/:id/similar
- GET /places/:id/score-breakdown

Query örnekleri:

- bounds
- search
- activities[]
- amenities[]
- feeType
- minRating
- maxDistance
- operatingStatus
- includePermanentlyClosed
- sort

## Smart Match

- POST /smart-match/search

Body:

- searchText
- criteria[]
- bounds
- page
- pageSize

Response:

- place
- matchPercentage
- matchedCriteria[]
- missingCriteria[]

## Ratings

- GET /places/:id/ratings/summary
- POST /places/:id/ratings
- PATCH /places/:id/ratings/:ratingId
- GET /places/:id/ratings/me

## Reviews

- GET /places/:id/reviews
- POST /places/:id/reviews
- PATCH /reviews/:id
- DELETE /reviews/:id
- POST /reviews/:id/replies
- POST /reviews/:id/helpful
- DELETE /reviews/:id/helpful
- POST /reviews/:id/report

## Photos

- POST /places/:id/photos
- POST /reviews/:id/photos
- DELETE /photos/:id
- POST /photos/:id/report

## Collections

- GET /collections
- POST /collections
- PATCH /collections/:id
- DELETE /collections/:id
- POST /collections/:id/items
- DELETE /collections/:id/items/:placeId
- PATCH /collections/:id/reorder

## Saved Searches

- GET /saved-searches
- POST /saved-searches
- PATCH /saved-searches/:id
- DELETE /saved-searches/:id
- POST /saved-searches/:id/run

## Routes

- POST /routes/preview

Body:

- origin
- placeId

Response:

- distance
- estimatedDuration
- polyline

## Notifications

- GET /notifications
- PATCH /notifications/:id/read
- PATCH /notifications/read-all
- POST /devices/fcm-token
- DELETE /devices/fcm-token/:id

## Business

- POST /businesses/apply
- GET /businesses/me
- GET /businesses/me/places
- GET /businesses/me/stats
- POST /businesses/me/places/:placeId/change-requests
- POST /reviews/:id/official-reply

## Admin

- GET /admin/moderation
- GET /admin/moderation/:id
- POST /admin/moderation/:id/approve
- POST /admin/moderation/:id/reject
- POST /admin/places/:id/merge
- PATCH /admin/users/:id/trust-level
- POST /admin/businesses/:id/verify
- GET /admin/reports
- POST /admin/reports/:id/resolve
- GET /admin/audit-logs
- GET /admin/score-config
- PATCH /admin/score-config
