import { NavLink, Route, Routes } from 'react-router-dom';
import NeighborhoodScore from './pages/NeighborhoodScore';
import BusinessPulse from './pages/BusinessPulse';
import DevelopmentMap from './pages/DevelopmentMap';
import VisitorTrends from './pages/VisitorTrends';
import AdvisorChat from './pages/AdvisorChat';
import JobPostingsDashboard from './pages/JobPostingsDashboard';

const navLinkClasses =
  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800/70';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      <aside className="hidden md:flex md:w-72 flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-lg font-semibold">
              MG
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Montgomery Grow</div>
              <div className="text-xs text-slate-400">Economic Intelligence Dashboard</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-slate-300">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? 'bg-slate-800 text-emerald-400' : ''}`
            }
          >
            Neighborhood Score
          </NavLink>
          <NavLink
            to="/business-pulse"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? 'bg-slate-800 text-emerald-400' : ''}`
            }
          >
            Business Pulse
          </NavLink>
          <NavLink
            to="/development-map"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? 'bg-slate-800 text-emerald-400' : ''}`
            }
          >
            Development Activity
          </NavLink>
          <NavLink
            to="/visitor-trends"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? 'bg-slate-800 text-emerald-400' : ''}`
            }
          >
            Visitor & Population
          </NavLink>
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? 'bg-slate-800 text-emerald-400' : ''}`
            }
          >
            Job Postings
          </NavLink>
          <NavLink
            to="/advisor"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? 'bg-slate-800 text-emerald-400' : ''}`
            }
          >
            AI Economic Advisor
          </NavLink>
        </nav>
        <div className="px-6 pb-4 pt-2 text-xs text-slate-500 border-t border-slate-800">
          Data shown is synthetic for demo purposes and should not be used as official city statistics.
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="w-full border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-semibold tracking-tight text-white">
              Montgomery Grow
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Spot economic opportunity across Montgomery with neighborhood-level intelligence.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs md:text-sm text-slate-400">
            <span className="hidden sm:inline">City focus:</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              Montgomery, Alabama
            </span>
          </div>
        </header>

        <div className="flex-1 w-full px-3 md:px-6 lg:px-8 py-4 md:py-6">
          <Routes>
            <Route path="/" element={<NeighborhoodScore />} />
            <Route path="/business-pulse" element={<BusinessPulse />} />
            <Route path="/development-map" element={<DevelopmentMap />} />
            <Route path="/visitor-trends" element={<VisitorTrends />} />
            <Route path="/jobs" element={<JobPostingsDashboard />} />
            <Route path="/advisor" element={<AdvisorChat />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
