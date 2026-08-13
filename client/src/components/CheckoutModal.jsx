import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { buildOrderData } from '../data/marketplace.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutModal({ open, product, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail('');
      setEmailError(false);
      setProcessing(false);
    }
  }, [open]);

  const handlePay = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setProcessing(true);

    // Simulated payment. Swap this with a real gateway/API call — the
    // order generation + success rendering below stays the same.
    setTimeout(() => {
      const order = buildOrderData(product, email.trim());
      setProcessing(false);
      onClose();
      onSuccess(order);
    }, 1400);
  };

  return (
    <Modal open={open} onClose={onClose} title="Checkout">
      {product && (
        <div className="bg-gold/8 border border-gold/15 rounded-[10px] p-6 mb-6">
          <div className="flex justify-between py-2 text-[0.95rem] text-gray-200">
            <span className="text-gray-400">Product</span>
            <span className="text-right">{product.productName}</span>
          </div>
          {product.country && (
            <div className="flex justify-between py-2 text-[0.95rem] text-gray-200">
              <span className="text-gray-400">Country</span>
              <span>{product.country}</span>
            </div>
          )}
          <div className="flex justify-between py-2 text-[0.95rem] text-gray-200">
            <span className="text-gray-400">Service/Platform</span>
            <span>{product.platformService}</span>
          </div>
          <div className="flex justify-between py-2 text-[1.1rem] font-semibold text-gold border-t border-gold/20 mt-2 pt-4">
            <span>Total</span>
            <span>{product.price}</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="checkoutEmail" className="block text-[0.85rem] text-gray-400 mb-2">
          Email Address
        </label>
        <input
          id="checkoutEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full p-3.5 bg-white/5 border-[1.5px] border-gold/20 rounded-[10px] text-white text-[0.95rem] outline-none focus:border-gold placeholder:text-[#707070]"
        />
        {emailError && (
          <p className="text-[#e0645a] text-[0.8rem] mt-2">Please enter a valid email address.</p>
        )}
      </div>

      <button
        onClick={handlePay}
        disabled={processing}
        className="w-full btn-gold py-4 flex items-center justify-center gap-2 text-base disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
      >
        {processing && <span className="spinner inline-block" />}
        {processing ? 'Processing Payment...' : 'Pay Now (Simulated)'}
      </button>

      <p className="text-[0.78rem] text-[#707070] text-center mt-4">
        This is a simulated payment. No real transaction will be processed.
      </p>
    </Modal>
  );
}