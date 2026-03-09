import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

const API_BASE = 'http://localhost:8000';
const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];

type HeatmapPoint = {
  lat: number;
  lng: number;
  category?: string;
  name?: string;
  address?: string;
  year?: number;
};

type CategoryRow = {
  category: string;
  count: number;
};

type HeatmapLayerProps = {
  points: HeatmapPoint[];
};

function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  // Use a loose type here because leaflet.heat augments Leaflet at runtime.
  const layerRef = useRef<any | null>(null);

  useEffect(() => {
    if (!points.length) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const heatData = points.map((p) => [p.lat, p.lng, 1.0]) as any[];

    // @ts-expect-error leaflet.heat augments L with heatLayer
    layerRef.current = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.4: 'cyan',
        0.6: 'lime',
        0.8: 'yellow',
        1.0: 'red',
      },
    }).addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [points, map]);

  return null;
}

type RadiusCircleProps = {
  center: [number, number] | null;
  radiusKm: number;
};

function RadiusCircle({ center, radiusKm }: RadiusCircleProps) {
  if (!center) return null;
  return (
    <Circle
      center={center}
      radius={radiusKm * 1000}
      pathOptions={{ color: '#6366f1', fillOpacity: 0.1 }}
    />
  );
}

type RecenterOnChangeProps = {
  center: [number, number];
  zoom: number;
};

function RecenterOnChange({ center, zoom }: RecenterOnChangeProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function BusinessHeatmap() {
  const [allPoints, setAllPoints] = useState<HeatmapPoint[]>([]);
  const [searchPoints, setSearchPoints] = useState<HeatmapPoint[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [searchAddress, setSearchAddress] = useState('');
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState(2);
  const [searchCount, setSearchCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'city' | 'search'>('city');
  const [mapCenter, setMapCenter] = useState<[number, number]>(MONTGOMERY_CENTER);
  const [mapZoom, setMapZoom] = useState(12);

  // Load full city heatmap
  useEffect(() => {
    const url =
      selectedCat.length > 0
        ? `${API_BASE}/api/business/heatmap?category=${encodeURIComponent(selectedCat)}`
        : `${API_BASE}/api/business/heatmap`;

    fetch(url)
      .then((r) => r.json())
      .then((data: HeatmapPoint[]) => setAllPoints(data))
      .catch((err) => {
        console.error(err);
      });
  }, [selectedCat]);

  // Load categories for dropdown
  useEffect(() => {
    fetch(`${API_BASE}/api/business/categories`)
      .then((r) => r.json())
      .then((data: CategoryRow[]) => setCategories(data))
      .catch((err) => console.error(err));
  }, []);

  async function geocodeAddress(address: string): Promise<[number, number] | null> {
    const q = encodeURIComponent(`${address}, Montgomery, AL`);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    );
    const data = (await r.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }

  async function handleSearch() {
    if (!searchAddress.trim()) return;
    setLoading(true);

    try {
      const coords = await geocodeAddress(searchAddress);
      if (!coords) {
        // eslint-disable-next-line no-alert
        alert('Address not found. Try a street name or zip code.');
        setLoading(false);
        return;
      }

      setSearchCenter(coords);
      setMapCenter(coords);
      setMapZoom(14);

      const params = new URLSearchParams({
        lat: String(coords[0]),
        lng: String(coords[1]),
        radius_km: String(radiusKm),
      });
      if (selectedCat) {
        params.set('category', selectedCat);
      }

      const r = await fetch(`${API_BASE}/api/business/heatmap/radius?${params.toString()}`);
      const data = (await r.json()) as {
        count: number;
        businesses: HeatmapPoint[];
      };

      setSearchPoints(data.businesses);
      setSearchCount(data.count);
      setMode('search');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const activePoints = mode === 'search' ? searchPoints : allPoints;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Category</label>
          <select
            value={selectedCat}
            onChange={(e) => {
              setSelectedCat(e.target.value);
              setMode('city');
            }}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category} ({c.count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-56">
          <label className="text-xs text-slate-400 block mb-1">Search location</label>
          <input
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., Eastern Blvd or 36117"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Radius: {radiusKm} km</label>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>

        {mode === 'search' && (
          <button
            type="button"
            onClick={() => {
              setMode('city');
              setSearchCenter(null);
              setSearchCount(null);
              setSearchAddress('');
              setMapCenter([...MONTGOMERY_CENTER]);
              setMapZoom(12);
            }}
            className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800/80"
          >
            Show full city
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setMode('city');
            setSearchCenter(null);
            setSearchCount(null);
            setSearchAddress('');
            setSelectedCat('');
            setRadiusKm(2);
            setMapCenter([...MONTGOMERY_CENTER]);
            setMapZoom(12);
          }}
          className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800/80 ml-auto"
        >
          Recenter map
        </button>
      </div>

      {searchCount !== null && mode === 'search' && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200">
          <span className="font-semibold text-emerald-300">
            {searchCount.toLocaleString()} businesses
          </span>{' '}
          within {radiusKm}km of “{searchAddress}”
          {selectedCat && <span> in {selectedCat}</span>}
        </div>
      )}

      <div className="h-[500px] rounded-xl overflow-hidden border border-slate-700 relative">
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <HeatmapLayer points={activePoints} />
          <RadiusCircle center={searchCenter} radiusKm={radiusKm} />
          <RecenterOnChange center={mapCenter} zoom={mapZoom} />
        </MapContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-300">Density scale</span>
        <div className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-full bg-blue-500" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-full bg-cyan-400" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-full bg-lime-400" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-full bg-yellow-300" />
          <span>Very high</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-full bg-red-500" />
          <span>Extreme</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-center text-xs">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
          <div className="text-lg font-semibold text-emerald-400">
            {activePoints.length.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {mode === 'search' ? 'Businesses in radius' : 'Active businesses (city-wide)'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
          <div className="text-sm font-semibold text-emerald-300">
            {selectedCat || 'All categories'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Selected category</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
          <div className="text-sm font-semibold text-emerald-300">
            {mode === 'search' ? `${radiusKm} km` : 'City-wide'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">View mode</div>
        </div>
      </div>
    </div>
  );
}

