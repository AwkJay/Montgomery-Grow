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

const SKILL_CATEGORIES: Record<string, string> = {
  Python: 'Technology',
  R: 'Technology',
  SQL: 'Technology',
  JavaScript: 'Technology',
  Cloud: 'Technology',
  Cybersecurity: 'Technology',
  Networking: 'Technology',
  'Data Analysis': 'Technology',
  Excel: 'Technology',

  'Patient Care': 'Healthcare',
  'EMR Systems': 'Healthcare',
  ICU: 'Healthcare',
  Phlebotomy: 'Healthcare',
  CPR: 'Healthcare',
  'Medical Coding': 'Healthcare',

  'Law Enforcement': 'Public Safety',
  'Emergency Mgmt': 'Public Safety',
  Firearms: 'Public Safety',

  Accounting: 'Finance',
  Budgeting: 'Finance',
  Auditing: 'Finance',
  QuickBooks: 'Finance',

  Welding: 'Construction & Trades',
  Electrical: 'Construction & Trades',
  HVAC: 'Construction & Trades',
  Plumbing: 'Construction & Trades',
  CDL: 'Construction & Trades',
  'Heavy Equipment': 'Construction & Trades',

  Leadership: 'Soft Skills / General',
  Communication: 'Soft Skills / General',
  'Customer Service': 'Soft Skills / General',
  'Project Mgmt': 'Soft Skills / General',
  Bilingual: 'Soft Skills / General',

  Teaching: 'Education',
  'Special Ed': 'Education',

  'Security Clearance': 'Government',
  'Grant Writing': 'Government',
  GIS: 'Government',
};

const CATEGORY_COLORS: Record<string, string> = {
  Technology: '#3b82f6', // blue
  Healthcare: '#10b981', // emerald
  'Public Safety': '#ef4444', // red
  Finance: '#f59e0b', // amber
  'Construction & Trades': '#f97316', // orange
  'Soft Skills / General': '#8b5cf6', // purple
  Education: '#ec4899', // pink
  Government: '#64748b', // slate
};

export default function JobPostingsDashboard() {
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [trends, setTrends] = useState<JobTrendPoint[]>([]);
  const [industryCounts, setIndustryCounts] = useState<IndustryCountRow[]>([]);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [bySource, setBySource] = useState<JobsBySourceRow[]>([]);
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
        const [summaryRes, trendsRes, sourcesRes, industryRes] = await Promise.all([
          fetch(`${API_BASE}/api/jobs/summary`),
          fetch(`${API_BASE}/api/jobs/trends`),
          fetch(`${API_BASE}/api/jobs/sources`),
          fetch(`${API_BASE}/api/jobs/industry-counts`),
        ]);

        if (!summaryRes.ok || !trendsRes.ok || !sourcesRes.ok || !industryRes.ok) {
          throw new Error('Failed to load job analytics');
        }

        const summaryJson = (await summaryRes.json()) as JobSummary;
        const trendsJson = (await trendsRes.json()) as JobTrendPoint[];
        const sourcesJson = (await sourcesRes.json()) as JobsBySourceRow[];
        const industryJson = (await industryRes.json()) as IndustryCountRow[];

        setSummary(summaryJson);
        setTrends(trendsJson);
        setBySource(sourcesJson);
        setIndustryCounts(industryJson);
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

      <div className="grid gap-6 lg:grid-cols-1 items-start">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60">
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
      </div>

      {/* Job Listings Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:p-6 shadow-xl shadow-black/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Job Listings</h2>
            <p className="text-sm text-slate-400 mt-1">
              Currently showing {Math.min(first + 1, totalRecords)}–{Math.min(first + rows, totalRecords)} of{' '}
              <span className="text-emerald-400 font-medium">{totalRecords.toLocaleString()}</span> active postings
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Controls */}
            <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/80">
              <select
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer px-2"
                value={sortField}
                onChange={(e) => {
                  setFirst(0);
                  setSortField(e.target.value as any);
                }}
              >
                <option value="posting_date">Date Posted</option>
                <option value="salary">Salary</option>
                <option value="company">Company</option>
                <option value="job_title">Job Title</option>
                <option value="industry">Industry</option>
              </select>
              <button
                onClick={() => {
                  setFirst(0);
                  setSortOrder((prev) => (prev === 1 ? -1 : 1));
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title={sortOrder === 1 ? 'Ascending' : 'Descending'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {sortOrder === 1 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  )}
                </svg>
              </button>
            </div>

            {/* Per Page */}
            <select
              className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              value={rows}
              onChange={(e) => {
                setFirst(0);
                setRows(parseInt(e.target.value, 10));
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>
        </div>

        {tableLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">Loading listings...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
            {listings.map((job, idx) => {
              const bgIndex = idx % 3;
              const bgClass =
                bgIndex === 0
                  ? 'from-emerald-950/20 to-transparent'
                  : bgIndex === 1
                  ? 'from-blue-950/20 to-transparent'
                  : 'from-purple-950/20 to-transparent';

              const skillsList = job.skills && typeof job.skills === 'string' 
                  ? (job.skills as string).split(',').filter(s => s.trim() !== '')
                  : Array.isArray(job.skills) ? job.skills : [];

              return (
                <div
                  key={`${job.job_title}-${job.company}-${idx}`}
                  className={`group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/50 bg-gradient-to-br ${bgClass} p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-black`}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z" />
                    </svg>
                  </div>
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-100 text-base leading-tight group-hover:text-emerald-400 transition-colors">
                        {job.job_title}
                      </h3>
                      {job.salary && job.salary !== '0' && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                          {job.salary}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                      <span className="font-medium text-slate-300">{job.company}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span>{job.industry || 'Other'}</span>
                    </div>

                    <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60">
                      <div className="flex flex-wrap gap-1.5">
                        {skillsList.slice(0, 4).map((skillName: string, i: number) => {
                          const sName = skillName.trim();
                          const cat = SKILL_CATEGORIES[sName] || 'Soft Skills / General';
                          const color = CATEGORY_COLORS[cat] || '#8b5cf6';
                          
                          return (
                            <span 
                              key={i} 
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border"
                              style={{ 
                                color: color, 
                                borderColor: `${color}40`, // 25% opacity
                                backgroundColor: `${color}10` // ~6% opacity
                              }}
                            >
                              {sName}
                            </span>
                          );
                        })}
                        {skillsList.length > 4 && (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border border-slate-700 bg-slate-800/50 text-slate-400">
                            +{skillsList.length - 4} more
                          </span>
                        )}
                        {skillsList.length === 0 && (
                          <span className="text-[10px] text-slate-500 italic">No specific skills listed</span>
                        )}
                      </div>
                      <div className="shrink-0 text-[11px] text-slate-500 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(job.posting_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800/60 pt-4">
          <button
            onClick={() => setFirst(Math.max(0, first - rows))}
            disabled={first === 0 || tableLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          <div className="text-sm text-slate-400 hidden sm:block">
            Page {Math.floor(first / rows) + 1} of {Math.ceil(totalRecords / rows)}
          </div>

          <button
            onClick={() => setFirst(first + rows)}
            disabled={first + rows >= totalRecords || tableLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
