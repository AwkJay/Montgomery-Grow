import { Dispatch, SetStateAction } from 'react';
import type { NavLink } from 'react-router-dom';

const navLinkClasses =
  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800/70';

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

type NavbarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  onNavClick?: () => void;
};

export default function Navbar({
  sidebarOpen,
  setSidebarOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
  onNavClick,
}: NavbarProps) {
  const handleNavClick = () => {
    if (onNavClick) onNavClick();
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:sticky md:top-0 h-screen inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-950/95 md:bg-slate-950/80 backdrop-blur
          transition-all duration-200 ease-in-out
          ${sidebarOpen ? 'md:w-72 w-72' : 'md:w-14 w-0 md:overflow-visible overflow-hidden'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div
          className={`shrink-0 px-4 py-5 border-b border-slate-800 flex items-center ${
            sidebarOpen ? 'justify-between' : 'justify-center'
          }`}
        >
          {sidebarOpen && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-lg font-semibold">
                MG
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight truncate">Montgomery Grow</div>
                <div className="text-xs text-slate-400 truncate">Economic Intelligence Dashboard</div>
              </div>
            </div>
          )}
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
          )}
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {sidebarOpen && (
          <nav
            className="flex-1 px-3 py-4 space-y-1 text-slate-300 overflow-y-auto"
            onClick={handleNavClick}
          >
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
              to="/jobs"
              className={({ isActive }) =>
                `${navLinkClasses} ${isActive ? 'bg-slate-800 text-emerald-400' : ''}`
              }
            >
              Job Postings
            </NavLink>
          </nav>
        )}
      </aside>
    </>
  );
}
