## Why the home page looks empty today

- **Indoor Events module is OFF** in admin → home filters out all 25 available indoor-events items (intentional, leaving as-is).
- **Cloud Kitchen carousel** filters items whose `cloud_kitchen_slot_id` is NOT in the active slot list. Several available items point to the inactive "Ifthar spacial" slot (or have no slot), so they vanish.
- **Featured Items strip** requires `is_featured = true`. Only 1 item is flagged and it's filtered out by other rules → empty section.

## Changes

### 1. `src/components/customer/PopularItems.tsx` — Cloud Kitchen visibility

Remove the active-slot gate from the home carousel so cloud-kitchen items appear regardless of slot status (slot enforcement still applies on the actual ordering pages — `/cloud-kitchen`, checkout — which are not touched).

- Delete the block that filters items by `activeSlotIds.has(slotId)` for `isCloudKitchenType`.
- Drop the now-unused `useActiveCloudKitchenSlotIds` import and hook call.
- Keep the cook-allocation filter (so we don't show items no cook can fulfil).

### 2. `src/components/customer/FeaturedItems.tsx` — Auto-fallback

When the `is_featured = true` query returns 0 items (after panchayat / active-module / cook-allocation filtering), fetch the newest available items and use them instead.

- Refactor the query into two passes inside `queryFn`:
  1. First fetch with `.eq('is_featured', true).eq('is_available', true)` (current behavior).
  2. Apply the same in-memory filters (active service types, cook allocation, active cloud-kitchen slot).
  3. If the filtered result is empty, run a second fetch without `is_featured`, ordered by `created_at desc`, limit 8, and apply the same filters.
- Add a `fellBack` flag to the returned data so the section heading can switch from "Featured Items" to "New & Popular" when fallback is used (small UX cue, optional but nice).
- Keep the cloud-kitchen slot filter here (Featured strip is more curated; if user wants, we can drop it later).

### 3. No DB changes

`is_active=false` for Indoor Events is respected (user did not ask to change it). No migration needed.

## Out of scope

- Indoor Events module toggle (stays OFF as configured).
- `/cloud-kitchen` page rules and ordering eligibility (only the home carousel is loosened).
- Admin UI for marking items as featured.

## Files touched

- `src/components/customer/PopularItems.tsx`
- `src/components/customer/FeaturedItems.tsx`
