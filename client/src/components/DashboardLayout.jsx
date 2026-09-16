import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, LayoutGrid, MessageSquare, TrendingUp,
  Package, Settings, ArrowLeftRight, LogOut, ShieldCheck, ChevronRight, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// New information architecture (see design ref): Explore / Services / Account.
// Routing keeps the existing `?tab=` pattern the dashboard already reads.
const sections = [
  {
    label: 'Explore',
    items: [
      { tab: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { tab: 'marketplace', label: 'Marketplace', icon: Store },
      { tab: 'categories', label: 'Account Categories', icon: LayoutGrid }
    ]
  },
  {
    label: 'Services',
    items: [
      { tab: 'sms', label: 'SMS Verification', icon: MessageSquare, badge: 'NEW' },
      { tab: 'followers', label: 'Followers Growth', icon: TrendingUp, badge: 'NEW' }
    ]
  },
  {
    label: 'Account',
    items: [
      { tab: 'orders', label: 'My Orders', icon: Package },
      { tab: 'profile', label: 'Profile', icon: Settings },
      { tab: 'transactions', label: 'Transaction History', icon: ArrowLeftRight }
    ]
  }
];

function currentTab(pathname, search) {
  if (pathname !== '/dashboard') return null;
  return new URLSearchParams(search).get('tab') || 'overview';
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const active = currentTab(pathname, search);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-gold-light to-gold-dark text-night flex items-center justify-center font-syne font-bold text-lg shadow-[0_6px_18px_rgba(255,199,0,0.4)] group-hover:scale-105 transition-transform">
            S
          </span>
          <span className="font-syne text-xl font-bold tracking-[-0.5px]">SpencerSBM</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-faint">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = active === item.tab;
                return (
                  <Link
                    key={item.tab}
                    to={`/dashboard?tab=${item.tab}`}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-3 px-3 py-[9px] rounded-[12px] text-[0.9rem] font-medium transition-all ${
                      isActive
                        ? 'bg-gold text-night shadow-[0_8px_20px_rgba(255,199,0,0.32)]'
                        : 'text-muted hover:text-body hover:bg-hover'
                    }`}
                  >
                    <item.icon
                      size={18}
                      strokeWidth={1.9}
                      className={isActive ? 'text-night' : 'text-gold'}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={
                          isActive
                            ? 'text-[0.55rem] font-extrabold tracking-wider bg-night/15 text-night px-1.5 py-0.5 rounded-full'
                            : 'badge-new'
                        }
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight size={15} strokeWidth={2.4} className="text-night/70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {user?.role === 'admin' && (
          <div>
            <div className="px-3 mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-faint">
              Staff
            </div>
            <Link
              to="/admin"
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-[9px] rounded-[12px] text-[0.9rem] font-medium text-muted hover:text-body hover:bg-hover transition-all"
            >
              <ShieldCheck size={18} strokeWidth={1.9} className="text-gold" />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-softline">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-light to-gold-dark flex items-center justify-center text-night font-bold text-[0.85rem] shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.88rem] font-semibold truncate">{user?.name}</div>
            <div className="text-faint text-[0.72rem] truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center justify-center gap-2 btn-ghost px-4 py-2.5 text-[0.85rem]"
        >
          <LogOut size={17} strokeWidth={1.9} /> Logout
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ title, subtitle, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen app-bg flex w-full">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[264px] shrink-0 border-r border-softline bg-sidebar fixed inset-y-0 left-0 z-40 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-sidebar border-r border-softline shadow-2xl animate-[rise_0.3s_ease]">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 lg:pl-[264px] min-w-0">
        <header className="sticky top-0 z-30 glass border-b border-softline">
          <div className="flex items-center justify-between gap-4 px-4 md:px-7 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="lg:hidden flex flex-col gap-[5px] p-1"
              >
                <span className="w-[24px] h-[2px] bg-gold rounded-full" />
                <span className="w-[24px] h-[2px] bg-gold rounded-full" />
                <span className="w-[24px] h-[2px] bg-gold rounded-full" />
              </button>
              <div className="min-w-0">
                <h1 className="font-syne text-lg md:text-xl font-bold truncate leading-tight">{title}</h1>
                {subtitle && <p className="text-faint text-[0.78rem] truncate hidden sm:block">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/dashboard?tab=marketplace"
                className="hidden md:flex items-center gap-1.5 chip hover:border-gold/50 transition-colors"
              >
                <Sparkles size={14} strokeWidth={2} className="text-gold" />
                Marketplace
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="px-4 md:px-8 py-6 md:py-8 w-full max-w-[1280px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
