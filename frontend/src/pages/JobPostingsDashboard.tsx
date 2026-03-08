import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

type JobSkillDemand = {
  skill: string;
  count: number;
};

type JobListing = {
  job_title: string;
  company: string;
  industry: string;
  salary: string;
  location: string;
  posting_date: string;
  skills: string[];
};

export default function JobPostingsDashboard() {
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [trends, setTrends] = useState<JobTrendPoint[]>([]);
  const [skills, setSkills] = useState<JobSkillDemand[]>([]);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, trendsRes, skillsRes, listingsRes] = await Promise.all([
          fetch(`${API_BASE}/api/jobs/summary`),
          fetch(`${API_BASE}/api/jobs/trends`),
          fetch(`${API_BASE}/api/jobs/skills`),
          fetch(`${API_BASE}/api/jobs/listings`),
        ]);

        if (!summaryRes.ok || !trendsRes.ok || !skillsRes.ok || !listingsRes.ok) {
          throw new Error('Failed to load job analytics');
        }

        const summaryJson = (await summaryRes.json()) as JobSummary;
        const trendsJson = (await trendsRes.json()) as JobTrendPoint[];
        const skillsJson = (await skillsRes.json()) as JobSkillDemand[];
        const listingsJson = (await listingsRes.json()) as JobListing[];

        setSummary(summaryJson);
        setTrends(trendsJson);
        setSkills(skillsJson);
        setListings(listingsJson);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most In-Demand Skills */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Most In-Demand Skills</h2>
              <p className="text-xs text-slate-400">
                Skills requested most frequently across recent postings.
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
                />
                <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                Relative demand by industry based on the current job listings.
              </p>
            </div>
          </div>
          <IndustryChart listings={listings} />
        </div>

        {/* Workforce Insights Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">Workforce Insights</h2>
          <p className="text-xs text-slate-400 mb-1">
            Static sample insights that mimic what an AI analysis layer would surface from live job
            data.
          </p>
          <InsightCard
            title="Healthcare demand is accelerating"
            body="Healthcare hiring increased roughly 22% this quarter, led by nursing and clinical support roles concentrated around the downtown medical district."
          />
          <InsightCard
            title="Python at the center of tech roles"
            body="Python appears in the majority of recent technology postings, especially in data, analytics, and full‑stack engineering roles integrating with cloud services."
          />
          <InsightCard
            title="Excel still matters for operations"
            body="Excel remains a baseline expectation for supervisors and managers in retail, manufacturing, and back‑office functions across the city."
          />
        </div>
      </div>

      {/* Job Listings Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Job Listings</h2>
            <p className="text-xs text-slate-400">
              Mock job postings representing current hiring demand across Montgomery.
            </p>
          </div>
          {summary && (
            <div className="text-[11px] text-slate-500">
              Showing {listings.length} of {summary.total_jobs} postings
            </div>
          )}
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Job Title</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Industry</th>
                <th className="px-3 py-2 font-medium">Salary</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Posting Date</th>
                <th className="px-3 py-2 font-medium">Key Skills</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((job, idx) => (
                <tr
                  key={`${job.company}-${job.job_title}-${idx}`}
                  className="border-t border-slate-800/80 hover:bg-slate-900/80"
                >
                  <td className="px-3 py-2 text-slate-100">{job.job_title}</td>
                  <td className="px-3 py-2 text-slate-200">{job.company}</td>
                  <td className="px-3 py-2 text-slate-300">{job.industry}</td>
                  <td className="px-3 py-2 text-emerald-300">{job.salary}</td>
                  <td className="px-3 py-2 text-slate-300">{job.location}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {new Date(job.posting_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-slate-200">
                    <div className="flex flex-wrap gap-1">
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-[11px]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  listings: JobListing[];
};

function IndustryChart({ listings }: IndustryChartProps) {
  const counts: Record<string, number> = {};
  for (const job of listings) {
    counts[job.industry] = (counts[job.industry] || 0) + 1;
  }
  const data = Object.entries(counts)
    .map(([industry, count]) => ({ industry, count }))
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


