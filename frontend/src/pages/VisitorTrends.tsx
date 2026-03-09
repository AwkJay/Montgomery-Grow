import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const API_BASE = 'http://localhost:8000';

type VisitorTrendPoint = {
  month: string;
  residents: number;
  commuters: number;
  visitors: number;
};

type VisitorOriginPoint = {
  month: string;
  region: string;
  visitors: number;
};

type TopLocationCategory = {
  month: string;
  category: string;
  visits: number;
};

export default function VisitorTrends() {
  const [trends, setTrends] = useState<VisitorTrendPoint[]>([]);
  const [origins, setOrigins] = useState<VisitorOriginPoint[]>([]);
  const [topLocations, setTopLocations] = useState<TopLocationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [trendsRes, originsRes, locationsRes] = await Promise.all([
          fetch(`${API_BASE}/api/visitors/trends`),
          fetch(`${API_BASE}/api/visitors/origins`),
          fetch(`${API_BASE}/api/visitors/top-locations`),
        ]);

        if (!trendsRes.ok || !originsRes.ok || !locationsRes.ok) {
          throw new Error('Failed to fetch visitor data');
        }

        const trendsData = (await trendsRes.json()) as VisitorTrendPoint[];
        const originsData = (await originsRes.json()) as VisitorOriginPoint[];
        const locationsData = (await locationsRes.json()) as TopLocationCategory[];

        setTrends(trendsData);
        setOrigins(originsData);
        setTopLocations(locationsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Process origins data for chart (group by region, sum visitors)
  const originsByRegion = origins.reduce((acc, point) => {
    if (!acc[point.region]) {
      acc[point.region] = 0;
    }
    acc[point.region] += point.visitors;
    return acc;
  }, {} as Record<string, number>);

  const originsChartData = Object.entries(originsByRegion)
    .map(([region, visitors]) => ({ region, visitors }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);

  // Process top locations by category (sum visits per category)
  const locationsByCategory = topLocations.reduce((acc, point) => {
    if (!acc[point.category]) {
      acc[point.category] = 0;
    }
    acc[point.category] += point.visits;
    return acc;
  }, {} as Record<string, number>);

  const locationsChartData = Object.entries(locationsByCategory)
    .map(([category, visits]) => ({ category, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading visitor trends...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-rose-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Residents vs Commuters vs Visitors */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
        <h2 className="text-sm font-semibold text-slate-100 mb-4">Residents vs Commuters vs Visitors</h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="residents" stroke="#10b981" strokeWidth={2} name="Residents" />
            <Line type="monotone" dataKey="commuters" stroke="#3b82f6" strokeWidth={2} name="Commuters" />
            <Line type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={2} name="Visitors" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visitor Origin Regions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">Visitor Origin Regions</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={originsChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis dataKey="region" type="category" stroke="#94a3b8" fontSize={11} width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
                cursor={false}
              />
              <Bar dataKey="visitors" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Most Visited Location Categories */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">Most Visited Location Categories</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
                cursor={false}
              />
              <Bar dataKey="visits" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


