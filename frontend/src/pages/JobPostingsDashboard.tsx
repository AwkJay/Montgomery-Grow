import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

const API_BASE = 'http://localhost:8000';

type JobSummary = {
  total_jobs: number;
  jobs_this_month: number;
  top_industry: string;
  top_skill: string;
};

type JobTrendPoint = {
  month: string;
  postings: number;
};

type JobListing = {
  job_title: string;
  company: string;
  industry: string;
  salary: string;
  posting_date: string;
  skills: string[];
};

type JobsBySourceRow = {
  source: string;
  count: number;
};

type IndustryCountRow = {
  sector: string;
  count: number;
};

type JobSkillDemand = {
  skill: string;
  count: number;
};

export default function JobPostingsDashboard() {
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [trends, setTrends] = useState<JobTrendPoint[]>([]);
  const [industryCounts, setIndustryCounts] = useState<IndustryCountRow[]>([]);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [bySource, setBySource] = useState<JobsBySourceRow[]>([]);
  const [skills, setSkills] = useState<JobSkillDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PrimeReact lazy table state
  const [tableLoading, setTableLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [sortField, setSortField] = useState<'company' | 'job_title' | 'industry' | 'salary' | 'posting_date'>('company');
  const [sortOrder, setSortOrder] = useState<1 | -1>(1);

  // Hiring trend range (year + month)
  const [startYear, setStartYear] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endYear, setEndYear] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, trendsRes, sourcesRes, industryRes, skillsRes] = await Promise.all([
          fetch(`${API_BASE}/api/jobs/summary`),
          fetch(`${API_BASE}/api/jobs/trends`),
          fetch(`${API_BASE}/api/jobs/sources`),
          fetch(`${API_BASE}/api/jobs/industry-counts`),
          fetch(`${API_BASE}/api/jobs/skills`),
        ]);

        if (!summaryRes.ok || !trendsRes.ok || !sourcesRes.ok || !industryRes.ok || !skillsRes.ok) {
          throw new Error('Failed to load job analytics');
        }

        const summaryJson = (await summaryRes.json()) as JobSummary;
        const trendsJson = (await trendsRes.json()) as JobTrendPoint[];
        const sourcesJson = (await sourcesRes.json()) as JobsBySourceRow[];
        const industryJson = (await industryRes.json()) as IndustryCountRow[];
        const skillsJson = (await skillsRes.json()) as JobSkillDemand[];

        setSummary(summaryJson);
        setTrends(trendsJson);
        setBySource(sourcesJson);
        setIndustryCounts(industryJson);
        setSkills(skillsJson);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Initialize trend range once trends load.
  useEffect(() => {
    if (trends.length === 0) return;
    // trends.month is "YYYY-MM"
    const firstMonth = trends[0]?.month ?? '';
    const lastMonth = trends[trends.length - 1]?.month ?? '';
    const [fy, fm] = firstMonth.split('-');
    const [ly, lm] = lastMonth.split('-');

    setStartYear((prev) => prev || fy || '');
    setStartMonth((prev) => prev || fm || '');
    setEndYear((prev) => prev || ly || '');
    setEndMonth((prev) => prev || lm || '');
  }, [trends]);

  useEffect(() => {
    async function fetchPage() {
      setTableLoading(true);
      try {
        const url = new URL(`${API_BASE}/api/jobs/listings-page`);
        url.searchParams.set('offset', String(first));
        url.searchParams.set('limit', String(rows));
        url.searchParams.set('sort_field', sortField);
        url.searchParams.set('sort_order', String(sortOrder));

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to load job listings');
        const json = (await res.json()) as { data: JobListing[]; total: number };
        setListings(json.data);
        setTotalRecords(json.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job listings');
      } finally {
        setTableLoading(false);
      }
    }

    if (!loading) {
      fetchPage();
    }
  }, [first, rows, sortField, sortOrder, loading]);

  const months = [
    { value: '01', label: 'Jan' },
    { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' },
    { value: '04', label: 'Apr' },
    { value: '05', label: 'May' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ];

  const availableYears = Array.from(
    new Set(
      trends
        .map((t) => (t.month || '').split('-')[0])
        .filter((y) => y && y.length === 4),
    ),
  ).sort();

  const startKey = startYear && startMonth ? `${startYear}-${startMonth}` : '';
  const endKey = endYear && endMonth ? `${endYear}-${endMonth}` : '';

  const normalizedStartKey = startKey && endKey && startKey > endKey ? endKey : startKey;
  const normalizedEndKey = startKey && endKey && startKey > endKey ? startKey : endKey;

  const filteredTrends =
    normalizedStartKey && normalizedEndKey
      ? trends.filter((t) => t.month >= normalizedStartKey && t.month <= normalizedEndKey)
      : trends;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading job postings & workforce analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-rose-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workforce Overview Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            label="Total Job Postings"
            value={summary.total_jobs.toLocaleString()}
            description="Currently active roles across Montgomery employers."
          />
          <OverviewCard
            label="Jobs Posted This Month"
            value={summary.jobs_this_month.toLocaleString()}
            description="Recent openings indicating near-term hiring velocity."
          />
          <OverviewCard
            label="Top Hiring Industry"
            value={summary.top_industry}
            description="Industry with the most active postings."
          />
          <OverviewCard
            label="Most In-Demand Skill"
            value={summary.top_skill}
            description="Skill appearing most frequently in recent listings."
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Hiring Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Hiring Trend</h2>
              <p className="text-xs text-slate-400">
                Job postings over time, capturing demand momentum in the local market.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Start</span>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500">End</span>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    color: '#e2e8f0',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="postings"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Brush
                  dataKey="month"
                  height={24}
                  stroke="#22c55e"
                  travellerWidth={10}
                  fill="#020617"
                  startIndex={Math.max(0, filteredTrends.length - 12)}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source coverage */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Ingestion Coverage</h2>
              <p className="text-xs text-slate-400">
                Jobs currently stored, broken down by source.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {bySource.length === 0 ? (
              <div className="text-xs text-slate-400">No source data available.</div>
            ) : (
              bySource.map((row) => (
                <div
                  key={row.source}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="text-xs text-slate-200">{row.source}</div>
                  <div className="text-xs font-semibold text-emerald-300">{row.count.toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Industries & Insights */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Top Industries Hiring</h2>
              <p className="text-xs text-slate-400">
                Relative demand by industry based on current ingested postings.
              </p>
            </div>
          </div>
          <IndustryChart industryCounts={industryCounts} />
        </div>

        {/* Most In-Demand Skills */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Most In-Demand Skills</h2>
              <p className="text-xs text-slate-400">
                Skills appearing most frequently in current job postings.
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...skills].sort((a, b) => b.count - a.count)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  dataKey="skill"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    color: '#e2e8f0',
                  }}
                  cursor={false}
                />
                <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Job Listings Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Job Listings</h2>
            <p className="text-xs text-slate-400">
              Sources: {bySource.map((s) => s.source).join(', ') || '—'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-slate-500 whitespace-nowrap">
              Showing {Math.min(first + 1, totalRecords)}–{Math.min(first + rows, totalRecords)} of{' '}
              {totalRecords.toLocaleString()} postings
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">Top</span>
              <select
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                value={rows}
                onChange={(e) => {
                  setFirst(0);
                  setRows(parseInt(e.target.value, 10));
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/80 overflow-hidden">
          <DataTable
            value={listings}
            lazy
            loading={tableLoading}
            totalRecords={totalRecords}
            first={first}
            rows={rows}
            onPage={(e) => {
              setFirst(e.first ?? 0);
              setRows(e.rows ?? rows);
            }}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={(e) => {
              setFirst(0);
              setSortField((e.sortField as typeof sortField) ?? 'company');
              setSortOrder((e.sortOrder as 1 | -1) ?? 1);
            }}
            paginator
            paginatorTemplate="PrevPageLink PageLinks NextPageLink"
            stripedRows
            size="normal"
            className="montgomery-table"
          >
            <Column
              header="S. No."
              body={(_, options) => <span className="text-slate-300">{first + (options.rowIndex ?? 0) + 1}</span>}
              style={{ width: '90px' }}
              headerStyle={{ width: '90px' }}
            />
            <Column field="job_title" header="Job Title" sortable style={{ minWidth: '260px' }} />
            <Column field="company" header="Company" sortable style={{ minWidth: '220px' }} />
            <Column field="industry" header="Industry" sortable style={{ minWidth: '180px' }} />
            <Column field="salary" header="Salary" sortable style={{ minWidth: '180px' }} />
            <Column field="posting_date" header="Posting Date" sortable style={{ minWidth: '160px' }} />
          </DataTable>
        </div>
      </div>
    </div>
  );
}

type OverviewCardProps = {
  label: string;
  value: string | number;
  description: string;
};

function OverviewCard({ label, value, description }: OverviewCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/60">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold text-emerald-400 mb-1">{value}</div>
      <div className="text-[11px] text-slate-400">{description}</div>
    </div>
  );
}

type IndustryChartProps = {
  industryCounts: IndustryCountRow[];
};

function IndustryChart({ industryCounts }: IndustryChartProps) {
  const data = [...industryCounts]
    .map((r) => ({ industry: r.sector || 'Other', count: r.count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="industry" stroke="#94a3b8" fontSize={11} />
          <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#020617',
              border: '1px solid #1e293b',
              borderRadius: 8,
              color: '#e2e8f0',
            }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type InsightCardProps = {
  title: string;
  body: string;
};

function InsightCard({ title, body }: InsightCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
      <div className="text-xs font-semibold text-slate-100 mb-1.5">{title}</div>
      <p className="text-[11px] leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}



