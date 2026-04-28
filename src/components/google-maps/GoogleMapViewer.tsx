import React from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';

interface GoogleMapViewerProps {
  latitude: number;
  longitude: number;
  height?: string;
  label?: string;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const GoogleMapViewer: React.FC<GoogleMapViewerProps> = ({
  latitude,
  longitude,
  height = '200px',
  label,
}) => {
  const { apiKey, isLoading: isKeyLoading } = useGoogleMapsKey();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const center = { lat: latitude, lng: longitude };

  const openInGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      '_blank'
    );
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted p-3 text-sm text-muted-foreground" style={{ height }}>
        Map unavailable
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
      {label && (
        <p className="text-xs font-medium flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {label}
        </p>
      )}
      <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={16}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: true,
            draggable: true,
          }}
        >
          <Marker position={center} />
        </GoogleMap>

        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-3 right-3 shadow-md"
          onClick={openInGoogleMaps}
        >
          Navigate
        </Button>
      </div>
    </div>
  );
};

export default GoogleMapViewer;
