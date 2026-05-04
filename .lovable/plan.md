## Goal
On the home page, show more "Homemade Favorites" items, and on mobile display them in a multi-row grid layout (instead of a single horizontal scroll row).

## Changes

### 1. `src/pages/Index.tsx`
Pass a higher `limit` and a new `layout="grid"` prop to the Homemade `PopularItems`:
- `limit={12}` (up from default 6)
- `layout="grid"` so it renders in a wrap/grid on mobile
- Keep `cloud_kitchen` and `indoor_events` carousels unchanged (horizontal scroll, default limit).

### 2. `src/components/customer/PopularItems.tsx`
- Add new optional prop `layout?: 'carousel' | 'grid'` (default `'carousel'` to preserve existing behavior).
- When `layout === 'grid'`:
  - Replace the horizontal scroll container with a responsive grid:
    - mobile: `grid-cols-2` (2 cards per row → multiple rows)
    - small tablets: `sm:grid-cols-3`
    - larger: `md:grid-cols-4 lg:grid-cols-6`
  - Cards become full-width within their grid cell (`w-full` instead of fixed `w-40`).
  - Same applies to the loading Skeleton block.
- "See More" button behavior unchanged — still navigates to `/menu/homemade`.

## Notes
- No DB / hook / query changes; only UI.
- Cloud Kitchen + Indoor Events sections remain horizontal carousels as today.
- Item filtering (panchayat / cook allocation / availability) is unchanged.