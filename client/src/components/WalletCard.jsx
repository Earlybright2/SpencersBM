import { useEffect, useState } from 'react';
import { Wallet, Plus, ShieldCheck, Zap, Star, Copy, Check, Landmark } from 'lucide-react';
import FundWalletModal from './FundWalletModal.jsx';

export default function WalletCard({ balance, onFunded }) {
  const [fundOpen, setFundOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const symbol = balance?.currency === 'USD' ? '$' : '\u20A6';
  const formatted = balance ? Number(balance.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00';

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText('0838174296');
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className="card-border rounded-[15px] p-6 md:p-7 bg-gradient-to-br from-gold/8 via-[#141414]/95 to-[#0c0c0c] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-56 h-56 bg-gold/5 rounded-full blur-[70px] pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-7">
          <div>
            <div className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-gold font-semibold mb-4">
              <Wallet size={16} strokeWidth={1.9} /> Wallet Balance
            </div>
            <div className="flex items-end gap-2.5">
              <span className="font-syne font-bold text-4xl md:text-[3rem] gold-gradient-text leading-none">
                {symbol}{formatted}
              </span>
            </div>
            <p className="text-gray-500 text-[0.88rem] mt-3 max-w-[440px]">
              Top up in Naira (&#8358;) or Dollars ($) to buy virtual numbers and social media accounts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setFundOpen(true)}
              className="btn-gold px-7 py-4 text-[0.95rem] flex items-center justify-center gap-2 hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)]"
            >
              <Plus size={19} strokeWidth={1.9} /> Fund Wallet
            </button>
          </div>
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-7 pt-5 border-t border-gold/10">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-[12px] bg-gold/10 border border-gold/25 flex items-center justify-center text-gold shrink-0">
              <Landmark size={19} strokeWidth={1.8} />
            </span>
            <div>
              <div className="text-[0.65rem] uppercase tracking-widest text-gray-500 font-semibold">Bank / PAGA Transfers</div>
              <div className="font-mono text-[1.02rem] tracking-wider text-white">0838174296</div>
            </div>
          </div>
          <button
            onClick={copyAccount}
            className="btn-ghost px-5 py-2.5 text-[0.8rem] flex items-center justify-center gap-2 shrink-0"
          >
            {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.9} />}
            {copied ? 'Copied!' : 'Copy Account'}
          </button>
        </div>

        <div className="relative flex flex-wrap gap-x-8 gap-y-3 mt-5 text-[0.82rem]">
          <span className="flex items-center gap-2 text-gray-500">
            <ShieldCheck size={15} strokeWidth={1.8} className="text-gold" /> Secure payments
          </span>
          <span className="flex items-center gap-2 text-gray-500">
            <Zap size={15} strokeWidth={1.8} className="text-gold" /> Instant balance
          </span>
          <span className="flex items-center gap-2 text-gray-500">
            <Star size={15} strokeWidth={1.8} className="text-gold" /> Fund in &#8358; or $
          </span>
        </div>
      </div>

      <FundWalletModal open={fundOpen} onClose={() => setFundOpen(false)} onFunded={onFunded} />
    </>
  );
}