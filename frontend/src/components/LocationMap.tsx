import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';

type LocationMapProps = {
  onLocationSelected?: (lat: number, lon: number) => void;
};

const defaultCenter: LatLngExpression = [32.3668, -86.3];

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type LocationMarkerProps = {
  onLocationSelected?: (lat: number, lon: number) => void;
};

function LocationMarker({ onLocationSelected }: LocationMarkerProps) {
  const [position, setPosition] = useState<LatLngExpression | null>(null);

  useMapEvents({
    click(e) {
      const next: LatLngExpression = [e.latlng.lat, e.latlng.lng];
      setPosition(next);
      if (onLocationSelected) {
        onLocationSelected(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  if (!position) return null;
  return <Marker position={position} icon={markerIcon} />;
}

export default function LocationMap({ onLocationSelected }: LocationMapProps) {
  const center = useMemo(() => defaultCenter, []);

  return (
    <MapContainer center={center} zoom={12} className="h-[320px] w-full rounded-xl overflow-hidden">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <LocationMarker onLocationSelected={onLocationSelected} />
    </MapContainer>
  );
}



