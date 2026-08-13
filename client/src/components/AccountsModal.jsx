import Modal from './Modal.jsx';
import { socialAccounts } from '../data/marketplace.js';

export default function AccountsModal({ open, onClose, onBuy }) {
  return (
    <Modal open={open} onClose={onClose} title="Social Media Accounts" maxWidth="max-w-[760px]">
      <div className="flex flex-col gap-4">
        {socialAccounts.map((account) => (
          <div
            key={account.platform}
            className="flex flex-wrap items-center gap-4 bg-gold/8 border border-gold/15 rounded-[10px] p-6 hover:bg-gold/12 hover:border-gold/30 transition-all"
          >
            <span className="w-[50px] h-[50px] min-w-[50px] rounded-[12px] bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <account.icon size={26} strokeWidth={1.8} />
            </span>
            <div className="flex-1">
              <h4 className="text-gold text-[1.1rem] mb-1">{account.platform}</h4>
              <p className="text-gray-400 text-[0.85rem]">{account.desc}</p>
            </div>
            <span className="text-gold font-semibold text-[0.95rem] whitespace-nowrap">{account.price}</span>
            <button
              onClick={() => onBuy(account)}
              className="btn-gold px-5 py-2.5 text-[0.85rem] w-full sm:w-auto hover:-translate-y-[2px] hover:shadow-[0_10px_25px_rgba(212,175,55,0.4)]"
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}