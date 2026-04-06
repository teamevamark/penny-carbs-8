## Google Maps Location Integration

### Database Changes
- Add `latitude` and `longitude` columns to `customer_addresses` table
- Add `delivery_latitude` and `delivery_longitude` columns to `orders` table

### Components to Create
1. **GoogleMapPicker** - Reusable map component for selecting a location (used in profile & checkout)
2. **GoogleMapViewer** - Read-only map component showing a pin (used in delivery/admin)

### Integration Points
1. **Profile → AddressSelector** - Add map picker in the add/edit address dialog
2. **Checkout pages** (Checkout.tsx, CloudKitchenCheckout.tsx) - Show map picker for delivery location
3. **Delivery Dashboard** - Show map viewer on assigned orders
4. **Admin Orders** - Show location on order details

### Technical Notes
- Google Maps API key `AIzaSyDf4IPeIB70WoefdwZCbLjg8SLsaMgpzeA` is a publishable key, stored in code as `VITE_GOOGLE_MAPS_API_KEY`
- Use `@react-google-maps/api` library for React integration
- Store lat/lng when user picks location on map
- Default map center: India (10.8505, 76.2711 - Kerala region based on panchayat context)
