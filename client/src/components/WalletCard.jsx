import { useState } from 'react';
import { Wallet, Plus, ShieldCheck, Zap, DollarSign } from 'lucide-react';
import FundWalletModal from './FundWalletModal.jsx';

export default function WalletCard({ balance, onFunded }) {
  const [fundOpen, setFundOpen] = useState(false);

  const formatted = balance ? Number(balance.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00';
  const rate = balance?.usdToNgn || 1500;

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
                {'\u20A6'}{formatted}
              </span>
            </div>
            <p className="text-gray-500 text-[0.88rem] mt-3 max-w-[440px]">
              Fund your wallet by bank transfer to your personal account, OPay, or a US dollar card. Purchases are paid from your balance.
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

        <div className="relative flex flex-wrap gap-x-8 gap-y-3 mt-7 pt-5 border-t border-gold/10 text-[0.82rem]">
          <span className="flex items-center gap-2 text-gray-500">
            <ShieldCheck size={15} strokeWidth={1.8} className="text-gold" /> Secure payments
          </span>
          <span className="flex items-center gap-2 text-gray-500">
            <Zap size={15} strokeWidth={1.8} className="text-gold" /> Instant balance
          </span>
          <span className="flex items-center gap-2 text-gray-500">
            <DollarSign size={15} strokeWidth={1.8} className="text-gold" /> $1 = ₦{Number(rate).toLocaleString()}
          </span>
        </div>
      </div>

      <FundWalletModal open={fundOpen} onClose={() => setFundOpen(false)} onFunded={onFunded} rate={rate} />
    </>
  );
}