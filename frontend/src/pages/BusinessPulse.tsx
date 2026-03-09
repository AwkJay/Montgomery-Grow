import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import BusinessHeatmap from '../components/BusinessHeatmap';
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

type LicenseStatus = string;

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export default function BusinessPulse() {
  const [licensesPerYear, setLicensesPerYear] = useState<BusinessLicensesPerYear[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryCount[]>([]);
  const [statuses, setStatuses] = useState<LicenseStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All categories');
  const [selectedStatus, setSelectedStatus] = useState<string>('All statuses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [yearRes, catRes, statusRes] = await Promise.all([
          fetch(`${API_BASE}/api/business/licenses-per-year`),
          fetch(`${API_BASE}/api/business/category-distribution`),
          fetch(`${API_BASE}/api/business/license-statuses`),
        ]);

        if (!yearRes.ok || !catRes.ok || !statusRes.ok) {
          throw new Error('Failed to fetch business data');
        }

        const yearData = (await yearRes.json()) as BusinessLicensesPerYear[];
        const catData = (await catRes.json()) as CategoryCount[];
        const statusData = (await statusRes.json()) as LicenseStatus[];

        setLicensesPerYear(yearData);
        setCategoryDistribution(catData);
        setStatuses(statusData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    async function refetchFiltered() {
      try {
        setError(null);
        const params = new URLSearchParams();
        if (selectedCategory !== 'All categories') {
          params.set('category', selectedCategory);
        }
        if (selectedStatus !== 'All statuses') {
          params.set('status', selectedStatus);
        }

        const url =
          params.toString().length > 0
            ? `${API_BASE}/api/business/licenses-per-year-filtered?${params.toString()}`
            : `${API_BASE}/api/business/licenses-per-year`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Failed to fetch filtered licenses data');
        }
        const data = (await res.json()) as BusinessLicensesPerYear[];
        setLicensesPerYear(data);
      } catch (err) {
        // Keep previous data on filter error but surface message.
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load filtered licenses data');
      }
    }

    // Only attempt refetch once initial load has completed.
    if (!loading) {
      refetchFiltered();
    }
  }, [selectedCategory, selectedStatus, loading]);

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
      {/* New Business Licenses Per Year */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">New Business Licenses Per Year</h2>
            <div className="flex gap-2 items-center">
              <select
                className="bg-slate-900/80 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1 max-w-44"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option>All categories</option>
                {categoryDistribution.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category}
                  </option>
                ))}
              </select>
              <select
                className="bg-slate-900/80 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1 max-w-32"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option>All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
                cursor={false}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
      </div>

      {/* Category Distribution */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
        <h2 className="text-sm font-semibold text-slate-100 mb-4">Business Category Distribution</h2>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={categoryDistribution.slice(0, 8)}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
              nameKey="category"
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
              formatter={(value) => {
                const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                const countText = numeric.toLocaleString();
                return [countText, ''];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Business Density Heatmap */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/50">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">Active Business Density Heatmap</h2>
        <p className="text-xs text-slate-400 mb-4">
          Hotter colors indicate more overlapping business licenses. Use the controls above the map to filter and
          search.
        </p>
        <BusinessHeatmap />
      </div>
    </div>
  );
}

