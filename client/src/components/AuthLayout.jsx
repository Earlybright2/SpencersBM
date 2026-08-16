import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Globe, Headphones, Star } from 'lucide-react';

const benefits = [
  { icon: Zap, text: 'Instant delivery of numbers & accounts' },
  { icon: ShieldCheck, text: 'Secure, encrypted transactions' },
  { icon: Globe, text: 'Global coverage in 12+ countries' },
  { icon: Headphones, text: '24/7 human support' }
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex bg-page relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-gold/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] bg-gold-dark/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Left branding panel (desktop) */}
      <aside className="hidden lg:flex flex-col justify-between w-[44%] shrink-0 p-12 xl:p-16 relative border-r border-gold/10 bg-gradient-to-br from-surface1 to-page overflow-hidden">
        <Link to="/" className="gold-text font-syne text-3xl font-bold tracking-[-1.5px] hover:scale-105 transition-transform inline-block w-fit">
          SpencerSBM
        </Link>

        <div>
          <h2 className="font-syne text-[2.4rem] xl:text-[2.9rem] leading-[1.15] mb-4">
            Your trusted marketplace for{' '}
            <span className="gold-gradient-text">virtual numbers &amp; digital accounts</span>
          </h2>
          <p className="text-muted text-[1.02rem] font-light mb-10 max-w-[440px]">
            Buy verification numbers and premium social accounts securely, with instant delivery to your inbox.
          </p>
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b.text} className="flex items-center gap-3 text-[0.95rem] text-body/80">
                <span className="w-9 h-9 shrink-0 rounded-[10px] bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                  <b.icon size={17} strokeWidth={1.9} />
                </span>
                {b.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 text-[0.85rem] text-faint">
          <div className="flex gap-0.5 text-gold">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={15} className="fill-gold" strokeWidth={1.5} />
            ))}
          </div>
          Trusted by 2,000+ users worldwide
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 relative">
        <div className="w-full max-w-[440px] relative z-10 animate-fade-in-up">
          <Link
            to="/"
            className="lg:hidden gold-text font-syne text-[2rem] font-bold tracking-[-1.5px] block text-center mb-10 hover:scale-105 transition-transform"
          >
            SpencerSBM
          </Link>
          <h1 className="font-syne text-3xl md:text-[2.2rem] text-body text-center">{title}</h1>
          {subtitle && <p className="text-muted text-[1rem] mt-3 font-light text-center">{subtitle}</p>}

          <div className="bg-surface1/85 border border-gold/20 rounded-[24px] p-7 md:p-9 mt-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}