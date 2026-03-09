import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import NeighborhoodScore from './pages/NeighborhoodScore';
import BusinessPulse from './pages/BusinessPulse';
import DevelopmentMap from './pages/DevelopmentMap';
import AdvisorChat from './pages/AdvisorChat';
import JobPostingsDashboard from './pages/JobPostingsDashboard';
import Navbar from './components/Navbar';

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      <Navbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="w-full border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="md:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors"
              onClick={() => setMobileMenuOpen((o) => !o)}
              title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="hidden md:flex p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors"
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold tracking-tight text-white">
                Montgomery Grow
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Spot economic opportunity across Montgomery with neighborhood-level intelligence.
              </p>
            </div>
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
            <Route path="/jobs" element={<JobPostingsDashboard />} />
            <Route path="/advisor" element={<AdvisorChat />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
