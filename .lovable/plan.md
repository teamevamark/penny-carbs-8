# Add Google Maps API key management to /admin/locations

## Goal

Let super admins manage **multiple Google Maps API keys** from `/admin/locations`. The frontend (`GoogleMapPicker`, `GoogleMapViewer`) loads its key from this pool — picking one **at random per session** — instead of the hardcoded `VITE_GOOGLE_MAPS_API_KEY`.

## How it will work end-to-end

```text
Admin (/admin/locations → "Google Maps Keys" section)
        │  add / edit / activate / delete keys
        ▼
Edge Function: manage-google-maps-keys   (super_admin only, writes secrets)
        │  stores keys as Supabase secrets:
        │    GMAPS_KEY_<id>  + a metadata table for label/active flag
        ▼
Edge Function: get-google-maps-keys      (public, returns only ACTIVE keys)
        ▼
Frontend GoogleMapsKeyProvider (React context)
        │  fetches active keys once at app load
        │  picks ONE at random for this session
        ▼
GoogleMapPicker / GoogleMapViewer use that key in useJsApiLoader
```

## Database changes

One new table to track key metadata (the secret values themselves stay in Supabase secrets, never in the DB).

```sql
create table public.google_maps_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,                  -- e.g. "Project A — billing enabled"
  secret_name text not null unique,     -- e.g. "GMAPS_KEY_<id>"
  is_active boolean not null default true,
  last_four text,                       -- last 4 chars for display only
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_maps_api_keys enable row level security;

-- Only super_admin can read/write metadata
create policy "super_admin manage gmaps keys"
on public.google_maps_api_keys for all
to authenticated
using (public.has_role(auth.uid(), 'super_admin'))
with check (public.has_role(auth.uid(), 'super_admin'));
```

The actual API key values are **never** stored in this table — only `last_four` for display.

## Edge functions (2 new)

### 1. `manage-google-maps-keys` (super_admin only)
- `POST { action: "create", label, key }` → stores `key` as Supabase secret named `GMAPS_KEY_<uuid>`, inserts metadata row.
- `POST { action: "update", id, label?, key?, is_active? }` → updates metadata; if `key` provided, overwrites the secret.
- `POST { action: "delete", id }` → deletes metadata row + removes the secret.
- Validates JWT, then `has_role(user, 'super_admin')`. Uses Supabase Management API (with `SUPABASE_SERVICE_ROLE_KEY` + project ref) to set/delete secrets.

### 2. `get-google-maps-keys` (public, no auth)
- `GET` → returns `{ keys: string[] }` containing only the **values** of currently `is_active = true` keys.
- Reads metadata table with service role, then `Deno.env.get(secret_name)` for each. Returns just an array of strings — no labels, no IDs.
- Cached in-memory in the function for ~5 min to reduce cold-start cost.

> Security note: the active key values are exposed to the public anyway (Google Maps JS API keys must ship to the browser). The DB-level metadata stays admin-only. The advantage of going through an edge function is centralized rotation without rebuilding the app.

## Frontend changes

### New: `src/contexts/GoogleMapsKeyContext.tsx`
- On mount, `supabase.functions.invoke('get-google-maps-keys')`.
- Picks one key at random from the response, holds it in context for the rest of the session.
- Falls back to `VITE_GOOGLE_MAPS_API_KEY` if the function fails or returns empty (so existing behavior never breaks).
- Exposes `useGoogleMapsKey()` returning `{ apiKey, isLoading }`.

### Update: `GoogleMapPicker.tsx`, `GoogleMapViewer.tsx`
- Replace `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` with `useGoogleMapsKey()`.
- Show a small loader while the key is being fetched (very brief).

### Update: `src/App.tsx`
- Wrap the app in `<GoogleMapsKeyProvider>` (alongside existing providers).

### Update: `src/pages/admin/AdminLocations.tsx`
- Add a new section below Panchayats: **"Google Maps API Keys"** (only visible when `role === 'super_admin'`).
- List of keys: label, last-four (e.g. `••••••QzEa`), active toggle, edit, delete.
- "Add Key" dialog: label + full API key (password-style input).
- "Edit Key" dialog: label, optional new key (leave blank to keep), active toggle.
- All actions call the `manage-google-maps-keys` edge function.

## Access control

- Listing/managing keys in the UI: **super_admin only** (admins see Locations but not the keys section).
- Edge function `manage-google-maps-keys`: enforces super_admin in code.
- Edge function `get-google-maps-keys`: public (returns only key values, which would ship to browser anyway).

## Migration / rollout

1. Run DB migration to create `google_maps_api_keys` table + RLS.
2. Deploy both edge functions.
3. After UI ships, super_admin adds the existing key (`AIzaSyDf4IPeIB70WoefdwZCbLjg8SLsaMgpzeA` or a new one with billing enabled) via the new section.
4. Once at least one active key exists, the frontend automatically uses the new pool. The hardcoded `VITE_GOOGLE_MAPS_API_KEY` remains only as a last-resort fallback.

## Out of scope

- Per-domain restrictions on Google Cloud side (admin must still configure HTTP referrers in Google Cloud Console).
- Usage analytics per key (can be added later).
- "Rotate on failure" automatic switching — current pick is per session as requested.
