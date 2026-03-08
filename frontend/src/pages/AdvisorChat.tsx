import type { FormEvent } from 'react';
import { useState } from 'react';

const API_BASE = 'http://localhost:8000';

type AdvisorResponse = {
  answer: string;
  score: number;
  grade: string;
  raw_metrics: Record<string, number>;
};

export default function AdvisorChat() {
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('');
  const [coords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AdvisorResponse | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; response: AdvisorResponse }>>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        query: query.trim(),
      };

      if (address) {
        payload.address = address;
      }
      if (coords) {
        payload.lat = coords.lat;
        payload.lon = coords.lon;
      }

      const res = await fetch(`${API_BASE}/api/advisor/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const json = (await res.json()) as AdvisorResponse;
      setResponse(json);
      setHistory((prev) => [...prev, { query: query.trim(), response: json }]);
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get advisor response');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">AI Economic Advisor</h2>
        <p className="text-xs text-slate-400 mb-4">
          Ask questions about business opportunities in Montgomery neighborhoods. Examples: &quot;Is Oak Park a good
          place to open a restaurant?&quot; or &quot;Where should I invest in retail?&quot;
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">Your Question</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Is Oak Park a good place to open a restaurant?"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/70 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">Address (optional, for location context)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., Oak Park, Montgomery, AL"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
            />
          </div>

          {coords && (
            <p className="text-[11px] text-emerald-300">
              Using map coordinates: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Ask Advisor'}
          </button>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </form>
      </div>

      {/* Latest Response */}
      {response && (
        <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-4 shadow-xl shadow-emerald-500/20 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Advisor Response</div>
              <p className="text-sm leading-relaxed text-slate-200">{response.answer}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-2xl font-semibold text-emerald-400">
                {Math.round(response.score)}
                <span className="text-sm text-slate-400 ml-0.5">/100</span>
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                Grade {response.grade}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Conversation History */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
          <h3 className="text-sm font-semibold text-slate-100 mb-3">Conversation History</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {history.map((item, idx) => (
              <div key={idx} className="space-y-2 border-b border-slate-800 pb-4 last:border-0">
                <div className="text-xs font-medium text-emerald-400">Q: {item.query}</div>
                <div className="text-xs text-slate-300 pl-4">{item.response.answer}</div>
                <div className="flex items-center gap-2 pl-4 text-[11px] text-slate-500">
                  <span>Score: {Math.round(item.response.score)}/100</span>
                  <span>•</span>
                  <span>Grade: {item.response.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

