import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE = 'http://localhost:8000';

type BusinessLicensesPerYear = {
  year: number;
  count: number;
};

type CategoryCount = {
  category: string;
  count: number;
};

type HeatmapPoint = {
  lat: number;
  lon: number;
  weight: number;
};

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export default function BusinessPulse() {
  const [licensesPerYear, setLicensesPerYear] = useState<BusinessLicensesPerYear[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryCount[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [yearRes, catRes, heatRes] = await Promise.all([
          fetch(`${API_BASE}/api/business/licenses-per-year`),
          fetch(`${API_BASE}/api/business/category-distribution`),
          fetch(`${API_BASE}/api/business/density-heatmap`),
        ]);

        if (!yearRes.ok || !catRes.ok || !heatRes.ok) {
          throw new Error('Failed to fetch business data');
        }

        const yearData = (await yearRes.json()) as BusinessLicensesPerYear[];
        const catData = (await catRes.json()) as CategoryCount[];
        const heatData = (await heatRes.json()) as HeatmapPoint[];

        setLicensesPerYear(yearData);
        setCategoryDistribution(catData);
        setHeatmapPoints(heatData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading business pulse data...</div>
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* New Business Licenses Per Year */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">New Business Licenses Per Year</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={licensesPerYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">Business Category Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution.slice(0, 8)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {categoryDistribution.slice(0, 8).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Business Density Heatmap */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">Active Business Density Heatmap</h2>
        <p className="text-xs text-slate-400 mb-4">
          Each marker represents an active business location in Montgomery. Clusters indicate commercial corridors.
        </p>
        <div className="h-[500px] rounded-lg overflow-hidden border border-slate-700">
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
            {heatmapPoints.map((point, idx) => (
              <CircleMarker
                key={idx}
                center={[point.lat, point.lon]}
                radius={4}
                pathOptions={{
                  fillColor: '#10b981',
                  fillOpacity: 0.6,
                  color: '#10b981',
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">Business Location</div>
                    <div className="text-slate-600">
                      {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
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

