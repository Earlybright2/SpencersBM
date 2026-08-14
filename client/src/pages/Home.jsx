import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, UserRound, Zap, ShieldCheck, Globe, Headphones, Search, ShoppingCart, MessageCircle, CreditCard, Mail, ChevronDown, Star, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { countries } from '../data/marketplace.js';

export default function Home() {
  const [faqOpen, setFaqOpen] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Signed-in users land in their dashboard; guests go to the register page.
  const go = () => navigate(user ? '/dashboard' : '/register');

  return (
    <div>
      {/* ====== HERO ====== */}
      <section id="home" className="max-w-[1400px] mx-auto px-4 md:px-8 pt-24 pb-16 md:py-24 text-center min-h-[80vh] flex flex-col justify-center items-center">
        <h1 className="font-syne text-[2rem] md:text-6xl leading-tight mb-6 animate-fade-in-up">
          Your Trusted Marketplace For{' '}
          <span className="gold-gradient-text">Virtual Numbers &amp; Digital Accounts</span>
        </h1>
        <p className="text-gray-400 text-[1.05rem] md:text-[1.3rem] font-light mb-12 max-w-[700px] animate-fade-in-up">
          Buy virtual phone numbers and premium social media accounts securely with instant delivery.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center flex-wrap items-center animate-fade-in-up w-full sm:w-auto">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-gold px-10 py-4 text-base font-semibold flex items-center justify-center gap-2.5 w-full sm:w-auto max-w-[300px] hover:-translate-y-[3px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.45)]"
            >
              <LayoutDashboard size={20} strokeWidth={2} />
              Enter Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => go()}
                className="btn-gold px-10 py-4 text-base w-full sm:w-auto max-w-[300px] hover:-translate-y-[3px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)]"
              >
                Buy Virtual Numbers
              </button>
              <button
                onClick={() => go()}
                className="btn-ghost px-10 py-4 text-base w-full sm:w-auto max-w-[300px]"
              >
                Buy Social Media Accounts
              </button>
            </>
          )}
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
            className="card-border relative overflow-hidden rounded-[15px] p-12 md:p-14 bg-gradient-to-br from-gold/5 to-gold/2 backdrop-blur-[10px] transition-all duration-[0.4s] hover:-translate-y-[10px] hover:border-gold/30 hover:shadow-[0_20px_60px_rgba(212,175,55,0.15)] animate-fade-in-up cursor-pointer"
          >
            <span className="w-16 h-16 flex items-center justify-center rounded-[14px] bg-gold/10 border border-gold/25 text-gold mb-6">
              <Smartphone size={34} strokeWidth={1.6} />
            </span>
            <h3 className="text-3xl mb-4">Virtual Numbers</h3>
            <p className="text-gray-400 text-[1.05rem] mb-8">
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
            className="card-border relative overflow-hidden rounded-[15px] p-12 md:p-14 bg-gradient-to-br from-gold/5 to-gold/2 backdrop-blur-[10px] transition-all duration-[0.4s] hover:-translate-y-[10px] hover:border-gold/30 hover:shadow-[0_20px_60px_rgba(212,175,55,0.15)] animate-fade-in-up cursor-pointer"
          >
            <span className="w-16 h-16 flex items-center justify-center rounded-[14px] bg-gold/10 border border-gold/25 text-gold mb-6">
              <UserRound size={34} strokeWidth={1.6} />
            </span>
            <h3 className="text-3xl mb-4">Social Media Accounts</h3>
            <p className="text-gray-400 text-[1.05rem] mb-8">
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
          <p className="text-gray-400 text-[1.02rem] font-light mt-4 max-w-[600px] mx-auto">
            Virtual accounts and phone numbers available from top countries around the world.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-5">
          {countries.map((c, i) => (
            <button
              key={c.name}
              onClick={() => go()}
              className="card-border group rounded-[14px] p-6 text-center bg-gradient-to-b from-gold/5 to-gold/1 hover:border-gold/30 hover:bg-gold/5 hover:-translate-y-[5px] transition-all duration-300"
              style={{ animation: `fadeInUp 0.8s ease ${0.05 * i}s both` }}
            >
              <span className="block text-[2.5rem] mb-3 group-hover:scale-110 transition-transform duration-300">{c.flag}</span>
              <div className="text-[0.95rem] font-medium mb-1">{c.name}</div>
              <div className="text-gray-500 text-[0.78rem]">Virtual accounts</div>
            </button>
          ))}
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="max-w-[1400px] mx-auto my-24 px-4 md:px-8 py-8 md:py-16 bg-gradient-to-br from-gold/3 to-gold/1 card-border rounded-[15px] backdrop-blur-[10px]">
        <h2 className="font-syne text-[1.8rem] md:text-[2.5rem] text-center mb-12">Why Choose SpencersBM</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {[
            { icon: Zap, title: 'Instant Delivery', desc: 'Get your virtual numbers and accounts delivered instantly after purchase. No waiting, no delays.' },
            { icon: ShieldCheck, title: 'Secure Transactions', desc: 'Your data is protected with industry-leading encryption and security protocols for complete peace of mind.' },
            { icon: Globe, title: 'Global Coverage', desc: 'Access virtual numbers and accounts from across the globe. Connect anywhere, anytime.' },
            { icon: Headphones, title: '24/7 Support', desc: 'Our dedicated support team is available round the clock to help with any questions or issues.' }
          ].map((feature, i) => (
            <div
              key={feature.title}
              className="text-center p-8 md:p-10 rounded-[12px] bg-gold/2 card-border transition-all duration-[0.3s] hover:border-gold/30 hover:bg-gold/5 hover:-translate-y-[5px]"
              style={{ animation: `fadeInUp 0.8s ease ${0.1 * i}s both` }}
            >
              <span className="inline-flex w-[64px] h-[64px] items-center justify-center rounded-[14px] bg-gold/10 border border-gold/25 text-gold mb-6 animate-float">
                <feature.icon size={30} strokeWidth={1.6} />
              </span>
              <h4 className="text-[1.3rem] mb-4 text-gold">{feature.title}</h4>
              <p className="text-gray-400 text-[0.95rem]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section id="how-it-works" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8">
        <div className="text-center mb-14">
          <p className="text-gold text-[0.8rem] uppercase tracking-[0.25em] font-semibold mb-3">Simple Process</p>
          <h2 className="font-syne text-[1.8rem] md:text-[2.5rem]">How It Works</h2>
          <p className="text-gray-400 text-[1.02rem] font-light mt-4 max-w-[600px] mx-auto">
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
              className="relative card-border rounded-[14px] p-8 text-center bg-gradient-to-b from-gold/5 to-transparent hover:border-gold/30 hover:-translate-y-[5px] transition-all duration-300"
              style={{ animation: `fadeInUp 0.8s ease ${0.1 * i}s both` }}
            >
              <span className="absolute top-5 right-6 font-syne text-[2rem] font-bold text-gold/15">{s.step}</span>
              <span className="inline-flex w-[60px] h-[60px] items-center justify-center rounded-[14px] bg-gold/10 border border-gold/25 text-gold mb-5">
                <s.icon size={28} strokeWidth={1.6} />
              </span>
              <h4 className="text-[1.15rem] mb-3">{s.title}</h4>
              <p className="text-gray-400 text-[0.9rem]">{s.desc}</p>
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
            { name: 'Marcus T.', role: 'Startup Founder', quote: 'I needed fresh accounts across platforms fast. SpencersBM delivered everything to my inbox with all credentials intact. Flawless.' },
            { name: 'Lena K.', role: 'Freelancer', quote: 'Clean, professional and so easy to use. I buy Gmail accounts for my clients weekly and the consistent quality never misses.' }
          ].map((t, i) => (
            <div
              key={t.name}
              className="card-border rounded-[14px] p-8 bg-gradient-to-b from-gold/5 to-transparent relative hover:border-gold/30 transition-all duration-300"
              style={{ animation: `fadeInUp 0.8s ease ${0.1 * i}s both` }}
            >
              <div className="flex gap-1 text-gold mb-5">
                {[0, 1, 2, 3, 4].map((j) => (
                  <Star key={j} size={16} className="fill-gold" strokeWidth={1.5} />
                ))}
              </div>
              <p className="text-gray-300 text-[0.95rem] leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-night font-bold text-[0.95rem]">
                  {t.name.split(' ').map((p) => p[0]).join('')}
                </div>
                <div>
                  <div className="text-[0.95rem] font-medium">{t.name}</div>
                  <div className="text-gray-500 text-[0.8rem]">{t.role}</div>
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
                className={`card-border rounded-[12px] bg-white/2 transition-all duration-300 ${open ? 'border-gold/30 bg-gold/5' : ''}`}
              >
                <button
                  onClick={() => setFaqOpen(open ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-[1.02rem] font-medium">{f.q}</span>
                  <ChevronDown
                    size={20}
                    strokeWidth={1.9}
                    className={`text-gold shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && <p className="px-6 pb-5 text-gray-400 text-[0.92rem] leading-relaxed">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ====== CONTACT / CTA ====== */}
      <section id="contact" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[20px] border border-gold/25 bg-gradient-to-br from-gold/10 via-[#141414] to-[#0a0a0a] p-10 md:p-16 text-center card-border">
          <div className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[60%] h-[80%] bg-gold/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-syne text-[1.8rem] md:text-[2.6rem] mb-4">Have Questions? We&apos;re Here 24/7</h2>
            <p className="text-gray-400 text-[1.02rem] font-light max-w-[560px] mx-auto mb-10">
              Need a bulk quote, a custom account, or just help placing an order? Our support team replies in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <a
                href={`https://wa.me/2349138187814?text=${encodeURIComponent("Hey Spencersbm, I'm a user on your platform, I have an issue with one of my orders")}`}
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
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
