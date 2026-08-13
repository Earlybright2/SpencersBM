import { useEffect, useState } from 'react';
import { X, Info, CheckCircle2 } from 'lucide-react';

const CURRENCIES = [
  { code: 'NGN', symbol: '₦', label: 'Nigerian Naira', min: 1000 },
  { code: 'USD', symbol: '$', label: 'US Dollar', min: 10 }
];

export default function FundWalletModal({ open, onClose }) {
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrency(CURRENCIES[0]);
      setAmount('');
      setSubmitted(false);
    }
  }, [open]);

  if (!open) return null;

  const numeric = Number(amount);
  const valid = Number.isFinite(numeric) && numeric >= currency.min;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-2000 bg-black/70 backdrop-blur-[5px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gradient-to-br from-[#1e1e1e]/98 to-[#141414]/98 border border-gold/20 rounded-[15px] p-6 md:p-8 w-full max-w-[480px] relative animate-fade-in-up max-h-[88vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-syne text-xl md:text-[1.6rem]">Fund Your Wallet</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gold/10 border border-gold/25 text-gold hover:text-night hover:bg-gold hover:rotate-90 transition-all"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <label className="block text-[0.8rem] uppercase tracking-wider text-gray-500 mb-3">Select currency</label>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {CURRENCIES.map((c) => {
                const active = currency.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCurrency(c);
                      setAmount('');
                    }}
                    className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-[12px] border transition-all ${
                      active
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-gold/20 bg-white/3 text-gray-400 hover:border-gold/40 hover:text-white'
                    }`}
                  >
                    <span className="text-xl font-semibold">{c.symbol}</span>
                    <span className="text-[0.9rem] font-medium">{c.code}</span>
                    <span className="text-[0.72rem] text-gray-500">{c.label}</span>
                  </button>
                );
              })}
            </div>

            <label htmlFor="fundAmount" className="block text-[0.8rem] uppercase tracking-wider text-gray-500 mb-2">
              Amount
            </label>
            <div className="relative mb-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold text-lg font-semibold">
                {currency.symbol}
              </span>
              <input
                id="fundAmount"
                type="number"
                min={currency.min}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min. ${currency.symbol}${currency.min.toLocaleString()}`}
                className="w-full pl-11 pr-4 py-3.5 bg-[#0d0d0d] border border-gold/20 rounded-[12px] text-white text-[1rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-[#555]"
              />
            </div>
            <p className="text-[0.78rem] text-[#707070] mb-6">
              Minimum top-up is {currency.symbol}
              {currency.min.toLocaleString()} {currency.code}. Funds are added to your wallet balance instantly.
            </p>

            <button
              type="submit"
              disabled={!valid}
              className="w-full btn-gold py-4 text-[1.02rem] rounded-[14px] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(212,175,55,0.4)] transition-all duration-300"
            >
              Continue with {currency.symbol}
              {valid ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''} {currency.code}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold mx-auto mb-5">
              <CheckCircle2 size={34} strokeWidth={1.8} />
            </div>
            <h3 className="font-syne text-xl mb-2">Almost there</h3>
            <p className="text-gray-400 text-[0.95rem] mb-6">
              You&apos;re topping up {currency.symbol}
              {numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency.code}.
            </p>
            <div className="flex items-start gap-3 bg-gold/8 border border-gold/20 text-gold text-[0.88rem] rounded-[12px] px-4 py-3.5 text-left mb-6">
              <Info size={18} strokeWidth={1.8} className="shrink-0 mt-[2px]" />
              <span>
                We&apos;re connecting our payment provider. Wallets will go live as soon as it&apos;s
                integrated — no action needed on your side.
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-full btn-ghost py-3.5 text-[0.95rem] rounded-[50px]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}