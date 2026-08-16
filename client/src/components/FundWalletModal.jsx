import { useEffect, useState } from 'react';
import { X, Info, CheckCircle2, Loader2, AlertCircle, CreditCard, Landmark, Copy, Check, Smartphone, RefreshCw } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

const AVS_FIELDS = [
  { key: 'line1', label: 'Billing address (line 1)', placeholder: '221B Baker Street' },
  { key: 'line2', label: 'Billing address (line 2, optional)', placeholder: 'Apt 4', optional: true },
  { key: 'city', label: 'City', placeholder: 'Gotham' },
  { key: 'state', label: 'State', placeholder: 'Colorado' },
  { key: 'postal_code', label: 'Postal / ZIP code', placeholder: '94105' },
  { key: 'country', label: 'Country (2-letter)', placeholder: 'US' }
];

const METHODS = [
  { id: 'bank', label: 'Bank Transfer', icon: Landmark, currency: 'NGN' },
  { id: 'opay', label: 'OPay', icon: Smartphone, currency: 'NGN' },
  { id: 'card', label: 'Card', icon: CreditCard, currency: 'USD' }
];

function resolveAction(charge) {
  const na = charge?.next_action;
  if (!na) return null;
  if (na.type === 'redirect_url') {
    return { kind: 'redirect', url: na.redirect_url?.url || na.redirect_url };
  }
  if (na.type === 'authorize' && na.authorization?.type) {
    return { kind: 'auth', type: na.authorization.type };
  }
  if (na.type === 'requires_pin') return { kind: 'auth', type: 'pin' };
  if (na.type === 'requires_otp') return { kind: 'auth', type: 'otp' };
  if (na.type === 'requires_additional_fields') return { kind: 'auth', type: 'avs' };
  if (na.type === 'external_3ds') return { kind: 'auth', type: 'external_3ds' };
  return null;
}

function expiryOK(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || !Number.isInteger(y)) return false;
  if (m < 1 || m > 12) return false;
  const now = new Date();
  const exp = new Date(2000 + y, m, 0);
  return exp >= new Date(now.getFullYear(), now.getMonth(), 0);
}

export default function FundWalletModal({ open, onClose, onFunded, rate = 1500 }) {
  const [method, setMethod] = useState('bank');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [card, setCard] = useState({ card_number: '', expiry_month: '', expiry_year: '', cvv: '' });

  const [step, setStep] = useState('form');
  const [error, setError] = useState('');
  const [authType, setAuthType] = useState('pin');
  const [authValue, setAuthValue] = useState('');
  const [avs, setAvs] = useState({});
  const [chargeId, setChargeId] = useState('');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [successCharge, setSuccessCharge] = useState(null);

  const [va, setVa] = useState(null);
  const [loadingVa, setLoadingVa] = useState(false);
  const [copied, setCopied] = useState('');
  const [bankConfirmed, setBankConfirmed] = useState(false);
  const [bankCheck, setBankCheck] = useState(null);
  const [testFunding, setTestFunding] = useState(false);

  useEffect(() => {
    api.get('/config')
      .then((res) => setTestFunding(Boolean(res.data?.testFunding)))
      .catch(() => setTestFunding(false));
  }, []);

  useEffect(() => {
    if (open) {
      setMethod('bank');
      setAmount('');
      setPhone('');
      setCard({ card_number: '', expiry_month: '', expiry_year: '', cvv: '' });
      setStep('form');
      setError('');
      setAuthType('pin');
      setAuthValue('');
      setAvs({});
      setChargeId('');
      setReference('');
      setMessage('');
      setSuccessCharge(null);
      setVa(null);
      setCopied('');
      setBankConfirmed(false);
      setBankCheck(null);
    }
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(''), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!open) return null;

  const currency = method === 'card' ? 'USD' : 'NGN';
  const symbol = currency === 'USD' ? '$' : '\u20A6';
  const numeric = Number(amount);
  const min = currency === 'USD' ? 1 : 100;
  const valid = Number.isFinite(numeric) && numeric >= min;

  const cardValid = /^\d{13,19}$/.test(card.card_number.replace(/\s/g, '')) &&
    expiryOK(card.expiry_month, card.expiry_year) &&
    /^\d{3,4}$/.test(card.cvv);

  const phoneValid = method === 'opay' ? /^0?[789]\d{9}$/.test(phone.replace(/\D/g, '')) : true;

  const cleanBankLabel = (value) => {
    if (!value) return '—';
    return String(value)
      .replace(/\s*\(.*$/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Bank';
  };

  const cleanAccountName = (value) => {
    if (!value) return '—';
    return String(value)
      .replace(/^please\s+make\s+a\s+bank\s+transfer\s+to\s+/gi, '')
      .replace(/\s+FLW\s*$/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || '—';
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied('');
    }
  };

  const loadVirtualAccount = async () => {
    if (!valid || method !== 'bank') return;
    setLoadingVa(true);
    setError('');
    try {
      const res = await api.post('/wallet/virtual-account', { amount: numeric });
      setVa(res.data.virtualAccount);
      setBankConfirmed(false);
      setBankCheck(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingVa(false);
    }
  };

  const checkBankStatus = async () => {
    if (!va?.reference) {
      setBankCheck('pending');
      return;
    }
    setBankCheck('checking');
    try {
      const res = await api.get(`/wallet/fund-status?reference=${encodeURIComponent(va.reference)}`);
      const status = String(res.data?.status || '').toLowerCase();
      setBankCheck(status === 'succeeded' || status === 'completed' ? 'received' : 'pending');
    } catch {
      setBankCheck('pending');
    }
  };

  const handleSentMoney = async () => {
    setBankConfirmed(true);
    await checkBankStatus();
  };

  const finish = (charge) => {
    const action = resolveAction(charge);
    if (String(charge.status) === 'succeeded' || action === null) {
      if (String(charge.status) === 'succeeded') {
        setSuccessCharge(charge);
        setStep('done');
        onFunded?.();
      } else if (String(charge.status) === 'failed') {
        setError(charge.processor_response?.message || 'Payment failed. Please try again.');
        setStep('form');
      } else if (action === null) {
        setMessage('Payment is being processed. Your wallet will be credited shortly.');
        setStep('done');
      }
      return;
    }
    if (action.kind === 'redirect') {
      window.location.href = action.url;
      return;
    }
    if (action.kind === 'auth') {
      setAuthType(action.type);
      setAuthValue('');
      setAvs({});
      setStep('auth');
      return;
    }
    setError('Unexpected payment response. Please try again.');
    setStep('form');
  };

  const handleTestFund = async (amountToFund = 10000) => {
    setError('');
    setStep('processing');
    try {
      const res = await api.post('/wallet/test-fund', { amount: amountToFund });
      setMessage(res.data.message || 'Successfully funded test money!');
      setStep('success');
      if (onFunded) onFunded(res.data.wallet);
    } catch (err) {
      setError(getErrorMessage(err));
      setStep('form');
    }
  };

  const handleInitiate = async (e) => {
    e.preventDefault();
    if (!valid) return;
    if (method === 'opay' && !phone.trim()) {
      setError('OPay phone number is required');
      return;
    }
    setError('');
    setStep('processing');
    try {
      const payload = { currency, amount: numeric, method: method === 'card' ? 'card' : 'opay' };
      if (method === 'opay') payload.phone = phone;
      if (method === 'card') {
        payload.card = {
          card_number: card.card_number.replace(/\s/g, ''),
          expiry_month: card.expiry_month,
          expiry_year: card.expiry_year,
          cvv: card.cvv
        };
      }
      const res = await api.post('/wallet/fund', payload);
      setReference(res.data.reference);
      setChargeId(res.data.charge?.id || '');
      finish(res.data.charge || {});
    } catch (err) {
      setError(getErrorMessage(err));
      setStep('form');
    }
  };

  const handleAuthorize = async (e) => {
    e.preventDefault();
    setError('');
    setStep('processing');
    try {
      const payload = { chargeId };
      if (authType === 'pin' || authType === 'otp') {
        payload.type = authType;
        payload.value = authValue.trim();
      } else if (authType === 'avs') {
        payload.type = 'avs';
        payload.fields = { ...avs };
      } else {
        payload.type = authType;
      }
      const res = await api.post('/wallet/authorize', payload);
      setChargeId(res.data.charge?.id || chargeId);
      finish(res.data.charge || {});
    } catch (err) {
      setError(getErrorMessage(err));
      setStep('auth');
    }
  };

  const inputCls =
    'w-full px-4 py-3.5 bg-input border border-gold/20 rounded-[12px] text-body text-[0.95rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle';

  return (
    <div
      className="fixed inset-0 z-2000 bg-overlay backdrop-blur-[5px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gradient-to-br from-surface1 to-surface2 border border-gold/20 rounded-[15px] p-6 md:p-8 w-full max-w-[500px] relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-syne text-xl md:text-[1.6rem]">
            {step === 'auth' ? 'Confirm Payment' : 'Fund Your Wallet'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            disabled={step === 'processing'}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gold/10 border border-gold/25 text-gold hover:text-night hover:bg-gold hover:rotate-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {error && (
          <div className="mb-5 bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.88rem] rounded-[10px] px-4 py-3 flex items-start gap-2.5">
            <AlertCircle size={17} strokeWidth={1.9} className="shrink-0 mt-[2px]" />
            <span>{error}</span>
          </div>
        )}

        {step === 'form' && (
          <>
            <label className="block text-[0.8rem] uppercase tracking-wider text-faint mb-3">Payment method</label>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMethod(m.id);
                      setAmount('');
                      setError('');
                    }}
                    className={`flex flex-col items-center gap-2 px-2 py-4 rounded-[12px] border transition-all ${
                      active
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-gold/20 bg-soft text-muted hover:border-gold/40 hover:text-body'
                    }`}
                  >
                    <m.icon size={22} strokeWidth={1.7} />
                    <span className="text-[0.82rem] font-medium">{m.label}</span>
                    <span className="text-[0.68rem] text-faint">{m.currency}</span>
                  </button>
                );
              })}
            </div>

            {method === 'bank' ? (
              <div>
                <label htmlFor="bankAmount" className="block text-[0.8rem] uppercase tracking-wider text-faint mb-2">
                  Amount you want to fund ({currency})
                </label>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold text-lg font-semibold">
                    {symbol}
                  </span>
                  <input
                    id="bankAmount"
                    type="number"
                    min={min}
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setVa(null);
                      setBankConfirmed(false);
                      setBankCheck(null);
                      setError('');
                    }}
                    placeholder={`Min. ${symbol}${min.toLocaleString()}`}
                    className={inputCls + ' pl-11'}
                  />
                </div>
                {loadingVa ? (
                  <div className="text-center py-8 text-muted">
                    <Loader2 size={30} strokeWidth={1.6} className="animate-spin text-gold mx-auto mb-3" />
                    Generating your payment account…
                  </div>
                ) : va ? (
                  <div className="bg-gold/8 border border-gold/20 rounded-[12px] p-5">
                    <p className="text-[0.8rem] text-muted mb-4">
                      Send <span className="text-gold font-semibold">₦{Number(va.amount || amount).toLocaleString()}</span>{' '}
                      to the details below. Your wallet is credited automatically once the transfer is received.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 bg-field border border-gold/15 rounded-[10px] px-4 py-3">
                        <div>
                          <div className="text-[0.65rem] uppercase tracking-widest text-faint font-semibold">Bank</div>
                          <div className="font-medium text-[0.95rem]">{cleanBankLabel(va.bank_name)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 bg-field border border-gold/15 rounded-[10px] px-4 py-3">
                        <div>
                          <div className="text-[0.65rem] uppercase tracking-widest text-faint font-semibold">Account Name</div>
                          <div className="font-medium text-[0.95rem]">{cleanAccountName(va.account_name)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 bg-field border border-gold/15 rounded-[10px] px-4 py-3">
                        <div>
                          <div className="text-[0.65rem] uppercase tracking-widest text-faint font-semibold">Account Number</div>
                          <div className="font-mono text-[1.1rem] tracking-wider text-gold">{va.account_number || '—'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(String(va.account_number || ''), 'number')}
                          className="btn-ghost px-4 py-2 text-[0.8rem] flex items-center gap-1.5 shrink-0"
                        >
                          {copied === 'number' ? <Check size={15} /> : <Copy size={15} />}
                          {copied === 'number' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[0.72rem] text-faint mt-4">
                      Use the exact amount shown above in your banking app or wallet transfer screen. The account details expire after a while, so make the transfer promptly.
                    </p>

                    {bankConfirmed ? (
                      <div className="mt-4">
                        {bankCheck === 'checking' ? (
                          <div className="bg-gold/8 border border-gold/25 rounded-[12px] px-4 py-4 flex items-center gap-3">
                            <Loader2 size={20} strokeWidth={1.9} className="animate-spin text-gold shrink-0" />
                            <p className="text-[0.88rem] text-muted">Checking transfer status…</p>
                          </div>
                        ) : bankCheck === 'received' ? (
                          <div className="bg-[#2ecc71]/10 border border-[#2ecc71]/30 rounded-[12px] px-4 py-3.5 flex items-start gap-3">
                            <CheckCircle2 size={18} strokeWidth={1.9} className="text-[#2ecc71] shrink-0 mt-[2px]" />
                            <div className="flex-1">
                              <p className="text-[0.9rem] font-medium text-[#2ecc71]">Transfer received</p>
                              <p className="text-[0.8rem] text-body/80 mt-0.5">
                                Your wallet has been credited. You can now make a purchase.
                              </p>
                              <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 w-full btn-gold py-3 text-[0.9rem] rounded-[10px]"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-[12px] px-4 py-3.5 flex items-start gap-3">
                            <AlertCircle size={18} strokeWidth={1.9} className="text-[#f59e0b] shrink-0 mt-[2px]" />
                            <div className="flex-1">
                              <p className="text-[0.9rem] font-medium text-[#f59e0b]">We haven&apos;t received it yet</p>
                              <p className="text-[0.8rem] text-body/80 mt-0.5">
                                Transfers can take a few minutes to confirm. Check again shortly.
                              </p>
                              <div className="flex gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={checkBankStatus}
                                  className="flex-1 btn-ghost py-3 text-[0.88rem] rounded-[10px] flex items-center justify-center gap-2"
                                >
                                  <RefreshCw size={15} strokeWidth={1.9} /> Check again
                                </button>
                                <button
                                  type="button"
                                  onClick={onClose}
                                  className="flex-1 btn-gold py-3 text-[0.88rem] rounded-[10px]"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSentMoney}
                        className="mt-4 w-full btn-gold py-4 text-[0.95rem] rounded-[12px] flex items-center justify-center gap-2"
                      >
                        <Check size={18} strokeWidth={1.9} /> I have sent the money
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={loadVirtualAccount}
                    disabled={!valid}
                    className="w-full btn-ghost py-4 text-[0.95rem] rounded-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate my bank account
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleInitiate}>
                <label htmlFor="fundAmount" className="block text-[0.8rem] uppercase tracking-wider text-faint mb-2">
                  Amount ({currency})
                </label>
                <div className="relative mb-5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold text-lg font-semibold">
                    {symbol}
                  </span>
                  <input
                    id="fundAmount"
                    type="number"
                    min={min}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min. ${symbol}${min.toLocaleString()}`}
                    className={inputCls + ' pl-11'}
                  />
                </div>

                {method === 'opay' ? (
                  <div className="mb-5">
                    <label htmlFor="opayPhone" className="block text-[0.8rem] uppercase tracking-wider text-faint mb-2">
                      OPay phone number (required)
                    </label>
                    <input
                      id="opayPhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08012345678"
                      className={inputCls}
                      required
                    />
                    <p className="text-[0.78rem] text-subtle mt-2">
                      You&apos;ll be redirected to OPay to authorise the payment in the app.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-5">
                    <p className="text-[0.78rem] text-subtle">
                      Card payments are taken in USD and converted to Naira (₦{Number(rate).toLocaleString()} = $1) in your wallet.
                    </p>
                    <label htmlFor="cardNumber" className="block text-[0.8rem] uppercase tracking-wider text-faint">
                      Card number
                    </label>
                    <input
                      id="cardNumber"
                      inputMode="numeric"
                      value={card.card_number}
                      onChange={(e) => setCard({ ...card, card_number: e.target.value.replace(/[^\d ]/g, '') })}
                      placeholder="1234 5678 9012 3456"
                      className={inputCls}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="cardMonth" className="block text-[0.7rem] uppercase tracking-wider text-faint mb-1.5">
                          Month
                        </label>
                        <input
                          id="cardMonth"
                          inputMode="numeric"
                          value={card.expiry_month}
                          onChange={(e) => setCard({ ...card, expiry_month: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                          placeholder="MM"
                          className={inputCls + ' text-center'}
                        />
                      </div>
                      <div>
                        <label htmlFor="cardYear" className="block text-[0.7rem] uppercase tracking-wider text-faint mb-1.5">
                          Year
                        </label>
                        <input
                          id="cardYear"
                          inputMode="numeric"
                          value={card.expiry_year}
                          onChange={(e) => setCard({ ...card, expiry_year: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                          placeholder="YY"
                          className={inputCls + ' text-center'}
                        />
                      </div>
                      <div>
                        <label htmlFor="cardCvv" className="block text-[0.7rem] uppercase tracking-wider text-faint mb-1.5">
                          CVV
                        </label>
                        <input
                          id="cardCvv"
                          inputMode="numeric"
                          value={card.cvv}
                          onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          placeholder="123"
                          className={inputCls + ' text-center'}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[0.78rem] text-subtle">
                      <CreditCard size={15} strokeWidth={1.8} className="text-gold shrink-0" />
                      Card details are encrypted end-to-end.
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!valid || (method === 'card' && !cardValid) || (method === 'opay' && !phoneValid)}
                  className="w-full btn-gold py-4 text-[1.02rem] rounded-[14px] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(212,175,55,0.4)] transition-all duration-300"
                >
                  {method === 'opay'
                    ? 'Continue with OPay'
                    : `Pay ${symbol}${valid ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}`}
                </button>

                {testFunding && (
                  <div className="mt-4 pt-4 border-t border-gold/10 text-center">
                    <button
                      type="button"
                      onClick={() => handleTestFund(10000)}
                      className="w-full bg-[#1b2a1e] hover:bg-[#233827] text-[#2ecc71] border border-[#2ecc71]/30 py-3 rounded-[12px] text-[0.88rem] font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <span>🧪 Sandbox Mode: Instant ₦10,000 Test Top-Up</span>
                    </button>
                    <p className="text-[0.72rem] text-faint mt-1">
                      Adds ₦10,000 test balance immediately to test purchases in sandbox mode.
                    </p>
                  </div>
                )}
              </form>
            )}
          </>
        )}

        {step === 'auth' && (
          <form onSubmit={handleAuthorize} className="space-y-5">
            <div className="bg-gold/8 border border-gold/20 rounded-[12px] px-4 py-3.5 flex items-start gap-3 text-gold text-[0.88rem]">
              <Info size={18} strokeWidth={1.8} className="shrink-0 mt-[2px]" />
              <span>
                {authType === 'otp' && 'Enter the one-time password (OTP) sent to your phone to complete the payment.'}
                {authType === 'pin' && 'This card requires a PIN. Enter your card PIN to complete the payment.'}
                {authType === 'avs' && 'This card requires address verification. Enter the billing address for the card.'}
                {authType === 'external_3ds' && 'Your bank needs to verify this transaction. Continue to finish the payment.'}
              </span>
            </div>

            {(authType === 'otp' || authType === 'pin') && (
              <div>
                <label htmlFor="authValue" className="block text-[0.8rem] uppercase tracking-wider text-faint mb-2">
                  {authType === 'otp' ? 'OTP' : 'Card PIN'}
                </label>
                <input
                  id="authValue"
                  type={authType === 'pin' ? 'password' : 'text'}
                  inputMode="numeric"
                  value={authValue}
                  onChange={(e) => setAuthValue(e.target.value.replace(/\D/g, ''))}
                  placeholder={authType === 'otp' ? 'e.g. 123456' : '••••'}
                  className={inputCls}
                />
              </div>
            )}

            {authType === 'avs' && (
              <div className="space-y-3">
                {AVS_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`avs-${f.key}`} className="block text-[0.75rem] uppercase tracking-wider text-faint mb-1.5">
                      {f.label}
                    </label>
                    <input
                      id={`avs-${f.key}`}
                      value={avs[f.key] || ''}
                      onChange={(e) => setAvs({ ...avs, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      required={!f.optional}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            )}

            {authType === 'external_3ds' && (
              <button type="submit" className="w-full btn-gold py-4 text-[1.02rem] rounded-[14px]">
                Continue with 3-D Secure
              </button>
            )}

            {(authType === 'otp' || authType === 'pin' || authType === 'avs') && (
              <button
                type="submit"
                disabled={authType !== 'avs' && !authValue}
                className="w-full btn-gold py-4 text-[1.02rem] rounded-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            )}
          </form>
        )}

        {step === 'processing' && (
          <div className="text-center py-10">
            <Loader2 size={40} strokeWidth={1.6} className="animate-spin text-gold mx-auto mb-5" />
            <h3 className="font-syne text-xl mb-2">Processing payment</h3>
            <p className="text-muted text-[0.95rem]">Please wait while we confirm your top-up with the payment provider.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold mx-auto mb-5">
              <CheckCircle2 size={34} strokeWidth={1.8} />
            </div>
            <h3 className="font-syne text-xl mb-2">
              {successCharge ? 'Payment successful' : 'Payment processing'}
            </h3>
            <p className="text-muted text-[0.95rem] mb-3">
              {successCharge
                ? `You topped up ${symbol}${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}. Your wallet has been credited.`
                : message || 'Your wallet will be credited once the payment is confirmed.'}
            </p>
            {reference && (
              <p className="text-[0.78rem] text-subtle font-mono mb-6">Ref: {reference}</p>
            )}
            <button onClick={onClose} className="w-full btn-ghost py-3.5 text-[0.95rem] rounded-[50px]">
              {successCharge ? 'Done' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}