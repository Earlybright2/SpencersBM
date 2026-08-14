import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Smartphone, UserRound, ReceiptText, Settings, KeyRound, ShoppingBag, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/dashboard?tab=overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/dashboard?tab=numbers', label: 'Numbers', icon: Smartphone },
  { to: '/dashboard?tab=accounts', label: 'Accounts', icon: UserRound },
  { to: '/dashboard?tab=paid-accounts', label: 'Paid Accounts', icon: KeyRound },
  { to: '/dashboard?tab=orders', label: 'Order History', icon: ReceiptText },
  { to: '/dashboard?tab=profile', label: 'Profile', icon: Settings }
];

function isActive(pathname, search, item) {
  if (pathname !== '/dashboard') return false;
  const currentTab = new URLSearchParams(search).get('tab') || 'overview';
  const itemTab = new URLSearchParams(item.to.split('?')[1] || '').get('tab') || 'overview';
  return itemTab === currentTab;
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

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
      <div className="px-6 pt-5 pb-5 border-b border-gold/10">
        <Link to="/" className="gold-text font-syne text-2xl font-bold tracking-[-1px]">
          SpencersBM
        </Link>
        <p className="text-gray-500 text-[0.7rem] uppercase tracking-[0.2em] mt-1">Member Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-[3px] overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-[10px] rounded-[10px] text-[0.9rem] font-medium transition-all ${
              isActive(pathname, search, item)
                ? 'bg-gold/10 text-gold border border-gold/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-gold"><item.icon size={18} strokeWidth={1.9} /></span>
            {item.label}
          </Link>
        ))}

        <div className="pt-2.5 mt-2.5 border-t border-gold/10 space-y-[3px]">
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={onNavigate}
              className="flex items-center gap-3 px-4 py-[10px] rounded-[10px] text-[0.9rem] font-medium text-gray-400 hover:text-white hover:bg-white/5"
            >
              <span className="text-gold"><ShieldCheck size={18} strokeWidth={1.9} /></span>
              Admin Panel
            </Link>
          )}
          <Link
            to="/dashboard?tab=store"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-[10px] rounded-[10px] text-[0.9rem] font-medium transition-all ${
              isActive(pathname, search, { to: '/dashboard?tab=store' })
                ? 'bg-gold/10 text-gold border border-gold/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-gold"><ShoppingBag size={18} strokeWidth={1.9} /></span>
            View Store
          </Link>
        </div>
      </nav>

      <div className="px-3 py-3.5 border-t border-gold/10">
        <div className="flex items-center gap-3 px-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-night font-bold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.9rem] font-medium truncate">{user?.name}</div>
            <div className="text-gray-500 text-[0.75rem] truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center justify-center gap-2 btn-ghost px-4 py-2.5 text-[0.85rem]"
        >
          <LogOut size={18} strokeWidth={1.9} /> Logout
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ title, balance, balanceError, onRetryBalance, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#080808] flex w-full">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-gold/20 bg-gradient-to-b from-[#111111] to-[#0a0a0a] fixed inset-y-0 left-0 z-40 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-[#0b0b0b] border-r border-gold/10 shadow-2xl">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 lg:pl-[260px] min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-[10px] border-b border-gold/10">
          <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="lg:hidden flex flex-col gap-[5px] p-1"
              >
                <span className="w-[24px] h-[2px] bg-gold" />
                <span className="w-[24px] h-[2px] bg-gold" />
                <span className="w-[24px] h-[2px] bg-gold" />
              </button>
              <h1 className="font-syne text-lg md:text-xl truncate">{title}</h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {balance ? (
                <button
                  onClick={onRetryBalance}
                  title="Click to refresh"
                  className="card-border bg-gold/5 rounded-[10px] px-4 py-2 text-right hover:bg-gold/10 transition-colors"
                >
                  <div className="text-[0.65rem] uppercase tracking-wider text-gray-500 leading-none">Wallet</div>
                  <div className="font-syne text-[0.95rem] text-gold leading-tight">
                    {Number(balance.balance).toLocaleString()} <span className="text-[0.7rem]">{balance.currency}</span>
                  </div>
                </button>
              ) : (
                <div>
                  <div className="text-[0.65rem] uppercase tracking-wider text-gray-500">Wallet</div>
                  <div className="text-[0.9rem] text-[#e0645a]">{balanceError || 'Offline'}</div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 md:px-8 py-6 md:py-8 w-full">{children}</main>
      </div>
    </div>
  );
}