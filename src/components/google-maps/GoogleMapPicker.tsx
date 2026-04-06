import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';

interface GoogleMapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
}

const DEFAULT_CENTER = { lat: 10.8505, lng: 76.2711 }; // Kerala, India

const containerStyle = {
  width: '100%',
  height: '100%',
};

const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  latitude,
  longitude,
  onLocationChange,
  height = '250px',
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral>(
    latitude && longitude ? { lat: latitude, lng: longitude } : DEFAULT_CENTER
  );
  const [isLocating, setIsLocating] = useState(false);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarkerPosition({ lat, lng });
        onLocationChange(lat, lng);
      }
    },
    [onLocationChange]
  );

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMarkerPosition({ lat, lng });
        onLocationChange(lat, lng);
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(16);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted p-4 text-sm text-muted-foreground" style={{ height }}>
        Failed to load Google Maps
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted" style={{ height }}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={markerPosition}
          zoom={latitude && longitude ? 16 : 12}
          onClick={handleMapClick}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          <Marker position={markerPosition} />
        </GoogleMap>

        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-3 right-3 shadow-md"
          onClick={handleCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Crosshair className="h-4 w-4 mr-1" />
          )}
          My Location
        </Button>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        Tap on map to set delivery location
      </p>
    </div>
  );
};

export default GoogleMapPicker;
