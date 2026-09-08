import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, UserRound, Zap, ShieldCheck, Globe, Headphones, Search, ShoppingCart, MessageCircle, CreditCard, Mail, ChevronDown, Star, LayoutDashboard } from 'lucide-react';
import { TelegramIcon, TwitterIcon, FacebookIcon, InstagramIcon, YouTubeIcon, TikTokIcon, WhatsAppIcon } from '../components/SocialIcons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { countries } from '../data/marketplace.js';

export default function Home() {
  const [faqOpen, setFaqOpen] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Signed-in users land in their dashboard; guests go to the register page.
  const go = () => navigate(user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/register');

  return (
    <div>
      {/* ====== HERO ====== */}
      <section id="home" className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-16">
        <div className="bg-[#FFFDF5] border border-[#F5E6A3] rounded-[36px] p-8 md:p-14 lg:p-16 relative overflow-hidden shadow-[0_10px_40px_rgba(212,175,55,0.08)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-6 z-10 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF5C3] border border-[#FFE785] text-[#9E7B00] text-xs font-bold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span> Virtual Numbers &amp; Accounts
              </div>

              <h1 className="font-syne text-[2.8rem] md:text-[4.2rem] leading-[1.08] mb-6 text-[#1A1A1A] font-bold tracking-tight">
                Build Reach. <br />
                <span className="text-[#D4AF37]">Boost Growth.</span>
              </h1>

              <p className="text-[#555555] text-[1.1rem] md:text-[1.2rem] font-normal leading-relaxed mb-10 max-w-[500px]">
                Personalized virtual numbers, real-time OTP delivery, and authentic social accounts — all in one trusted platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                {user ? (
                  <button
                    onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                    className="btn-gold px-8 py-4 text-base font-semibold flex items-center justify-center gap-2.5 rounded-full shadow-lg hover:shadow-xl transition-all"
                  >
                    <LayoutDashboard size={20} strokeWidth={2} />
                    Enter Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => go()}
                      className="btn-gold px-8 py-4 text-base font-semibold rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
                    >
                      Explore Programs &rarr;
                    </button>
                    <button
                      onClick={() => go()}
                      className="bg-white border border-[#E5E7EB] text-[#1A1A1A] px-8 py-4 text-base font-semibold rounded-full hover:bg-gray-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      Browse Accounts &#9654;
                    </button>
                  </>
                )}
              </div>

              {/* Trust badges */}
              <div className="pt-6 border-t border-[#F0E6C2]/60">
                <p className="text-xs uppercase tracking-widest text-[#888888] font-bold mb-4">Trusted by 15,000+ users worldwide</p>
                <div className="flex flex-wrap items-center gap-6 opacity-70">
                  <span className="font-bold text-base text-[#444]">WhatsApp</span>
                  <span className="font-bold text-base text-[#444]">Telegram</span>
                  <span className="font-bold text-base text-[#444]">Facebook</span>
                  <span className="font-bold text-base text-[#444]">Instagram</span>
                  <span className="font-bold text-base text-[#444]">TikTok</span>
                </div>
              </div>
            </div>

            {/* Right Media Column */}
            <div className="lg:col-span-6 relative flex justify-center items-center min-h-[380px] md:min-h-[480px]">
              {/* Decorative Background Shapes */}
              <div className="absolute w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] rounded-full bg-[#FFE785]/60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-2xl pointer-events-none" />
              <div className="absolute w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] rounded-full bg-[#FFD700]/30 -top-6 right-4 pointer-events-none" />
              <div className="absolute w-[180px] h-[180px] rounded-full border-[18px] border-[#FFE785]/40 bottom-4 left-6 pointer-events-none" />

              {/* Product Phone Image */}
              <div className="relative z-10 max-w-[320px] sm:max-w-[400px] md:max-w-[440px] drop-shadow-[0_20px_35px_rgba(0,0,0,0.15)] hover:scale-[1.02] transition-transform duration-500">
                <img
                  src="/phone.png"
                  alt="SpencerSBM Mobile Platform Preview"
                  className="w-full h-auto object-contain mx-auto"
                />
              </div>

              {/* Floating Widget Card */}
              <div className="absolute bottom-6 right-2 sm:right-6 z-20 bg-white/90 backdrop-blur-md border border-[#F0E6C2] rounded-2xl p-4 shadow-xl flex items-center gap-3.5 animate-bounce-slow">
                <div className="w-12 h-12 rounded-xl bg-[#FFF5C3] text-[#D4AF37] flex items-center justify-center font-bold text-xl">
                  ⚡
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#777]">Instant Delivery</div>
                  <div className="text-sm font-bold text-[#1A1A1A]">99.8% Success Rate</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ====== CATEGORY CARDS ====== */}
      <section className="max-w-[1400px] mx-auto my-20 px-4 md:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10">
          <div
            id="virtual-numbers"
            onClick={() => go()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') go();
            }}
            className="card-border relative overflow-hidden p-10 md:p-14 transition-all duration-[0.4s] hover:-translate-y-[10px] animate-fade-in-up cursor-pointer flex flex-col items-start text-left"
          >
            <span className="w-16 h-16 flex items-center justify-center rounded-[18px] bg-[rgba(255,215,0,0.15)] text-[#d4af37] mb-8">
              <Smartphone size={34} strokeWidth={2} />
            </span>
            <h3 className="text-3xl mb-4 font-syne font-bold text-body">Virtual Numbers</h3>
            <p className="text-muted text-[1.05rem] mb-10 leading-relaxed">
              Get instant access to virtual phone numbers from multiple countries. Perfect for verification, business communications, and global operations.
            </p>
            <button
              onClick={() => go()}
              className="btn-gold px-8 py-3.5 text-[0.95rem] hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)]"
            >
              Browse Numbers
            </button>
          </div>

          <div
            id="social-accounts"
            onClick={() => go()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') go();
            }}
            className="card-border relative overflow-hidden p-10 md:p-14 transition-all duration-[0.4s] hover:-translate-y-[10px] animate-fade-in-up cursor-pointer flex flex-col items-start text-left"
          >
            <span className="w-16 h-16 flex items-center justify-center rounded-[18px] bg-[rgba(255,215,0,0.15)] text-[#d4af37] mb-8">
              <UserRound size={34} strokeWidth={2} />
            </span>
            <h3 className="text-3xl mb-4 font-syne font-bold text-body">Social Media Accounts</h3>
            <p className="text-muted text-[1.05rem] mb-10 leading-relaxed">
              Access premium verified social media accounts ready to use. Boost your social presence with authentic, high-quality accounts.
            </p>
            <button onClick={() => go()} className="btn-gold px-8 py-3.5 text-[0.95rem] hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)]">
              Browse Accounts
            </button>
          </div>
        </div>
      </section>

      {/* ====== COUNTRIES WE SUPPORT ====== */}
      <section id="countries" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8">
        <div className="text-center mb-14">
          <p className="text-gold text-[0.8rem] uppercase tracking-[0.25em] font-semibold mb-3">Global Coverage</p>
          <h2 className="font-syne text-[1.8rem] md:text-[2.5rem]">Countries We Support</h2>
          <p className="text-muted text-[1.02rem] font-light mt-4 max-w-[600px] mx-auto">
            Virtual accounts and phone numbers available from top countries around the world.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-5">
          {countries.map((c, i) => (
            <button
              key={c.name}
              onClick={() => go()}
              className="card-border group p-6 text-center hover:-translate-y-[5px] transition-all duration-300"
              style={{ animation: `fadeInUp 0.8s ease ${0.05 * i}s both` }}
            >
              <span className="block text-[2.5rem] mb-3 group-hover:scale-110 transition-transform duration-300">{c.flag}</span>
              <div className="text-[0.95rem] font-bold mb-1 text-body">{c.name}</div>
              <div className="text-muted text-[0.78rem]">Virtual accounts</div>
            </button>
          ))}
        </div>
      </section>

      {/* ====== PLATFORMS WE SUPPORT ====== */}
      <section id="platforms" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8">
        <div className="text-center mb-14">
          <p className="text-gold text-[0.8rem] uppercase tracking-[0.25em] font-semibold mb-3">Wide Compatibility</p>
          <h2 className="font-syne text-[1.8rem] md:text-[2.5rem]">Platforms We Support</h2>
          <p className="text-muted text-[1.02rem] font-light mt-4 max-w-[600px] mx-auto">
            Accounts and numbers available across the world&apos;s most popular social platforms.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-5">
          {[
            { icon: FacebookIcon, name: 'Facebook' },
            { icon: InstagramIcon, name: 'Instagram' },
            { icon: TikTokIcon, name: 'TikTok' },
            { icon: YouTubeIcon, name: 'YouTube' },
            { icon: WhatsAppIcon, name: 'WhatsApp' },
            { icon: TelegramIcon, name: 'Telegram' },
            { icon: TwitterIcon, name: 'Twitter / X' }
          ].map((p, i) => (
            <button
              key={p.name}
              onClick={() => go()}
              className="card-border group p-6 text-center hover:-translate-y-[5px] transition-all duration-300"
              style={{ animation: `fadeInUp 0.8s ease ${0.05 * i}s both` }}
            >
              <span className="inline-flex w-14 h-14 items-center justify-center rounded-[16px] bg-[rgba(255,215,0,0.15)] text-[#d4af37] mb-4 group-hover:scale-110 group-hover:bg-[#d4af37] group-hover:text-black transition-all duration-300">
                <p.icon size={28} />
              </span>
              <div className="text-[0.95rem] font-bold mb-1 text-body">{p.name}</div>
              <div className="text-muted text-[0.78rem]">Accounts &amp; numbers</div>
            </button>
          ))}
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="max-w-[1400px] mx-auto my-24 px-4 md:px-8 py-12 md:py-20 bg-surface2 rounded-[32px]">
        <h2 className="font-syne text-[1.8rem] md:text-[2.5rem] text-center mb-16 text-body">Why Choose SpencerSBM</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {[
            { icon: Zap, title: 'Instant Delivery', desc: 'Get your virtual numbers and accounts delivered instantly after purchase. No waiting, no delays.' },
            { icon: ShieldCheck, title: 'Secure Transactions', desc: 'Your data is protected with industry-leading encryption and security protocols for complete peace of mind.' },
            { icon: Globe, title: 'Global Coverage', desc: 'Access virtual numbers and accounts from across the globe. Connect anywhere, anytime.' },
            { icon: Headphones, title: '24/7 Support', desc: 'Our dedicated support team is available round the clock to help with any questions or issues.' }
          ].map((feature, i) => (
            <div
              key={feature.title}
              className="text-center p-8 md:p-10 card-border bg-card transition-all duration-[0.3s] hover:-translate-y-[5px]"
              style={{ animation: `fadeInUp 0.8s ease ${0.1 * i}s both` }}
            >
              <span className="inline-flex w-[64px] h-[64px] items-center justify-center rounded-[18px] bg-[rgba(255,215,0,0.15)] text-[#d4af37] mb-8 animate-float">
                <feature.icon size={30} strokeWidth={2} />
              </span>
              <h4 className="text-[1.3rem] mb-4 font-bold text-body">{feature.title}</h4>
              <p className="text-muted text-[0.95rem] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section id="how-it-works" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8">
        <div className="text-center mb-14">
          <p className="text-gold text-[0.8rem] uppercase tracking-[0.25em] font-semibold mb-3">Simple Process</p>
          <h2 className="font-syne text-[1.8rem] md:text-[2.5rem]">How It Works</h2>
          <p className="text-muted text-[1.02rem] font-light mt-4 max-w-[600px] mx-auto">
            From browsing to delivery in under five minutes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {[
            { icon: Search, step: '01', title: 'Browse the Marketplace', desc: 'Pick a country and service, or choose a ready-to-use social media account that fits your needs.' },
            { icon: ShoppingCart, step: '02', title: 'Place Your Order', desc: 'Add your delivery email and confirm the order in a few clicks. No complicated checkout.' },
            { icon: CreditCard, step: '03', title: 'Pay Securely', desc: 'Complete your payment instantly. Your details stay encrypted end-to-end.' },
            { icon: Mail, step: '04', title: 'Receive Instantly', desc: 'Your number or account credentials are delivered to your inbox right away.' }
          ].map((s, i) => (
            <div
              key={s.title}
              className="relative card-border p-10 text-center hover:-translate-y-[5px] transition-all duration-300"
              style={{ animation: `fadeInUp 0.8s ease ${0.1 * i}s both` }}
            >
              <span className="absolute top-6 right-8 font-syne text-[2.5rem] font-bold text-softline">{s.step}</span>
              <span className="inline-flex w-[60px] h-[60px] items-center justify-center rounded-[18px] bg-[rgba(255,215,0,0.15)] text-[#d4af37] mb-8">
                <s.icon size={28} strokeWidth={2} />
              </span>
              <h4 className="text-[1.2rem] mb-4 font-bold text-body">{s.title}</h4>
              <p className="text-muted text-[0.95rem] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section id="testimonials" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8">
        <div className="text-center mb-14">
          <p className="text-gold text-[0.8rem] uppercase tracking-[0.25em] font-semibold mb-3">Loved by Users</p>
          <h2 className="font-syne text-[1.8rem] md:text-[2.5rem]">What Our Customers Say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: 'Adaeze O.', role: 'Affiliate Marketer', quote: 'The instant SMS verification numbers saved my whole onboarding flow. Delivery was genuinely instant and support answered within minutes.' },
            { name: 'Marcus T.', role: 'Startup Founder', quote: 'I needed fresh accounts across platforms fast. SpencerSBM delivered everything to my inbox with all credentials intact. Flawless.' },
            { name: 'Lena K.', role: 'Freelancer', quote: 'Clean, professional and so easy to use. I buy Gmail accounts for my clients weekly and the consistent quality never misses.' }
          ].map((t, i) => (
            <div
              key={t.name}
              className="card-border p-10 relative hover:-translate-y-[5px] transition-all duration-300 bg-card"
              style={{ animation: `fadeInUp 0.8s ease ${0.1 * i}s both` }}
            >
              <div className="flex gap-1 text-[#d4af37] mb-6">
                {[0, 1, 2, 3, 4].map((j) => (
                  <Star key={j} size={18} className="fill-[#d4af37]" strokeWidth={1.5} />
                ))}
              </div>
              <p className="text-body text-[1rem] leading-relaxed mb-8">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-full bg-[#d4af37] flex items-center justify-center text-black font-bold text-[1rem]">
                  {t.name.split(' ').map((p) => p[0]).join('')}
                </div>
                <div>
                  <div className="text-[1rem] font-bold text-body">{t.name}</div>
                  <div className="text-muted text-[0.85rem]">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section id="faq" className="max-w-[900px] mx-auto my-24 px-4 md:px-8">
        <div className="text-center mb-14">
          <p className="text-gold text-[0.8rem] uppercase tracking-[0.25em] font-semibold mb-3">Need Help?</p>
          <h2 className="font-syne text-[1.8rem] md:text-[2.5rem]">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {[
            { q: 'How fast is delivery?', a: 'Virtual numbers and social account credentials are delivered instantly to your dashboard immediately after payment is confirmed.' },
            { q: 'Are the social media accounts real?', a: 'Yes. We provide aged, real accounts with working credentials and recovery information. Every account is verified before listing.' },
            { q: 'Can I cancel a virtual number order?', a: 'Absolutely. Active numbers can be cancelled anytime from your dashboard, and multiple numbers can be purchased without any subscription.' },
            { q: 'Is my personal data safe?', a: 'Your data is protected end-to-end with encryption. We never share, sell or store your payment details beyond the transaction.' },
            { q: 'Which payment methods do you accept?', a: 'Fund your wallet via bank transfer to your personal virtual account, OPay, or a US dollar card. Your purchases are then paid straight from your wallet balance.' }
          ].map((f, i) => {
            const open = faqOpen === i;
            return (
              <div
                key={f.q}
                className={`card-border bg-card transition-all duration-300 ${open ? 'border-[#d4af37]/30 shadow-[0_15px_30px_rgba(212,175,55,0.1)]' : ''}`}
              >
                <button
                  onClick={() => setFaqOpen(open ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-8 py-6 text-left"
                  aria-expanded={open}
                >
                  <span className="text-[1.1rem] font-bold text-body">{f.q}</span>
                  <ChevronDown
                    size={22}
                    strokeWidth={2}
                    className={`text-[#d4af37] shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && <p className="px-8 pb-6 text-muted text-[1rem] leading-relaxed">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ====== CONTACT / CTA ====== */}
      <section id="contact" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8">
        <div className="relative overflow-hidden card-border p-12 md:p-20 text-center bg-surface2">
          <div className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[60%] h-[80%] bg-[rgba(255,215,0,0.15)] rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-syne text-[2rem] md:text-[3.2rem] mb-6 text-body">Have Questions? We&apos;re Here 24/7</h2>
            <p className="text-muted text-[1.1rem] font-medium max-w-[600px] mx-auto mb-12">
              Need a bulk quote, a custom account, or just help placing an order? Our support team replies in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <a
                href={`https://wa.me/2349138187814?text=${encodeURIComponent("Hey SpencerSBM, I'm a user on your platform, I have an issue with one of my orders")}`}
                target="_blank"
                rel="noreferrer"
                className="btn-gold px-9 py-4 text-[0.98rem] flex items-center justify-center gap-2 hover:-translate-y-[2px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] w-full sm:w-auto"
              >
                <MessageCircle size={19} strokeWidth={1.8} />
                Chat on WhatsApp
              </a>
              <a
                href="mailto:spencersbm1@hotmail.com"
                className="btn-ghost px-9 py-4 text-[0.98rem] flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Mail size={19} strokeWidth={1.8} />
                Email Support
              </a>
              <a
                href="https://t.me/spencersbm"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost px-9 py-4 text-[0.98rem] flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <TelegramIcon size={19} />
                Join Telegram Group for More Updates
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
