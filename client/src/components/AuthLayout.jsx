import { Link } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Zap, Headphones, CheckCircle2 } from 'lucide-react';

const features = [
  {
    title: 'Marketplace & Services',
    desc: 'Use digital accounts plus focused eSIM, virtual numbers, growth, and proxy service areas.'
  },
  {
    title: 'Clear Service Flows',
    desc: 'Each service keeps its selection, delivery, order, and support details together.'
  },
  {
    title: 'One SpencerSBM Account',
    desc: 'Manage eligible purchases, orders, reseller tools, and affiliate activity in one place.'
  },
  {
    title: 'Direct Next Steps',
    desc: 'Your dashboard is designed to show where to go and what happens next.'
  }
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FFFFFF] text-[#1A1A1A]">
      
      {/* Left Info Panel - Radiant Gold Aesthetic */}
      <div className="lg:w-[45%] bg-gradient-to-br from-[#FFFdf5] via-[#FFF5C3] to-[#FFE785] text-[#1A1A1A] p-8 md:p-14 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0 border-r border-[#F0E6C2]">
        {/* Subtle Decorative Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FFD700]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3 font-syne text-2xl font-bold tracking-tight text-[#1A1A1A] mb-16">
            <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#FFD700] font-black text-lg shadow-md">
              S
            </div>
            <span>SpencerSBM</span>
          </Link>

          {/* Heading */}
          <h2 className="font-syne text-[2.2rem] md:text-[2.8rem] font-bold leading-[1.15] mb-4 text-[#1A1A1A]">
            Your access to digital <br />
            <span className="text-[#9E7B00]">accounts and services</span> starts here
          </h2>
          <p className="text-[#555555] text-[1rem] md:text-[1.05rem] font-medium leading-relaxed mb-12 max-w-[480px]">
            Create your account first, then explore instant virtual numbers and high-quality social media accounts.
          </p>

          {/* Feature List */}
          <div className="space-y-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white border border-[#F0E6C2] shadow-sm flex items-center justify-center text-[#9E7B00] shrink-0 mt-0.5">
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[#1A1A1A] font-bold text-[0.98rem] mb-1">{f.title}</h4>
                  <p className="text-[#666666] text-sm leading-relaxed max-w-[420px] font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 mt-16 pt-8 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs text-[#555555] font-semibold">
          <span>&copy; {new Date().getFullYear()} SpencerSBM Inc.</span>
          <span className="flex items-center gap-1.5 text-[#9E7B00]">
            <ShieldCheck size={16} /> 256-bit SSL Encryption
          </span>
        </div>
      </div>

      {/* Right Form Container Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16 bg-[#FFFFFF]">
        <div className="w-full max-w-[440px]">
          
          <div className="mb-10 text-left">
            <h1 className="font-syne text-3xl md:text-[2.5rem] font-bold text-[#1A1A1A] tracking-tight mb-3">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[#666666] text-base leading-relaxed font-medium">
                {subtitle}
              </p>
            )}
          </div>

          {/* Removed the container wrapper around children as requested */}
          {children}

        </div>
      </div>

    </div>
  );
}