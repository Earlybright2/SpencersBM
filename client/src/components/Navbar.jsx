import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Smartphone, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navLinks = [
  { label: 'Home', to: '/#home' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Register', to: '/register' },
  { label: 'FAQ', to: '/#faq' },
  { label: 'Contact', to: '/#contact' }
];

const pricingDropdown = [
  { label: 'Virtual Numbers', to: '/register', icon: Smartphone },
  { label: 'Social Media Accounts', to: '/register', icon: UserRound }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleAnchor = (to) => {
    setMobileOpen(false);
    const [path, hash] = to.split('#');
    if (hash) {
      if (window.location.pathname !== (path || '/')) {
        navigate('/');
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(to);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-1000 bg-night/95 backdrop-blur-[10px] border-b border-gold/10 px-4 md:px-8 py-4">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <Link to="/" className="gold-text font-syne text-2xl md:text-[1.8rem] font-bold tracking-[-1px]">
          SpencersBM
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) =>
            link.label === 'Pricing' ? (
              <div key={link.label} className="relative group">
                <button
                  onClick={() => handleAnchor(link.to)}
                  className="relative flex items-center gap-1 text-[0.95rem] text-gray-300 font-medium hover:text-white after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[2px] after:bg-gold after:transition-all hover:after:w-full"
                >
                  {link.label}
                  <ChevronDown size={15} strokeWidth={2} className="transition-transform duration-300 group-hover:rotate-180" />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
                  <div className="bg-[#141414] border border-gold/20 rounded-[12px] p-2 min-w-[230px] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                    {pricingDropdown.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleAnchor(item.to)}
                        className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-[8px] text-[0.92rem] text-gray-300 hover:text-gold hover:bg-gold/10 transition-colors"
                      >
                        <span className="text-gold">
                          <item.icon size={17} strokeWidth={1.9} />
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                key={link.label}
                onClick={() => handleAnchor(link.to)}
                className="relative text-[0.95rem] text-gray-300 font-medium hover:text-white after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[2px] after:bg-gold after:transition-all hover:after:w-full"
              >
                {link.label}
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="hidden md:inline-block text-[0.9rem] text-gray-300 font-medium hover:text-gold"
              >
                Dashboard
              </Link>
              <Link
                to="/change-password"
                className="hidden md:inline-block text-[0.9rem] text-gray-300 font-medium hover:text-gold"
              >
                Change Password
              </Link>
              <span className="hidden md:inline-block text-[0.9rem] text-gold">Hi, {user.name.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="btn-ghost px-4 py-2 text-[0.85rem]"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink
                to="/login"
                className="hidden md:inline-block text-[0.9rem] text-gray-300 font-medium hover:text-gold"
              >
                Login
              </NavLink>
              <button
                onClick={() => navigate('/register')}
                className="btn-gold px-5 py-2 text-[0.9rem] hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)]"
              >
                Get Started
              </button>
            </div>
          )}

          <button
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden flex flex-col gap-[5px] p-1"
          >
            <span className={`w-[25px] h-[2px] bg-gold transition-all ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`w-[25px] h-[2px] bg-gold transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`w-[25px] h-[2px] bg-gold transition-all ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden mt-4 px-4 pb-4 flex flex-col gap-4 border-t border-gold/10 pt-4">
          {navLinks.map((link) => (
            <div key={link.label} className="flex flex-col gap-1">
              <button
                onClick={() => handleAnchor(link.to)}
                className="text-gray-300 text-left hover:text-gold py-1 flex items-center gap-2"
              >
                {link.label}
                {link.label === 'Pricing' && (
                  <ChevronDown size={15} strokeWidth={2} className={`text-gold transition-transform duration-300 ${mobileOpen ? 'rotate-180' : ''}`} />
                )}
              </button>
              {link.label === 'Pricing' &&
                pricingDropdown.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleAnchor(item.to)}
                    className="flex items-center gap-3 text-[0.9rem] text-gray-400 text-left pl-6 py-1.5 hover:text-gold"
                  >
                    <item.icon size={15} strokeWidth={1.9} className="text-gold" />
                    {item.label}
                  </button>
                ))}
            </div>
          ))}
          <div className="flex flex-col gap-3 pt-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="text-gray-300 hover:text-gold">
                  Dashboard
                </Link>
                <Link to="/change-password" onClick={() => setMobileOpen(false)} className="text-gray-300 hover:text-gold">
                  Change Password
                </Link>
                <button onClick={handleLogout} className="btn-ghost px-4 py-2">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="text-gray-300 hover:text-gold">
                  Login
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-gold px-5 py-2 text-center">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}