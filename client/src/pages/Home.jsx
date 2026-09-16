import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone, Users, TrendingUp, Wallet, ShieldCheck, Zap, Globe, Headphones,
  MessageCircle, Mail, ChevronDown, ArrowRight, ArrowUpRight, Check, Clock,
  Star, Sparkles, BadgeCheck, Lock, LayoutDashboard, Copy
} from 'lucide-react';
import {
  TelegramIcon, TwitterIcon, FacebookIcon, InstagramIcon, YouTubeIcon, TikTokIcon, WhatsAppIcon
} from '../components/SocialIcons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/* ------------------------------------------------------------------ *
 * Small hooks/components for the revamped landing page
 * ------------------------------------------------------------------ */

// Adds `is-visible` to any `.reveal` element as it scrolls into view.
function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Counts from 0 → value once the element scrolls into view.
function Counter({ value, decimals = 0, prefix = '', suffix = '', duration = 1700 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(prefix + (0).toFixed(decimals) + suffix);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const run = () => {
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const current = value * eased;
        const text = decimals
          ? current.toFixed(decimals)
          : Math.round(current).toLocaleString();
        setDisplay(prefix + text + suffix);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) {
      run();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, decimals, prefix, suffix, duration]);

  return <span ref={ref}>{display}</span>;
}

const MARQUEE_PLATFORMS = [
  { icon: WhatsAppIcon, name: 'WhatsApp' },
  { icon: TelegramIcon, name: 'Telegram' },
  { icon: InstagramIcon, name: 'Instagram' },
  { icon: FacebookIcon, name: 'Facebook' },
  { icon: TikTokIcon, name: 'TikTok' },
  { icon: YouTubeIcon, name: 'YouTube' },
  { icon: TwitterIcon, name: 'Twitter / X' }
];

const TESTIMONIALS = [
  { name: 'Adaeze O.', role: 'Affiliate Marketer', quote: 'The OTP numbers land in seconds. My whole onboarding flow runs on SpencerSBM now.' },
  { name: 'Marcus T.', role: 'Startup Founder', quote: 'Needed fresh accounts across platforms fast — every credential arrived intact. Flawless.' },
  { name: 'Lena K.', role: 'Freelancer', quote: 'I buy Gmail accounts for clients weekly. The quality never misses and support is instant.' },
  { name: 'Tunde A.', role: 'Growth Hacker', quote: 'Followers delivery is smooth and the wallet system makes repeat orders effortless.' },
  { name: 'Priya S.', role: 'Agency Owner', quote: 'Wallet funds, one click, delivered. This is the cleanest marketplace I have used.' },
  { name: 'Kwame B.', role: 'Reseller', quote: 'Refunds when a number fails are automatic. That trust is why I keep coming back.' }
];

const FAQS = [
  { q: 'How fast is delivery?', a: 'Virtual numbers and account credentials appear in your dashboard within seconds of a confirmed payment — no manual review, no waiting.' },
  { q: 'Are the social accounts real?', a: 'Yes. Every account ships with working credentials and recovery details, and is checked before it is listed.' },
  { q: 'What if a number never receives its code?', a: 'If the provider closes a number before a usable OTP arrives, your wallet is refunded automatically and you are notified.' },
  { q: 'How do I pay?', a: 'Fund your wallet once via bank transfer to your personal virtual account, OPay, or a USD card — then every order is paid instantly from your balance.' },
  { q: 'Is my data safe?', a: 'Traffic is encrypted end-to-end. We never sell your data and never store card details beyond the transaction.' }
];

/* ------------------------------------------------------------------ */

export default function Home() {
  const [faqOpen, setFaqOpen] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useScrollReveal();

  // Signed-in users land in their dashboard; guests go to the register page.
  const dash = user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/register';
  const go = () => navigate(dash);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="overflow-hidden">
      {/* ==================== HERO ==================== */}
      <section id="home" className="relative">
        {/* animated aurora background */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-gold/25 dark:bg-gold/15 blur-[120px] animate-blob" />
          <div className="absolute top-10 right-[-120px] w-[460px] h-[460px] rounded-full bg-gold/15 dark:bg-gold/10 blur-[120px] animate-blob" style={{ animationDelay: '6s' }} />
          <div className="absolute inset-0 bg-grid opacity-[0.5] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
            {/* Left */}
            <div className="animate-fade-in-up pl-4 md:pl-10 lg:pl-16">
              <span className="inline-flex items-center gap-2 chip !py-2 !px-4 border-gold/30 !bg-gold/10">
                <Sparkles size={14} className="text-gold" />
                <span className="text-body/90 font-semibold">Instant delivery · 15,000+ orders filled</span>
              </span>

              <h1 className="mt-6 text-[2.9rem] leading-[1.04] sm:text-[3.6rem] md:text-[4.4rem] lg:text-[4rem] xl:text-[4.4rem] font-syne font-extrabold tracking-tight text-body whitespace-nowrap">
                Verified numbers.<br />
                Real Accounts.<br />
                <span className="text-gradient-gold">Instant Delivery.</span>
              </h1>

              <p className="mt-6 max-w-[540px] text-[1.05rem] md:text-[1.15rem] leading-relaxed text-muted">
                SpencerSBM is the trusted marketplace for virtual phone numbers, ready-to-use
                social accounts, and real social growth — funded from your wallet and delivered
                to your dashboard the moment you order.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-4">
                {user ? (
                  <button onClick={go} className="btn-gold px-8 py-4 text-base flex items-center justify-center gap-2.5">
                    <LayoutDashboard size={20} strokeWidth={2} /> Enter dashboard
                  </button>
                ) : (
                  <>
                    <button onClick={go} className="btn-gold px-8 py-4 text-base flex items-center justify-center gap-2 group">
                      Create free account
                      <ArrowRight size={19} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => scrollTo('how-it-works')} className="btn-ghost px-8 py-4 text-base flex items-center justify-center gap-2">
                      See how it works
                    </button>
                  </>
                )}
              </div>

              {/* inline trust stats */}
              <div className="mt-11 grid grid-cols-3 gap-4 max-w-[520px]">
                {[
                  { v: <Counter value={60} suffix="+" />, l: 'Countries' },
                  { v: <Counter value={99.8} decimals={1} suffix="%" />, l: 'Success rate' },
                  { v: '~30s', l: 'Avg delivery' }
                ].map((s, i) => (
                  <div key={i} className="text-left">
                    <div className="font-syne text-2xl md:text-[1.9rem] font-bold text-body">{s.v}</div>
                    <div className="text-xs md:text-[0.8rem] text-faint font-medium uppercase tracking-wide mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — floating card cluster (pure CSS, no stock image) */}
            <div className="relative min-h-[440px] md:min-h-[520px] flex items-center justify-center animate-scale-in">
              {/* OTP delivery card */}
              <div className="relative z-20 w-[300px] sm:w-[340px] card-border p-6 animate-float shadow-[var(--tw-shadow-lift)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-gold/15 text-gold grid place-items-center">
                      <WhatsAppIcon size={18} />
                    </span>
                    <div>
                      <div className="text-[0.7rem] text-faint font-semibold uppercase tracking-wide">WhatsApp · 🇬🇧 UK</div>
                      <div className="text-sm font-bold text-body">+44 7•• ••• 219</div>
                    </div>
                  </div>
                  <span className="chip !py-1 !px-2.5 !text-[0.68rem] !bg-gold/10 border-gold/25 text-gold font-bold">LIVE</span>
                </div>
                <div className="mt-5 rounded-2xl bg-field border border-softline p-4">
                  <div className="text-[0.72rem] text-faint font-semibold uppercase tracking-wide mb-2">Verification code</div>
                  <div className="flex items-center justify-between">
                    <div className="font-syne text-3xl font-extrabold tracking-[0.35em] text-body">8 4 2 9</div>
                    <Copy size={16} className="text-gold" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[0.72rem] text-muted">
                  <Clock size={13} className="text-gold" /> Delivered 4 seconds ago
                </div>
              </div>

              {/* account delivered card */}
              <div className="absolute z-10 -bottom-2 right-2 sm:right-0 w-[240px] card-border p-5 animate-bob" style={{ animationDelay: '1.2s' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-gold/15 text-gold grid place-items-center">
                    <InstagramIcon size={18} />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-body">Account delivered</div>
                    <div className="text-[0.72rem] text-faint">Aged · verified</div>
                  </div>
                  <span className="ml-auto w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-500 grid place-items-center">
                    <Check size={14} strokeWidth={3} />
                  </span>
                </div>
                <div className="space-y-1.5 text-[0.78rem]">
                  <div className="flex justify-between"><span className="text-faint">user</span><span className="text-body font-medium">spencer_••••</span></div>
                  <div className="flex justify-between"><span className="text-faint">pass</span><span className="text-body font-medium">•••••••••</span></div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </section>

      {/* ==================== MARQUEE STRIP ==================== */}
      <section className="border-y border-softline bg-surface2/60 py-6">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center gap-6">
          <span className="text-[0.72rem] uppercase tracking-[0.2em] text-faint font-bold shrink-0">
            Works everywhere you do
          </span>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="marquee-track">
              {[...MARQUEE_PLATFORMS, ...MARQUEE_PLATFORMS].map((p, i) => (
                <span key={i} className="inline-flex items-center gap-2.5 mx-6 align-middle text-muted">
                  <p.icon size={22} />
                  <span className="font-semibold text-[0.95rem]">{p.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES APP PREVIEW ==================== */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-20 md:py-28 relative">
        <div className="text-center max-w-[640px] mx-auto mb-16 reveal">
          <p className="text-gold text-[0.78rem] uppercase tracking-[0.25em] font-bold mb-3">Seamless Experience</p>
          <h2 className="font-syne text-[2rem] md:text-[2.8rem] font-bold text-body">Everything you need in one place</h2>
        </div>
        
        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-10 lg:gap-16 items-center">
          {/* Left features */}
          <div className="space-y-10 reveal order-2 lg:order-1">
            <div className="text-center lg:text-right flex flex-col items-center lg:items-end">
              <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-4">
                <Zap size={24} strokeWidth={2} />
              </span>
              <h3 className="font-syne text-xl font-bold text-body mb-2">Instant Access</h3>
              <p className="text-muted text-[0.95rem] leading-relaxed max-w-[280px]">
                No waiting around. Get numbers and accounts delivered immediately.
              </p>
            </div>
            <div className="text-center lg:text-right flex flex-col items-center lg:items-end">
              <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-4">
                <ShieldCheck size={24} strokeWidth={2} />
              </span>
              <h3 className="font-syne text-xl font-bold text-body mb-2">Secure Transactions</h3>
              <p className="text-muted text-[0.95rem] leading-relaxed max-w-[280px]">
                Advanced security keeps your payments and data fully encrypted.
              </p>
            </div>
            <div className="text-center lg:text-right flex flex-col items-center lg:items-end">
              <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-4">
                <Wallet size={24} strokeWidth={2} />
              </span>
              <h3 className="font-syne text-xl font-bold text-body mb-2">Unified Wallet</h3>
              <p className="text-muted text-[0.95rem] leading-relaxed max-w-[280px]">
                Manage all your spending from one simple, rechargeable balance.
              </p>
            </div>
          </div>

          {/* Center Image */}
          <div className="relative flex justify-center reveal order-1 lg:order-2 mx-auto">
            <div aria-hidden className="absolute inset-0 bg-gold/15 blur-[100px] rounded-full pointer-events-none w-full h-[80%] m-auto" />
            <img src="/phone.png" alt="App Preview" className="relative z-10 w-[280px] lg:w-[320px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.35)] object-contain" />
          </div>

          {/* Right features */}
          <div className="space-y-10 reveal order-3">
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
              <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-4">
                <Globe size={24} strokeWidth={2} />
              </span>
              <h3 className="font-syne text-xl font-bold text-body mb-2">Global Reach</h3>
              <p className="text-muted text-[0.95rem] leading-relaxed max-w-[280px]">
                Access phone numbers from over 60 different countries.
              </p>
            </div>
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
              <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-4">
                <Headphones size={24} strokeWidth={2} />
              </span>
              <h3 className="font-syne text-xl font-bold text-body mb-2">24/7 Support</h3>
              <p className="text-muted text-[0.95rem] leading-relaxed max-w-[280px]">
                Our dedicated human support team is always here to help you.
              </p>
            </div>
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
              <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-4">
                <BadgeCheck size={24} strokeWidth={2} />
              </span>
              <h3 className="font-syne text-xl font-bold text-body mb-2">Premium Quality</h3>
              <p className="text-muted text-[0.95rem] leading-relaxed max-w-[280px]">
                Every account and service is tested to guarantee highest quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PRODUCTS — BENTO ==================== */}
      <section id="products" className="max-w-[1400px] mx-auto px-4 md:px-8 py-20 md:py-28">
        <div className="reveal max-w-[640px]">
          <p className="text-gold text-[0.78rem] uppercase tracking-[0.25em] font-bold mb-3">What we offer</p>
          <h2 className="font-syne text-[2rem] md:text-[2.8rem] font-bold text-body leading-tight">
            One wallet. Everything you need to grow.
          </h2>
        </div>

        <div className="mt-12 grid md:grid-cols-4 md:auto-rows-[minmax(0,1fr)] gap-5">
          {/* Big tile — Virtual Numbers */}
          <button
            onClick={go}
            className="reveal group md:col-span-2 md:row-span-2 card-border card-hover text-left p-8 md:p-10 relative overflow-hidden flex flex-col"
          >
            <div aria-hidden className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold/15 blur-3xl group-hover:bg-gold/25 transition-colors" />
            <span className="w-14 h-14 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-6">
              <Smartphone size={28} strokeWidth={2} />
            </span>
            <h3 className="font-syne text-2xl md:text-[1.9rem] font-bold text-body mb-3">Virtual Numbers</h3>
            <p className="text-muted leading-relaxed max-w-[420px]">
              Instant one-time numbers for SMS &amp; OTP verification across 60+ countries. Codes
              stream straight to your dashboard, and unfilled numbers refund themselves.
            </p>
            <ul className="mt-6 space-y-2.5">
              {['WhatsApp, Telegram, Instagram & more', 'Live OTP polling in seconds', 'Auto-refund on no-code'].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[0.92rem] text-body/80">
                  <Check size={16} className="text-gold shrink-0" strokeWidth={2.5} /> {f}
                </li>
              ))}
            </ul>
            <span className="mt-auto pt-8 inline-flex items-center gap-2 text-gold font-semibold">
              Browse numbers <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </span>
          </button>

          {/* Accounts */}
          <button onClick={go} className="reveal group md:col-span-2 card-border card-hover text-left p-8 relative overflow-hidden flex flex-col">
            <div aria-hidden className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/10 blur-2xl" />
            <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-5">
              <Users size={24} strokeWidth={2} />
            </span>
            <h3 className="font-syne text-xl font-bold text-body mb-2">Social Accounts</h3>
            <p className="text-muted text-[0.95rem] leading-relaxed">
              Aged, ready-to-use accounts delivered with full credentials and recovery info — checked before listing.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-gold font-semibold text-[0.92rem]">
              Browse accounts <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </span>
          </button>

          {/* Followers */}
          <button onClick={go} className="reveal group card-border card-hover text-left p-8 flex flex-col">
            <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-5">
              <TrendingUp size={24} strokeWidth={2} />
            </span>
            <h3 className="font-syne text-xl font-bold text-body mb-2">Growth &amp; Engagement</h3>
            <p className="text-muted text-[0.95rem] leading-relaxed">
              Real followers, likes and views with drip-feed and refill — priced per 1,000.
            </p>
            <span className="mt-auto pt-5 inline-flex items-center gap-2 text-gold font-semibold text-[0.92rem]">
              Explore <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </span>
          </button>

          {/* Wallet */}
          <div className="reveal card-border p-8 flex flex-col bg-surface2">
            <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center mb-5">
              <Wallet size={24} strokeWidth={2} />
            </span>
            <h3 className="font-syne text-xl font-bold text-body mb-2">Instant Wallet</h3>
            <p className="text-muted text-[0.95rem] leading-relaxed">
              Fund once via transfer, OPay or USD card. Every order pays straight from your balance.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== STATS BAND ==================== */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 pb-8">
        <div className="reveal card-border bg-surface2 relative overflow-hidden px-6 md:px-12 py-12">
          <div aria-hidden className="absolute inset-0 bg-dots opacity-60 pointer-events-none" />
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { v: <Counter value={15000} suffix="+" />, l: 'Orders delivered' },
              { v: <Counter value={60} suffix="+" />, l: 'Countries covered' },
              { v: <Counter value={99.8} decimals={1} suffix="%" />, l: 'Delivery success' },
              { v: '24/7', l: 'Human support' }
            ].map((s, i) => (
              <div key={i}>
                <div className="font-syne text-[2.2rem] md:text-[3rem] font-extrabold text-gradient-gold leading-none">{s.v}</div>
                <div className="mt-2 text-[0.82rem] uppercase tracking-wide text-muted font-semibold">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS — TIMELINE ==================== */}
      <section id="how-it-works" className="max-w-[1400px] mx-auto px-4 md:px-8 py-20 md:py-28">
        <div className="reveal text-center max-w-[640px] mx-auto mb-16">
          <p className="text-gold text-[0.78rem] uppercase tracking-[0.25em] font-bold mb-3">Simple process</p>
          <h2 className="font-syne text-[2rem] md:text-[2.8rem] font-bold text-body">From order to delivery in one minute</h2>
        </div>

        <div className="relative grid md:grid-cols-4 gap-8 md:gap-6">
          {/* connective line (desktop) */}
          <div aria-hidden className="hidden md:block absolute top-7 left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-gold/10 via-gold/50 to-gold/10" />
          {[
            { icon: Wallet, t: 'Fund your wallet', d: 'Top up once via transfer, OPay or card. Your balance is ready for every order.' },
            { icon: Smartphone, t: 'Pick a product', d: 'Choose a number, an account, or a growth service that fits what you need.' },
            { icon: Zap, t: 'Order in one click', d: 'Pay instantly from your wallet — no re-entering card details, no checkout maze.' },
            { icon: BadgeCheck, t: 'Get it instantly', d: 'Codes and credentials arrive in your dashboard within seconds.' }
          ].map((s, i) => (
            <div key={s.t} className="reveal relative text-center" style={{ transitionDelay: `${i * 90}ms` }}>
              <div className="relative z-10 mx-auto w-14 h-14 rounded-2xl bg-card border border-gold/30 text-gold grid place-items-center shadow-[var(--tw-shadow-card)]">
                <s.icon size={24} strokeWidth={2} />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gold text-night text-[0.72rem] font-extrabold grid place-items-center">{i + 1}</span>
              </div>
              <h4 className="mt-5 font-syne text-lg font-bold text-body">{s.t}</h4>
              <p className="mt-2 text-[0.92rem] text-muted leading-relaxed max-w-[240px] mx-auto">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== WHY CHOOSE — SPLIT ==================== */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="reveal">
            <p className="text-gold text-[0.78rem] uppercase tracking-[0.25em] font-bold mb-3">Why SpencerSBM</p>
            <h2 className="font-syne text-[2rem] md:text-[2.8rem] font-bold text-body leading-tight">
              Built to be fast, safe and genuinely reliable.
            </h2>
            <p className="mt-4 text-muted leading-relaxed max-w-[520px]">
              Every part of the platform is designed around one promise: you get exactly what you
              paid for, the instant you pay for it — or your money comes back.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-6">
              {[
                { icon: Zap, t: 'Instant delivery', d: 'No waiting rooms. Orders fulfil in seconds.' },
                { icon: ShieldCheck, t: 'Encrypted & secure', d: 'End-to-end protection on every transaction.' },
                { icon: Globe, t: 'Global coverage', d: 'Numbers and accounts from 60+ countries.' },
                { icon: Wallet, t: 'Auto-refunds', d: 'Failed numbers credit your wallet automatically.' },
                { icon: Headphones, t: '24/7 support', d: 'Real humans on WhatsApp & Telegram.' },
                { icon: Lock, t: 'Private by default', d: 'We never sell or store your sensitive data.' }
              ].map((f) => (
                <div key={f.t} className="flex gap-3.5">
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-gold/15 text-gold grid place-items-center">
                    <f.icon size={19} strokeWidth={2} />
                  </span>
                  <div>
                    <h4 className="font-bold text-body text-[0.98rem]">{f.t}</h4>
                    <p className="text-muted text-[0.86rem] leading-snug mt-0.5">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* visual: mock order / rating card */}
          <div className="reveal relative">
            <div aria-hidden className="absolute -inset-6 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative card-border p-8 shadow-[var(--tw-shadow-lift)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-gold text-night grid place-items-center font-syne font-extrabold">S</span>
                  <div>
                    <div className="font-bold text-body">SpencerSBM</div>
                    <div className="text-[0.78rem] text-faint">Excellent · 4.9 / 5</div>
                  </div>
                </div>
                <div className="flex gap-0.5 text-gold">
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} className="fill-gold" strokeWidth={0} />)}
                </div>
              </div>

              {[
                { icon: Smartphone, label: 'UK WhatsApp number', status: 'Delivered', t: '4s' },
                { icon: Users, label: 'Instagram account', status: 'Delivered', t: '2s' },
                { icon: TrendingUp, label: '1,000 followers', status: 'Processing', t: 'live' }
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 py-3.5 border-t border-softline">
                  <span className="w-9 h-9 rounded-xl bg-field text-gold grid place-items-center"><row.icon size={17} /></span>
                  <span className="text-[0.9rem] font-medium text-body flex-1">{row.label}</span>
                  <span className={`text-[0.72rem] font-bold px-2.5 py-1 rounded-full ${row.status === 'Delivered' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-gold/15 text-gold'}`}>
                    {row.status}
                  </span>
                  <span className="text-[0.75rem] text-faint w-8 text-right">{row.t}</span>
                </div>
              ))}

              <div className="mt-6 rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-night p-4 flex items-center justify-between">
                <div>
                  <div className="text-[0.72rem] font-semibold uppercase tracking-wide opacity-80">Total delivered today</div>
                  <div className="font-syne text-2xl font-extrabold">1,284 orders</div>
                </div>
                <BadgeCheck size={34} strokeWidth={1.8} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS — WALL ==================== */}
      <section id="testimonials" className="py-20 md:py-28">
        <div className="reveal text-center max-w-[640px] mx-auto px-4 mb-14">
          <p className="text-gold text-[0.78rem] uppercase tracking-[0.25em] font-bold mb-3">Loved by users</p>
          <h2 className="font-syne text-[2rem] md:text-[2.8rem] font-bold text-body">Thousands grow with SpencerSBM</h2>
        </div>

        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="marquee-track py-2">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className="inline-flex flex-col align-top w-[330px] whitespace-normal mx-3 card-border p-7 text-left">
                <div className="flex gap-0.5 text-gold mb-4">
                  {[0, 1, 2, 3, 4].map((j) => <Star key={j} size={15} className="fill-gold" strokeWidth={0} />)}
                </div>
                <p className="text-body text-[0.95rem] leading-relaxed mb-6">“{t.quote}”</p>
                <div className="flex items-center gap-3 mt-auto">
                  <span className="w-10 h-10 rounded-full bg-gold text-night grid place-items-center font-bold text-sm">
                    {t.name.split(' ').map((p) => p[0]).join('')}
                  </span>
                  <div>
                    <div className="text-[0.92rem] font-bold text-body">{t.name}</div>
                    <div className="text-[0.78rem] text-muted">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ — TWO COLUMN ==================== */}
      <section id="faq" className="max-w-[1400px] mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="grid lg:grid-cols-[0.9fr_1.4fr] gap-10 lg:gap-16">
          <div className="reveal lg:sticky lg:top-28 self-start">
            <p className="text-gold text-[0.78rem] uppercase tracking-[0.25em] font-bold mb-3">Need help?</p>
            <h2 className="font-syne text-[2rem] md:text-[2.6rem] font-bold text-body leading-tight">Questions, answered.</h2>
            <p className="mt-4 text-muted leading-relaxed">
              Can’t find what you’re looking for? Our team replies in minutes.
            </p>
            <a
              href={`https://wa.me/2349138187814?text=${encodeURIComponent("Hey SpencerSBM, I have a question before I get started")}`}
              target="_blank" rel="noreferrer"
              className="mt-6 btn-ghost px-6 py-3 inline-flex items-center gap-2 text-[0.92rem]"
            >
              <MessageCircle size={17} /> Chat on WhatsApp
            </a>
          </div>

          <div className="space-y-3.5">
            {FAQS.map((f, i) => {
              const open = faqOpen === i;
              return (
                <div key={f.q} className={`reveal card-border overflow-hidden transition-all ${open ? 'border-gold/40' : ''}`}>
                  <button
                    onClick={() => setFaqOpen(open ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-[1.02rem] font-bold text-body">{f.q}</span>
                    <ChevronDown size={20} strokeWidth={2.2} className={`text-gold shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-muted leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section id="contact" className="max-w-[1400px] mx-auto px-4 md:px-8 pb-24">
        <div className="reveal relative overflow-hidden rounded-[32px] border border-gold/30 bg-gradient-to-br from-gold/15 via-surface2 to-surface2 px-6 py-16 md:p-20 text-center">
          <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-[70%] h-[80%] bg-gold/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative">
            <h2 className="font-syne text-[2.1rem] md:text-[3.4rem] font-extrabold text-body leading-tight">
              Ready when you are.
            </h2>
            <p className="mt-4 text-muted text-[1.05rem] md:text-[1.15rem] max-w-[560px] mx-auto">
              Create your free account, fund your wallet, and get your first number or account
              delivered in the next minute.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={go} className="btn-gold px-9 py-4 text-base flex items-center justify-center gap-2 group">
                {user ? 'Go to dashboard' : 'Get started free'}
                <ArrowRight size={19} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href={`https://wa.me/2349138187814?text=${encodeURIComponent("Hey SpencerSBM, I'd like to place an order")}`}
                target="_blank" rel="noreferrer"
                className="btn-ghost px-9 py-4 text-base flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} /> Talk to us
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-muted text-[0.9rem]">
              <a href="mailto:spencersbm1@hotmail.com" className="inline-flex items-center gap-2 hover:text-gold transition-colors">
                <Mail size={16} /> spencersbm1@hotmail.com
              </a>
              <a href="https://t.me/spencersbm" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-gold transition-colors">
                <TelegramIcon size={16} /> Join our Telegram
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
