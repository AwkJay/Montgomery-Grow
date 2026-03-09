import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE = 'http://localhost:8000';

type ConstructionPermit = {
  id: number;
  lat: number;
  lon: number;
  value: number;
  permit_type: string;
  issued_date: string;
};

function MapController({ onChange }: { onChange: (bounds: any, zoom: number) => void }) {
  const map = useMapEvents({
    moveend() {
      onChange(map.getBounds(), map.getZoom());
    },
  });

  useEffect(() => {
    onChange(map.getBounds(), map.getZoom());
  }, [map, onChange]);

  return null;
}

export default function DevelopmentMap() {
  const [permits, setPermits] = useState<ConstructionPermit[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bounds, setBounds] = useState<any>(null);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    async function fetchYears() {
      try {
        const res = await fetch(`${API_BASE}/api/metadata/years`);
        if (!res.ok) throw new Error('Failed to fetch years');
        const years = (await res.json()) as number[];
        setAvailableYears(years);
        if (years.length > 0) {
          setSelectedYear(years[years.length - 1]); // Default to most recent year
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load years');
      }
    }
    fetchYears();
  }, []);

  useEffect(() => {
    async function fetchPermits() {
      if (selectedYear === null || !bounds || zoom < 14) {
        if (permits.length > 0) {
          setPermits([]); // Clear points when zoomed out or no year to save memory
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        
        const url = new URL(`${API_BASE}/api/development/permits`);
        url.searchParams.set('min_lat', sw.lat.toString());
        url.searchParams.set('max_lat', ne.lat.toString());
        url.searchParams.set('min_lon', sw.lng.toString());
        url.searchParams.set('max_lon', ne.lng.toString());
        
        if (selectedYear) {
          url.searchParams.set('year', String(selectedYear));
        }

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch permits');
        const data = (await res.json()) as ConstructionPermit[];
        setPermits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permits');
      } finally {
        setLoading(false);
      }
    }

    // Debounce slightly by just listening to bounds changes
    fetchPermits();
  }, [selectedYear, bounds, zoom]);

  // Calculate marker size based on permit value (normalized)
  const maxValue = permits.length > 0 ? Math.max(...permits.map((p) => p.value)) : 1;
  const minValue = permits.length > 0 ? Math.min(...permits.map((p) => p.value)) : 0;
  const valueRange = maxValue - minValue || 1;

  const getMarkerRadius = (value: number) => {
    // values can be very skewed, use a logarithmic or adjusted power scale
    // minimum 5px radius, max 40px radius
    if (value <= minValue) return 5;
    
    // Smooth logarithmic curve mapping (value - min) to [0, 1] range logarithmically
    const logRange = Math.log1p(valueRange);
    const logValue = Math.log1p(value - minValue);
    const normalized = logValue / logRange;
    
    return Math.max(5, Math.min(40, 5 + normalized * 35));
  };

  const getMarkerColor = (value: number) => {
    if (value <= minValue) return '#8b5cf6'; // purple

    const logRange = Math.log1p(valueRange);
    const logValue = Math.log1p(value - minValue);
    const normalized = logValue / logRange;

    if (normalized > 0.7) return '#10b981'; // emerald
    if (normalized > 0.4) return '#3b82f6'; // blue
    return '#8b5cf6'; // purple
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Construction Permits Map</h2>
            <p className="text-xs text-slate-400 mt-1">
              Marker size represents permit value. Filter by year to see development activity over time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-300">Year:</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
            >
              <option value="" disabled>Select Year</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500"></div>
              <span>Low value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span>Medium value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <span>High value</span>
            </div>
          </div>
          {zoom >= 14 && (
            <div className="text-slate-500">
              {permits.length} permit{permits.length !== 1 ? 's' : ''} shown in view
            </div>
          )}
        </div>

        <div className="relative h-[600px] rounded-lg overflow-hidden border border-slate-700 group">
          {zoom < 14 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
              <div className="bg-slate-800/95 border border-slate-700 px-5 py-3 rounded-full shadow-2xl flex items-center gap-3">
                <span className="text-xl">🔍</span>
                <span className="text-sm font-medium text-slate-200">
                  Zoom in closer to view {selectedYear ? selectedYear : ''} construction permits
                </span>
              </div>
            </div>
          )}

          {loading && zoom >= 14 && (
            <div className="absolute inset-x-0 top-4 z-[1000] flex justify-center pointer-events-none">
              <div className="bg-slate-800/90 backdrop-blur text-slate-200 text-sm px-4 py-2 rounded-full border border-slate-700 shadow-lg flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-emerald-500 animate-spin"></div>
                Loading area permits...
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-x-0 top-4 z-[1000] flex justify-center pointer-events-none">
              <div className="bg-rose-900/90 backdrop-blur text-rose-200 text-sm px-4 py-2 rounded-full border border-rose-700 shadow-lg pointer-events-auto">
                {error}
              </div>
            </div>
          )}

          <MapContainer
            center={[32.3668, -86.3000]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController 
              onChange={(b, z) => {
                setBounds(b);
                setZoom(z);
              }}
            />
            {!loading && !error && zoom >= 14 && permits.map((permit) => (
              <CircleMarker
                key={permit.id}
                center={[permit.lat, permit.lon]}
                radius={getMarkerRadius(permit.value)}
                pathOptions={{
                  fillColor: getMarkerColor(permit.value),
                  fillOpacity: 0.6,
                  color: getMarkerColor(permit.value),
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-semibold">{permit.permit_type}</div>
                    <div className="text-slate-600">
                      Value: ${permit.value.toLocaleString()}
                    </div>
                    <div className="text-slate-500">
                      Issued: {new Date(permit.issued_date).toLocaleDateString()}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}


