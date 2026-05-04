## Goal
On the customer home page, the **Cloud Kitchen** carousel should auto-show items only for the **currently active meal-time slot** (the one whose ordering window is open). When that slot's window ends, items disappear and the next slot's items take over automatically.

## Current behavior
`PopularItems.tsx` (serviceType=`cloud_kitchen`) filters items via `useActiveCloudKitchenSlotIds()`, which returns **all** `is_active=true` slots. So items from Breakfast/Lunch/Dinner all show together regardless of time-of-day window.

## Approach
Reuse the existing slot-window logic from `useCustomerDivisions` (`checkIfOrderingOpen` in `src/hooks/useCustomerCloudKitchen.ts`) — it already returns each slot with `is_ordering_open` based on `start_time`, `end_time`, `cutoff_hours_before`.

## Changes

### 1. `src/hooks/useCloudKitchenSlots.ts`
Modify `useActiveCloudKitchenSlotIds` (or add a new `useCurrentlyOrderableSlotIds`) to:
- Fetch active slots (as today).
- Apply the same `checkIfOrderingOpen` logic used in `useCustomerCloudKitchen.ts` (extract the helper to a shared util, or duplicate it locally — extracting is cleaner).
- Return a `Set<string>` of slot IDs whose ordering window is currently open.
- Add `refetchInterval: 60000` so the home page auto-refreshes when a slot opens/closes.

Recommendation: extract `checkIfOrderingOpen` into `src/lib/cloudKitchenSlotUtils.ts` and import it from both hooks (no behavior change for the cloud-kitchen page).

### 2. `src/components/customer/PopularItems.tsx`
No structural change — it already filters by `activeSlotIds`. With the hook now returning only currently-orderable slot IDs, the carousel will automatically:
- Show only items belonging to the currently open meal-time slot.
- Hide entirely (return `null` since items become empty) when no slot is open.
- Switch to the next slot's items when its window opens.

Also add `refetchInterval` (or rely on the hook above + a `queryKey` dependency) so the items list re-runs as the active slot changes. Simplest: keep current `useEffect` but it will re-run when `activeSlotIds` set identity changes (React Query gives a new Set on refetch).

### 3. Section title (optional, nice UX)
Update `Index.tsx` to pass a dynamic title like `"Cloud Kitchen — {slotName}"` by reading the first open slot from `useCustomerDivisions()`, so users see which meal time is live. If no slot open, the section auto-hides (already handled).

## Technical notes
- No DB/schema changes.
- No RLS changes.
- "Currently active meal-time" = slot where `is_ordering_open === true` per `checkIfOrderingOpen` (between cutoff and slot end_time logic already in place).
- Multiple slots could be open simultaneously (overlapping windows); behavior will show items for all currently-open slots, which matches "active meal time(s)".

## Files touched
- `src/lib/cloudKitchenSlotUtils.ts` (new) — extract `checkIfOrderingOpen`.
- `src/hooks/useCloudKitchenSlots.ts` — `useActiveCloudKitchenSlotIds` now returns only currently-orderable slot IDs + 60s refetch.
- `src/hooks/useCustomerCloudKitchen.ts` — import shared helper (no behavior change).
- `src/pages/Index.tsx` (optional) — dynamic Cloud Kitchen section title.
