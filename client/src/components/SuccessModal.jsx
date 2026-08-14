import { useState } from 'react';
import { Check, Copy, Download, KeyRound, MessageSquare } from 'lucide-react';
import Modal from './Modal.jsx';
import { platformIcon } from '../data/marketplace.js';

export default function SuccessModal({ open, order, onClose, onViewAccounts, onCheckSms, checkingSms }) {
  const [toast, setToast] = useState('');

  if (!order) return null;

  const isAccount = order.type === 'social_account';

  const buildReceiptText = () => {
    const lines = [
      'SPENCERSBM — ORDER RECEIPT',
      '================================',
      `Order ID: ${order.id}`,
      `Product: ${isAccount ? order.platform : `${order.service} · ${order.country}`}`,
      `Date & Time: ${new Date(order.purchasedAt || Date.now()).toLocaleString()}`,
      `Amount: ${Number(order.price).toLocaleString()} ${order.currency || 'NGN'}`,
      '',
      'YOUR PURCHASE',
      '--------------------------------'
    ];
    if (isAccount) {
      lines.push(
        `Platform: ${order.platform}`,
        `Username/Email: ${order.username}`,
        `Password: ${order.password}`
      );
    } else {
      lines.push(
        `Number: ${order.number || ''}`,
        `Status: ${order.status}`
      );
      if (order.sms) lines.push(`SMS Code: ${order.sms}`);
    }
    lines.push('', 'Thank you for your purchase!', 'spencersbm1@hotmail.com');
    return lines.join('\n');
  };

  const copyInfo = async () => {
    try {
      await navigator.clipboard.writeText(buildReceiptText());
      setToast('Copied to clipboard');
    } catch {
      setToast('Unable to copy — please copy manually');
    }
    setTimeout(() => setToast(''), 2000);
  };

  const downloadReceipt = () => {
    const blob = new Blob([buildReceiptText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpencersBM-Receipt-${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const Icon = isAccount ? platformIcon(order.platform) : null;

  const InfoRow = ({ label, value, mono }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-white/5 gap-4 last:border-none">
      <span className="text-gray-400 text-[0.85rem] whitespace-nowrap">{label}</span>
      <span className={`text-[0.9rem] font-medium text-right break-words ${mono ? 'font-mono tracking-[0.5px]' : ''}`}>
        {value}
      </span>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Payment Successful" maxWidth="max-w-[560px]">
      <div className="text-center mb-2">
        <div className="w-[70px] h-[70px] rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mx-auto mb-5 animate-fade-in-up text-night">
          <Check size={38} strokeWidth={2.5} />
        </div>
        <h2 className="font-syne text-[1.6rem] mb-2">Payment Successful</h2>
        <p className="text-gray-400 text-[0.95rem]">Thank you for your purchase!</p>
      </div>

      <h3 className="font-syne font-bold text-gold text-[0.95rem] tracking-[0.5px] uppercase mb-4 mt-7">Order Information</h3>
      <div className="bg-white/3 border border-gold/15 rounded-[12px] p-5">
        <InfoRow label="Order ID" value={order.order_ref || order.id} mono />
        <InfoRow label="Product" value={isAccount ? order.platform : `${order.service} · ${order.country}`} />
        <InfoRow label="Amount" value={`${Number(order.price).toLocaleString()} ${order.currency || 'NGN'}`} />
        <InfoRow label="Date & Time" value={new Date(order.purchasedAt || Date.now()).toLocaleString()} />
      </div>

      <h3 className="font-syne font-bold text-gold text-[0.95rem] tracking-[0.5px] uppercase mb-4 mt-7">Your Purchase</h3>
      <div className="bg-white/3 border border-gold/15 rounded-[12px] p-5">
        {isAccount ? (
          <>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
              {Icon && (
                <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
              )}
              <div>
                <div className="font-medium">{order.platform}</div>
                <div className="text-[#2ecc71] text-[0.75rem] font-semibold uppercase tracking-wider">Delivered</div>
              </div>
            </div>
            <InfoRow label="Username / Email" value={order.username} mono />
            <InfoRow label="Password" value={order.password} mono />
            <p className="text-[0.78rem] text-gray-500 pt-3">
              Your account credentials are also saved under <span className="text-gold">Paid Accounts</span> in the dashboard.
            </p>
          </>
        ) : (
          <>
            <InfoRow label="Phone Number" value={order.number || '—'} mono />
            <InfoRow label="Service" value={order.service} />
            <InfoRow label="Country" value={order.country} />
            {order.sms ? (
              <InfoRow label="SMS Code" value={order.sms} mono />
            ) : (
              <InfoRow label="SMS Code" value="Not received yet" />
            )}
            <InfoRow label="Status" value={order.status} />
            {order.status !== 'received' && onCheckSms && (
              <button
                onClick={() => onCheckSms(order.order_ref || order.id)}
                disabled={Boolean(checkingSms)}
                className="mt-4 w-full btn-ghost py-3 text-[0.85rem] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <MessageSquare size={16} strokeWidth={1.9} />
                {checkingSms ? 'Checking…' : 'Check SMS Code'}
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-3.5 mt-8">
        {isAccount && onViewAccounts && (
          <button onClick={onViewAccounts} className="btn-gold w-full py-4 text-[0.95rem] flex items-center justify-center gap-2 hover:-translate-y-[2px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.3)]">
            <KeyRound size={18} strokeWidth={1.9} /> View in Paid Accounts
          </button>
        )}
        <button onClick={copyInfo} className="btn-ghost w-full py-4 text-[0.95rem] flex items-center justify-center gap-2">
          <Copy size={18} strokeWidth={1.9} /> Copy Information
        </button>
        <button onClick={downloadReceipt} className="btn-ghost w-full py-4 text-[0.95rem] flex items-center justify-center gap-2">
          <Download size={18} strokeWidth={1.9} /> Download Receipt
        </button>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-[50px] font-semibold text-[0.95rem] bg-transparent text-gray-400 border border-white/15 hover:border-white/40 hover:text-white"
        >
          Close
        </button>
      </div>

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gold text-night px-6 py-3 rounded-[50px] font-semibold text-[0.9rem] z-2500">{toast}</div>}
    </Modal>
  );
}