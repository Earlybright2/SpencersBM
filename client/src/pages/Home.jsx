import { useMemo, useState } from 'react';
import { Smartphone, UserRound, Zap, ShieldCheck, Globe, LifeBuoy, Search, ShoppingCart, Wallet, MessageCircle, CreditCard, CheckCircle2, Mail, ChevronDown, Star } from 'lucide-react';
import { countries } from '../data/marketplace.js';
import ServiceModal from '../components/ServiceModal.jsx';
import AccountsModal from '../components/AccountsModal.jsx';
import CheckoutModal from '../components/CheckoutModal.jsx';
import SuccessModal from '../components/SuccessModal.jsx';

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [order, setOrder] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);

  const filteredCountries = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = countries.filter((c) => c.name.toLowerCase().includes(q));
    return filtered.length > 0 ? filtered : countries;
  }, [search]);

  const openCheckout = (product) => setCheckoutProduct(product);

  const handleBuyAccount = (account) => {
    setAccountsOpen(false);
    openCheckout({
      type: 'social_account',
      productName: `${account.platform} Account`,
      platformService: account.platform,
      country: null,
      price: account.price
    });
  };

  const handleSelectService = (service, country) => {
    setSelectedCountry(null);
    openCheckout({
      type: 'virtual_number',
      productName: `${service.name} Virtual Number - ${country.name}`,
      platformService: service.name,
      country: country.name,
      price: country.price
    });
  };

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
          <button
            onClick={() => document.getElementById('virtual-numbers-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-gold px-10 py-4 text-base w-full sm:w-auto max-w-[300px] hover:-translate-y-[3px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)]"
          >
            Buy Virtual Numbers
          </button>
          <button
            onClick={() => setAccountsOpen(true)}
            className="btn-ghost px-10 py-4 text-base w-full sm:w-auto max-w-[300px]"
          >
            Buy Social Media Accounts
          </button>
        </div>
      </section>

      {/* ====== CATEGORY CARDS ====== */}
      <section className="max-w-[1400px] mx-auto my-20 px-4 md:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10">
          <div
            id="virtual-numbers"
            className="card-border relative overflow-hidden rounded-[15px] p-12 md:p-14 bg-gradient-to-br from-gold/5 to-gold/2 backdrop-blur-[10px] transition-all duration-[0.4s] hover:-translate-y-[10px] hover:border-gold/30 hover:shadow-[0_20px_60px_rgba(212,175,55,0.15)] animate-fade-in-up"
          >
            <span className="w-16 h-16 flex items-center justify-center rounded-[14px] bg-gold/10 border border-gold/25 text-gold mb-6">
              <Smartphone size={34} strokeWidth={1.6} />
            </span>
            <h3 className="text-3xl mb-4">Virtual Numbers</h3>
            <p className="text-gray-400 text-[1.05rem] mb-8">
              Get instant access to virtual phone numbers from multiple countries. Perfect for verification, business communications, and global operations.
            </p>
            <button
              onClick={() => document.getElementById('virtual-numbers-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-gold px-8 py-3.5 text-[0.95rem] hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)]"
            >
              Browse Numbers
            </button>
          </div>

          <div
            id="social-accounts"
            className="card-border relative overflow-hidden rounded-[15px] p-12 md:p-14 bg-gradient-to-br from-gold/5 to-gold/2 backdrop-blur-[10px] transition-all duration-[0.4s] hover:-translate-y-[10px] hover:border-gold/30 hover:shadow-[0_20px_60px_rgba(212,175,55,0.15)] animate-fade-in-up"
          >
            <span className="w-16 h-16 flex items-center justify-center rounded-[14px] bg-gold/10 border border-gold/25 text-gold mb-6">
              <UserRound size={34} strokeWidth={1.6} />
            </span>
            <h3 className="text-3xl mb-4">Social Media Accounts</h3>
            <p className="text-gray-400 text-[1.05rem] mb-8">
              Access premium verified social media accounts ready to use. Boost your social presence with authentic, high-quality accounts.
            </p>
            <button onClick={() => setAccountsOpen(true)} className="btn-gold px-8 py-3.5 text-[0.95rem] hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)]">
              Browse Accounts
            </button>
          </div>
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
            { icon: LifeBuoy, title: '24/7 Support', desc: 'Our dedicated support team is available round the clock to help with any questions or issues.' }
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

      {/* ====== VIRTUAL NUMBERS ====== */}
      <section id="virtual-numbers-section" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8">
        <h2 className="font-syne text-[1.8rem] md:text-[2.5rem] text-center mb-12">Virtual Numbers</h2>

        <div className="mb-16 flex justify-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by country..."
            className="w-full max-w-[500px] bg-gold/5 border-[1.5px] border-gold/20 rounded-[50px] px-8 py-4 text-white text-base outline-none focus:border-gold focus:bg-gold/8 focus:shadow-[0_0_30px_rgba(212,175,55,0.2)] placeholder:text-[#707070]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredCountries.map((country) => (
            <div
              key={country.name}
              className="card-border bg-gradient-to-br from-gold/5 to-gold/2 rounded-[12px] p-8 text-center backdrop-blur-[10px] cursor-pointer transition-all duration-[0.3s] hover:-translate-y-[8px] hover:border-gold/30 hover:shadow-[0_15px_40px_rgba(212,175,55,0.15)]"
            >
              <span className="block text-[3.5rem] mb-4">{country.flag}</span>
              <h3 className="text-[1.5rem] mb-2">{country.name}</h3>
              <div className="text-gray-400 text-[0.95rem] mb-6">Virtual phone numbers</div>
              <div className="text-gold font-semibold text-[1.2rem] mb-6">Starting from {country.price}</div>
              <button
                onClick={() => setSelectedCountry(country.name)}
                className="btn-gold w-full px-7 py-3 text-[0.9rem] hover:-translate-y-[2px] hover:shadow-[0_10px_25px_rgba(212,175,55,0.4)]"
              >
                View Services
              </button>
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
            { icon: CreditCard, step: '03', title: 'Pay Securely', desc: 'Complete the simulated payment instantly. Your details stay encrypted end-to-end.' },
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

      {/* ====== PRICING ====== */}
      <section id="pricing" className="max-w-[1400px] mx-auto my-24 px-4 md:px-8 py-12 md:py-16 bg-gradient-to-br from-gold/3 to-gold/1 card-border rounded-[15px] backdrop-blur-[10px]">
        <div className="text-center mb-14">
          <p className="text-gold text-[0.8rem] uppercase tracking-[0.25em] font-semibold mb-3">Transparent Pricing</p>
          <h2 className="font-syne text-[1.8rem] md:text-[2.5rem]">Simple, Honest Plans</h2>
          <p className="text-gray-400 text-[1.02rem] font-light mt-4 max-w-[600px] mx-auto">
            No hidden fees. Pay for exactly what you need, when you need it.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1100px] mx-auto">
          <div className="card-border rounded-[15px] p-8 bg-gold/2 hover:border-gold/30 hover:-translate-y-[5px] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/25 flex items-center justify-center text-gold">
                <Smartphone size={20} strokeWidth={1.8} />
              </span>
              <h3 className="text-lg">Virtual Numbers</h3>
            </div>
            <div className="mb-5">
              <span className="font-syne text-[2.2rem] font-bold text-gold">$0.99</span>
              <span className="text-gray-500 text-[0.9rem]"> / number</span>
              <p className="text-[0.82rem] text-gray-500 mt-1">Starting price, varies by country</p>
            </div>
            <ul className="space-y-2.5 text-[0.9rem] text-gray-300 mb-7">
              {['Instant SMS verification', '12+ countries available', 'Cancel anytime', 'No subscription required'].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 size={16} strokeWidth={1.8} className="text-gold shrink-0 mt-[2px]" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => document.getElementById('virtual-numbers-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-gold w-full py-3.5 text-[0.92rem]"
            >
              Browse Numbers
            </button>
          </div>

          <div className="relative card-border rounded-[15px] p-8 bg-gradient-to-br from-gold to-gold-dark text-night shadow-[0_20px_60px_rgba(212,175,55,0.35)] hover:-translate-y-[5px] transition-all duration-300">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-night text-gold text-[0.7rem] uppercase tracking-[0.15em] font-semibold px-4 py-1.5 rounded-[50px] border border-gold/40">
              Most Popular
            </span>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-10 h-10 rounded-[10px] bg-night/15 flex items-center justify-center text-night">
                <UserRound size={20} strokeWidth={1.8} />
              </span>
              <h3 className="text-lg">Social Accounts</h3>
            </div>
            <div className="mb-5">
              <span className="font-syne text-[2.2rem] font-bold">$4.99</span>
              <span className="text-[0.9rem] text-night/80"> / account</span>
              <p className="text-[0.82rem] text-night/70 mt-1">Instagram, X, TikTok, Gmail &amp; more</p>
            </div>
            <ul className="space-y-2.5 text-[0.9rem] mb-7">
              {['Aged, ready-to-use accounts', 'Full credentials included', 'Recovery info provided', 'Delivered to your email'].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 size={16} strokeWidth={1.8} className="shrink-0 mt-[2px]" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setAccountsOpen(true)}
              className="w-full py-3.5 rounded-[50px] text-[0.92rem] font-semibold bg-night text-gold hover:bg-black transition-all"
            >
              Browse Accounts
            </button>
          </div>

          <div className="card-border rounded-[15px] p-8 bg-gold/2 hover:border-gold/30 hover:-translate-y-[5px] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/25 flex items-center justify-center text-gold">
                <Wallet size={20} strokeWidth={1.8} />
              </span>
              <h3 className="text-lg">Bulk / Custom</h3>
            </div>
            <div className="mb-5">
              <span className="font-syne text-[2.2rem] font-bold text-gold">Custom</span>
              <p className="text-[0.82rem] text-gray-500 mt-1">For teams and high-volume buyers</p>
            </div>
            <ul className="space-y-2.5 text-[0.9rem] text-gray-300 mb-7">
              {['Discounted bulk pricing', 'Dedicated account manager', 'Priority delivery', 'Invoice & receipt support'].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 size={16} strokeWidth={1.8} className="text-gold shrink-0 mt-[2px]" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-ghost w-full py-3.5 text-[0.92rem]"
            >
              Talk to Us
            </button>
          </div>
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
            { q: 'How fast is delivery?', a: 'Virtual numbers and social account credentials are delivered instantly to your email immediately after payment is confirmed.' },
            { q: 'Are the social media accounts real?', a: 'Yes. We provide aged, real accounts with working credentials and recovery information. Every account is verified before listing.' },
            { q: 'Can I cancel a virtual number order?', a: 'Absolutely. Active numbers can be cancelled anytime from your dashboard, and multiple numbers can be purchased without any subscription.' },
            { q: 'Is my personal data safe?', a: 'Your data is protected end-to-end with encryption. We never share, sell or store your payment details beyond the transaction.' },
            { q: 'Which payment methods do you accept?', a: 'Checkout is currently simulated for demo purposes. Full card and crypto payments are coming to production shortly.' }
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
                href="https://wa.me/2348012345678"
                target="_blank"
                rel="noreferrer"
                className="btn-gold px-9 py-4 text-[0.98rem] flex items-center justify-center gap-2 hover:-translate-y-[2px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] w-full sm:w-auto"
              >
                <MessageCircle size={19} strokeWidth={1.8} />
                Chat on WhatsApp
              </a>
              <a
                href="mailto:support@spencersbm.com"
                className="btn-ghost px-9 py-4 text-[0.98rem] flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Mail size={19} strokeWidth={1.8} />
                Email Support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====== MODALS ====== */}
      <ServiceModal
        countryName={selectedCountry}
        onClose={() => setSelectedCountry(null)}
        onSelectService={handleSelectService}
      />
      <AccountsModal open={accountsOpen} onClose={() => setAccountsOpen(false)} onBuy={handleBuyAccount} />
      <CheckoutModal
        open={!!checkoutProduct}
        product={checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        onSuccess={(o) => {
          setOrder(o);
          setSuccessOpen(true);
        }}
      />
      <SuccessModal open={successOpen} order={order} onClose={() => setSuccessOpen(false)} />
    </div>
  );
}