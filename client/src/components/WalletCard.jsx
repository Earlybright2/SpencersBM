import { useState } from 'react';
import { Wallet, Plus, ShieldCheck, Zap, ArrowLeftRight } from 'lucide-react';
import FundWalletModal from './FundWalletModal.jsx';

// Wallet balance is always stored in NGN. The toggle re-displays the same
// balance converted to its live USD equivalent — no separate USD wallet.
export default function WalletCard({ balance, onFunded }) {
  const [fundOpen, setFundOpen] = useState(false);
  const [currency, setCurrency] = useState('NGN');

  const ngn = balance ? Number(balance.balance) || 0 : 0;
  const rate = balance?.usdToNgn || 1500;
  const usd = ngn / rate;

  const primary =
    currency === 'NGN'
      ? `₦${ngn.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
      : `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const secondary =
    currency === 'NGN'
      ? `≈ $${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : `≈ ₦${ngn.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <>
      <div className="card-border rounded-[20px] p-6 md:p-7 bg-wallet relative overflow-hidden shine-overlay">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-56 h-56 bg-black/5 rounded-full blur-[70px] pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-7">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-night/80 font-bold">
                <Wallet size={16} strokeWidth={2.1} /> Wallet Balance
              </span>
              {/* NGN / USD segmented toggle */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-night/10 border border-night/10">
                {['NGN', 'USD'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1 rounded-full text-[0.72rem] font-bold tracking-wide transition-all flex items-center gap-1 ${
                      currency === c
                        ? 'bg-night text-gold shadow-sm'
                        : 'text-night/60 hover:text-night'
                    }`}
                  >
                    {c === currency && <ArrowLeftRight size={11} strokeWidth={2.4} />}
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-3 flex-wrap">
              <span className="font-syne font-bold text-4xl md:text-[3rem] text-night leading-none tabular-nums">
                {primary}
              </span>
              <span className="text-night/55 text-[0.9rem] font-medium mb-1 tabular-nums">{secondary}</span>
            </div>
            <p className="text-night/60 text-[0.86rem] mt-3 max-w-[440px]">
              Fund by bank transfer, OPay, or a US dollar card. Every purchase is paid from this balance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setFundOpen(true)}
              className="btn-dark px-7 py-4 text-[0.95rem] flex items-center justify-center gap-2"
            >
              <Plus size={19} strokeWidth={2.1} /> Fund Wallet
            </button>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-x-8 gap-y-3 mt-7 pt-5 border-t border-night/10 text-[0.82rem]">
          <span className="flex items-center gap-2 text-night/70 font-medium">
            <ShieldCheck size={15} strokeWidth={2} className="text-night" /> Secure payments
          </span>
          <span className="flex items-center gap-2 text-night/70 font-medium">
            <Zap size={15} strokeWidth={2} className="text-night" /> Instant balance
          </span>
          <span className="flex items-center gap-2 text-night/70 font-medium">
            <ArrowLeftRight size={15} strokeWidth={2} className="text-night" /> $1 = ₦{Number(rate).toLocaleString()}
          </span>
        </div>
      </div>

      <FundWalletModal open={fundOpen} onClose={() => setFundOpen(false)} onFunded={onFunded} rate={rate} />
    </>
  );
}
