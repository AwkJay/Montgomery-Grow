import { FormEvent, useState } from 'react';
import LocationMap from '../components/LocationMap';

type NeighborhoodScoreMetrics = {
  new_businesses: number;
  permit_value: number;
  foot_traffic: number;
  code_violations: number;
  nuisances: number;
  open_311: number;
};

type NeighborhoodScoreResponse = {
  score: number;
  grade: string;
  summary: string;
  metrics: NeighborhoodScoreMetrics;
};

const API_BASE = 'http://localhost:8000';

export default function NeighborhoodScore() {
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NeighborhoodScoreResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        address: address || undefined,
        radius_km: radiusKm,
      };
      if (coords) {
        payload.lat = coords.lat;
        payload.lon = coords.lon;
      }

      const res = await fetch(`${API_BASE}/api/neighborhood-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }
      const json = (await res.json()) as NeighborhoodScoreResponse;
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load score');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3 items-start">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
            <h2 className="text-sm font-semibold text-slate-100 mb-2">Neighborhood Economic Score</h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter an address in Montgomery and/or click the map to place a marker. We&apos;ll analyze nearby
              business formation, development activity, foot traffic, and complaints to estimate opportunity.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-200">Address (optional)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 103 North Perry St, Montgomery, AL"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="block font-medium text-slate-200">Radius (km)</label>
                  <input
                    type="number"
                    min={0.25}
                    max={5}
                    step={0.25}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseFloat(e.target.value) || 1)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {loading ? 'Scoring neighborhood…' : 'Calculate Opportunity Score'}
              </button>
              {coords && (
                <p className="text-[11px] text-emerald-300">
                  Using map point at {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}.
                </p>
              )}
              {error && <p className="text-[11px] text-rose-400">{error}</p>}
            </form>
          </div>

          {result && (
            <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-4 shadow-xl shadow-emerald-500/20 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Opportunity Score</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-semibold text-emerald-400">
                      {Math.round(result.score)}
                      <span className="text-base text-slate-400 ml-0.5">/100</span>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      Grade {result.grade}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-200">{result.summary}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <MetricPill label="New businesses" value={result.metrics.new_businesses} positive />
                <MetricPill label="Permit value" value={result.metrics.permit_value} positive />
                <MetricPill label="Foot traffic" value={result.metrics.foot_traffic} positive />
                <MetricPill label="Code violations" value={result.metrics.code_violations} />
                <MetricPill label="Nuisances" value={result.metrics.nuisances} />
                <MetricPill label="Open 311" value={result.metrics.open_311} />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 md:p-4 shadow-xl shadow-black/70">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Place a marker in Montgomery</h2>
                <p className="text-xs text-slate-400">
                  Click anywhere on the map to set the analysis location. We&apos;ll look within your selected
                  radius.
                </p>
              </div>
            </div>
            <LocationMap
              onLocationSelected={(lat, lon) => {
                setCoords({ lat, lon });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type MetricPillProps = {
  label: string;
  value: number;
  positive?: boolean;
};

function MetricPill({ label, value, positive }: MetricPillProps) {
  const pct = Math.round(value * 100);
  const hue = positive ? (pct >= 60 ? 'emerald' : pct >= 40 ? 'amber' : 'rose') : pct >= 60 ? 'emerald' : pct >= 40 ? 'amber' : 'rose';

  const baseColors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
    amber: 'bg-amber-500/10 text-amber-200 border-amber-500/40',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
  };

  return (
    <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${baseColors[hue]}`}>
      <span className="text-[11px]">{label}</span>
      <span className="text-[11px] font-semibold">{pct}</span>
    </div>
  );
}



