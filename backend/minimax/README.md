Minimax Express Proxy

This folder provides an Express.js router that mirrors the behavior of the Minimax C# sample (Program.cs) by exposing simple endpoints to obtain an OAuth token and proxy requests to the Minimax API, handling CORS and credentials server-side.

Setup
- Env vars in `backend/.env.local` or `.env`:
  - `MINIMAX_BASE_URL` (default: `https://moj.minimax.si/SI`)
  - `MINIMAX_BASIC_B64` base64 of `clientId:clientSecret` for Basic auth to the token endpoint
  - `MINIMAX_USERNAME` optional, username for the password grant
  - `MINIMAX_PASSWORD` optional, password for the password grant

Routes (mounted at `/api/minimax`)
- `POST /token`: Obtain OAuth token. Body may include `{ username, password }`. If omitted, uses env vars.
- `GET /orgs`: Fetch current user orgs. Uses Bearer token from `Authorization` header, or falls back to env creds to auto-token if provided.
- `GET /orgs/:orgId/*`: Generic GET passthrough to `.../API/api/orgs/:orgId/*` with query string preserved.
- `POST /orgs/:orgId/*`: Generic POST passthrough with JSON body.
- `PUT /orgs/:orgId/*`: Generic PUT passthrough with JSON body (for actions like issuing postings).

Notes
- Always send `Authorization: Bearer <access_token>` for API calls (except `/token`).
- This proxy keeps secrets on the server and avoids CORS issues when calling Minimax from the frontend.

