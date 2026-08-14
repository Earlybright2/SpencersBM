import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { TwitterIcon, InstagramIcon, WhatsAppIcon, TelegramIcon } from './SocialIcons.jsx';

const company = [
  { label: 'Home', to: '/' },
  { label: 'Virtual Numbers', to: '/register' },
  { label: 'Social Media Accounts', to: '/register' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'FAQ', to: '/#faq' },
  { label: 'Contact', to: '/#contact' }
];

export default function Footer() {
  const { user } = useAuth();

  const accountLinks = user
    ? [{ label: 'Dashboard', to: '/dashboard' }]
    : [
        { label: 'Login', to: '/login' },
        { label: 'Get Started', to: '/register' }
      ];

  return (
    <footer className="mt-24 border-t border-gold/10 bg-gradient-to-b from-transparent to-[#090909]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-10">
          {/* Brand */}
          <div>
            <Link to="/" className="gold-text font-syne text-2xl font-bold tracking-[-1px]">
              SpencersBM
            </Link>
            <p className="text-gray-400 text-[0.92rem] mt-4 leading-relaxed">
              Your trusted marketplace for virtual numbers, premium social media accounts and
              secure digital solutions — delivered instantly.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[
                { label: 'Twitter', href: '#', icon: TwitterIcon },
                { label: 'Instagram', href: '#', icon: InstagramIcon },
                { label: 'WhatsApp', href: '#', icon: WhatsAppIcon },
                { label: 'Telegram', href: '#', icon: TelegramIcon }
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gold/10 border border-gold/15 text-gold hover:bg-gold hover:text-night transition-all"
                >
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[0.85rem] uppercase tracking-[0.12em] text-gold font-semibold mb-5">
              Marketplace
            </h4>
            <ul className="space-y-3">
              {company.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-gray-400 text-[0.92rem] hover:text-gold transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-[0.85rem] uppercase tracking-[0.12em] text-gold font-semibold mb-5">
              My Account
            </h4>
            <ul className="space-y-3">
              {accountLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-gray-400 text-[0.92rem] hover:text-gold transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[0.85rem] uppercase tracking-[0.12em] text-gold font-semibold mb-5">
              Contact Us
            </h4>
            <ul className="space-y-3 text-gray-400 text-[0.92rem]">
              <li>
                <a href="mailto:support@spencersbm.com" className="hover:text-gold transition-colors">
                  support@spencersbm.com
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gold transition-colors">
                  24/7 Support — WhatsApp & Telegram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gold transition-colors">
                  Help Center
                </a>
              </li>
            </ul>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-6 flex items-stretch gap-0 rounded-full overflow-hidden border border-gold/20 bg-gold/5"
            >
              <input
                type="email"
                placeholder="Email for updates..."
                aria-label="Email for updates"
                className="bg-transparent text-white text-[0.85rem] px-4 py-2.5 outline-none flex-1 min-w-0 placeholder:text-[#707070]"
              />
              <button
                type="submit"
                className="bg-gradient-to-br from-gold to-gold-dark text-night font-semibold text-[0.85rem] px-4 hover:brightness-110 transition-all"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-gold/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[#707070] text-[0.82rem]">
            &copy; {new Date().getFullYear()} SpencersBM. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Terms', 'Privacy', 'Refund Policy'].map((p) => (
              <a key={p} href="#" className="text-[#707070] text-[0.82rem] hover:text-gold transition-colors">
                {p}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}