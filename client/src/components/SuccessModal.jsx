import { useState } from 'react';
import { Check, Copy, Download, Home } from 'lucide-react';
import Modal from './Modal.jsx';
import { buildReceiptText } from '../data/marketplace.js';

export default function SuccessModal({ open, order, onClose }) {
  const [toast, setToast] = useState('');

  if (!order) return null;

  const copyInfo = async () => {
    const text = buildReceiptText(order);
    try {
      await navigator.clipboard.writeText(text);
      setToast('Copied to clipboard');
    } catch {
      setToast('Unable to copy — please copy manually');
    }
    setTimeout(() => setToast(''), 2000);
  };

  const downloadReceipt = () => {
    const text = buildReceiptText(order);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpencersBM-Receipt-${order.orderId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        <InfoRow label="Order ID" value={order.orderId} mono />
        <InfoRow label="Product Name" value={order.productName} />
        <InfoRow label="Platform/Service" value={order.platformService} />
        {order.country && <InfoRow label="Country" value={order.country} />}
        <InfoRow label="Purchase Date & Time" value={order.purchaseDate} />
        <InfoRow label="Customer Email" value={order.email} />
      </div>

      <h3 className="font-syne font-bold text-gold text-[0.95rem] tracking-[0.5px] uppercase mb-4 mt-7">Your Purchase</h3>
      <div className="bg-white/3 border border-gold/15 rounded-[12px] p-5">
        {order.type === 'virtual_number' ? (
          <>
            <InfoRow label="Purchased Number" value={order.purchasedNumber} mono />
            <InfoRow label="Country" value={order.country} />
            <InfoRow label="Service" value={order.platformService} />
            <StatusRow order={order} />
          </>
        ) : (
          <>
            <InfoRow label="Platform" value={order.platformService} />
            <InfoRow label="Username/Email" value={order.username} mono />
            <InfoRow label="Password" value={order.password} mono />
            <InfoRow label="Recovery Information" value={order.recoveryInfo} />
            <StatusRow order={order} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3.5 mt-8">
        <button onClick={copyInfo} className="btn-ghost w-full py-4 text-[0.95rem] flex items-center justify-center gap-2">
          <Copy size={18} strokeWidth={1.9} /> Copy Information
        </button>
        <button onClick={downloadReceipt} className="btn-gold w-full py-4 text-[0.95rem] hover:-translate-y-[2px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2">
          <Download size={18} strokeWidth={1.9} /> Download Receipt
        </button>
        <button
          onClick={() => {
            onClose();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full py-3.5 rounded-[50px] font-semibold text-[0.95rem] bg-transparent text-gray-400 border border-white/15 hover:border-white/40 hover:text-white flex items-center justify-center gap-2"
        >
          <Home size={18} strokeWidth={1.9} /> Return Home
        </button>
      </div>

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gold text-night px-6 py-3 rounded-[50px] font-semibold text-[0.9rem] z-2500">{toast}</div>}
    </Modal>
  );
}

function StatusRow({ order }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-white/5 gap-4 last:border-none">
      <span className="text-gray-400 text-[0.85rem] whitespace-nowrap">Status</span>
      <span className="bg-[#2ecc71]/15 text-[#2ecc71] px-3 py-1 rounded-[50px] text-[0.75rem] font-semibold uppercase">
        {order.status}
      </span>
    </div>
  );
}