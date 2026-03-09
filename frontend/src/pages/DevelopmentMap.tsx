import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE = import.meta.env.VITE_API_URL

type ConstructionPermit = {
  id: number;
  lat: number;
  lon: number;
  value: number;
  permit_type: string;
  issued_date: string;
};

export default function DevelopmentMap() {
  const [permits, setPermits] = useState<ConstructionPermit[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (selectedYear === null) return;

      setLoading(true);
      setError(null);
      try {
        const url = `${API_BASE}/api/development/permits${selectedYear ? `?year=${selectedYear}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch permits');
        const data = (await res.json()) as ConstructionPermit[];
        setPermits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permits');
      } finally {
        setLoading(false);
      }
    }

    fetchPermits();
  }, [selectedYear]);

  // Calculate marker size based on permit value (normalized)
  const maxValue = permits.length > 0 ? Math.max(...permits.map((p) => p.value)) : 1;
  const minValue = permits.length > 0 ? Math.min(...permits.map((p) => p.value)) : 0;
  const valueRange = maxValue - minValue || 1;

  const getMarkerRadius = (value: number) => {
    const normalized = (value - minValue) / valueRange;
    return Math.max(5, Math.min(30, 5 + normalized * 25));
  };

  const getMarkerColor = (value: number) => {
    const normalized = (value - minValue) / valueRange;
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
              <option value="">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">Loading permits...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-rose-400">Error: {error}</div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-3 flex items-center gap-4 text-xs text-slate-400">
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
              <div className="ml-auto text-slate-500">
                {permits.length} permit{permits.length !== 1 ? 's' : ''} shown
              </div>
            </div>
            <div className="h-[600px] rounded-lg overflow-hidden border border-slate-700">
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
                {permits.map((permit) => (
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
          </>
        )}
      </div>
    </div>
  );
}


