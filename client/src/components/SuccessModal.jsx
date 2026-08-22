import { useState } from 'react';
import { AlertTriangle, Check, Copy, Download, KeyRound, MessageSquare, Clock } from 'lucide-react';
import Modal from './Modal.jsx';
import CountdownTimer from './CountdownTimer.jsx';
import { platformIcon } from '../data/marketplace.js';
import { downloadReceiptPdf } from '../utils/receipt.js';

const accountPending = (o) => o && o.type === 'social_account' && (o.status === 'pending' || (!o.username && !o.password));

// The provider sometimes returns only part of the SMS code (e.g. "447" instead
// of the full "447684"). Codes shorter than 4 digits are treated as incomplete.
const isIncompleteSms = (o) => {
  if (!o?.sms) return false;
  const digits = String(o.sms).replace(/\D/g, '');
  return digits.length >= 1 && digits.length < 4;
};

// Build the account credential rows (username, password, email, email password,
// recovery, and any extra fields the provider returned).
function accountRows(order) {
  const rows = [];
  const push = (label, value, mono = true) => {
    if (value === undefined || value === null || String(value).trim() === '') return;
    rows.push([label, value, mono]);
  };
  push('Username / Email', order.username);
  push('Password', order.password);
  push('Account Email', order.email);
  push('Email Password', order.email_password || order.emailPassword);
  push('Recovery', order.recovery);
  (Array.isArray(order.extra) ? order.extra : [])
    .filter((v) => String(v).trim())
    .forEach((v, i) => push(`Additional Detail ${i + 1}`, String(v)));
  return rows;
}

export default function SuccessModal({ open, order, onClose, onViewAccounts, onCheckSms, checkingSms }) {
  const [toast, setToast] = useState('');

  const orders = Array.isArray(order) ? order : (order ? [order] : []);
  if (orders.length === 0) return null;

  const count = orders.length;
  const first = orders[0];
  const isAccount = first.type === 'social_account';
  const productLabel = isAccount ? first.platform : `${first.service} · ${first.country}`;
  const total = orders.reduce((s, o) => s + (Number(o.price) || 0), 0);
  const somePending = orders.some(accountPending);
  const allPending = orders.length > 0 && orders.every(accountPending);
  const allCompleted = !somePending;
  const showMulti = count > 1;

  const buildReceiptText = () => {
    const lines = [
      'SPENCERSBM — ORDER RECEIPT',
      '================================',
      `Order ID: ${first.order_ref || first.id}${showMulti ? ` (+${count - 1} more)` : ''}`,
      `Product: ${productLabel}${showMulti ? ` × ${count}` : ''}`,
      `Date & Time: ${new Date(first.purchasedAt || Date.now()).toLocaleString()}`,
      `Amount: ${Number(total).toLocaleString()} ${first.currency || 'NGN'}`,
      '',
      'YOUR PURCHASE',
      '--------------------------------'
    ];
    orders.forEach((o, i) => {
      if (showMulti) lines.push(`-- Item ${i + 1} --`);
      if (o.type === 'social_account') {
        lines.push(
          `Platform: ${o.platform}`,
          `Username/Email: ${o.username || ''}`,
          `Password: ${o.password || ''}`
        );
        if (o.email) lines.push(`Account Email: ${o.email}`);
        if (o.email_password || o.emailPassword) lines.push(`Email Password: ${o.email_password || o.emailPassword}`);
        if (o.recovery) lines.push(`Recovery: ${o.recovery}`);
        if (Array.isArray(o.extra)) {
          o.extra.filter((v) => String(v).trim()).forEach((v) => lines.push(`Detail: ${v}`));
        }
      } else {
        lines.push(
          `Number: ${o.number || ''}`,
          `Service: ${o.service}`,
          `Country: ${o.country}`,
          `Status: ${o.status}`
        );
        if (o.sms) lines.push(`SMS Code: ${o.sms}`);
      }
      if (showMulti) lines.push('---');
    });
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

  const buildReceiptRows = () => {
    if (!showMulti) {
      return isAccount
        ? accountRows(first)
        : [
            ['Phone Number', first.number || ''],
            ['Service', first.service],
            ['Country', first.country],
            ['SMS Code', first.sms || 'Not received yet'],
            ['Status', first.status]
          ];
    }
    const rows = [];
    orders.forEach((o, i) => {
      if (o.type === 'social_account') {
        rows.push(['', `ITEM ${i + 1} — ${o.platform}`]);
        accountRows(o).forEach((r) => rows.push([r[0], r[1]]));
      } else {
        rows.push(['', `ITEM ${i + 1} — ${o.service} · ${o.country}`]);
        rows.push(['Phone Number', o.number || '']);
        rows.push(['SMS Code', o.sms || 'Not received yet']);
        rows.push(['Status', o.status]);
      }
    });
    return rows;
  };

  const downloadReceipt = () => {
    downloadReceiptPdf({
      ref: `${first.order_ref || first.id}${showMulti ? `-bulk-${count}` : ''}`,
      subtitle: 'ORDER RECEIPT',
      date: first.purchasedAt,
      amount: total,
      currency: first.currency || 'NGN',
      status: first.status,
      sectionTitle: 'YOUR PURCHASE',
      rows: buildReceiptRows()
    });
  };

  const Icon = isAccount ? platformIcon(first.platform) : null;

  const InfoRow = ({ label, value, mono }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-softline gap-4 last:border-none">
      <span className="text-muted text-[0.85rem] whitespace-nowrap">{label}</span>
      <span className={`text-[0.9rem] font-medium text-right break-words ${mono ? 'font-mono tracking-[0.5px]' : ''}`}>
        {value}
      </span>
    </div>
  );

  const AccountCompleted = ({ o, withHeader = false }) => {
    const P = platformIcon(o.platform);
    return (
      <>
        {withHeader && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-softline">
            {P && (
              <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                <P size={20} strokeWidth={1.8} />
              </span>
            )}
            <div>
              <div className="font-medium">{o.platform}</div>
              <div className="text-[#2ecc71] text-[0.75rem] font-semibold uppercase tracking-wider">Delivered</div>
            </div>
          </div>
        )}
        {accountRows(o).map(([label, value, mono]) => (
          <InfoRow key={label} label={label} value={value} mono={mono} />
        ))}
      </>
    );
  };

  const AccountPendingView = ({ o }) => (
    <>
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-softline">
        {Icon && (
          <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
            <Icon size={20} strokeWidth={1.8} />
          </span>
        )}
        <div>
          <div className="font-medium">{o.platform}</div>
          <div className="text-gold text-[0.75rem] font-semibold uppercase tracking-wider">Processing</div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-[10px] border border-gold/20 bg-gold/5 px-4 py-3 text-[0.82rem] text-body/80">
        <svg className="animate-spin h-5 w-5 text-gold shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>
          This account is being prepared by the provider. Please wait while we fetch your credentials...
        </span>
      </div>
    </>
  );

  const NumberView = ({ o }) => (
    <>
      <InfoRow label="Phone Number" value={o.number || '—'} mono />
      <InfoRow label="Service" value={o.service} />
      <InfoRow label="Country" value={o.country} />
      {o.sms ? (
        <InfoRow label="SMS Code" value={o.sms} mono />
      ) : (
        <InfoRow label="SMS Code" value="Not received yet" />
      )}
      {isIncompleteSms(o) && (
        <div className="mt-3 rounded-[10px] border border-[#e0645a]/30 bg-[#e0645a]/10 px-4 py-3 text-[0.82rem] text-[#ff8a80] flex items-start gap-2">
          <AlertTriangle size={15} strokeWidth={1.9} className="shrink-0 mt-0.5" />
          <span>This SMS code looks incomplete — the provider only delivered part of it. Check the Virtual Numbers tab or contact support for a refund.</span>
        </div>
      )}
      <InfoRow label="Status" value={o.status} />
      {o.status !== 'received' && o.status !== 'cancelled' && o.status !== 'expired' && (
        <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-gold/20 bg-gold/5 px-4 py-3 text-[0.82rem] text-body/80">
          <Clock size={15} strokeWidth={1.9} className="text-gold shrink-0" />
          <span>
            SMS code arrives within{' '}
            <CountdownTimer
              expiresAt={
                o.expiresAt ||
                new Date(new Date(o.purchasedAt || Date.now()).getTime() + 20 * 60 * 1000).toISOString()
              }
              className="text-gold font-semibold"
            />
          </span>
        </div>
      )}
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Payment Successful" maxWidth="max-w-[560px]">
      <div className="text-center mb-2">
        <div className="w-[70px] h-[70px] rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mx-auto mb-5 animate-fade-in-up text-night">
          <Check size={38} strokeWidth={2.5} />
        </div>
        <h2 className="font-syne text-[1.6rem] mb-2">Payment Successful</h2>
        <p className="text-muted text-[0.95rem]">Thank you for your purchase!</p>
      </div>

      <h3 className="font-syne font-bold text-gold text-[0.95rem] tracking-[0.5px] uppercase mb-4 mt-7">Order Information</h3>
      <div className="bg-soft border border-gold/15 rounded-[12px] p-5">
        {showMulti ? (
          <>
            <InfoRow label="Items" value={`${count} × ${productLabel}`} />
            <InfoRow label="Order Ref" value={first.order_ref || first.id} mono />
            <InfoRow label="Total" value={`${Number(total).toLocaleString()} ${first.currency || 'NGN'}`} />
            <InfoRow label="Date & Time" value={new Date(first.purchasedAt || Date.now()).toLocaleString()} />
          </>
        ) : (
          <>
            <InfoRow label="Order ID" value={first.order_ref || first.id} mono />
            <InfoRow label="Product" value={productLabel} />
            <InfoRow label="Amount" value={`${Number(first.price).toLocaleString()} ${first.currency || 'NGN'}`} />
            <InfoRow label="Date & Time" value={new Date(first.purchasedAt || Date.now()).toLocaleString()} />
          </>
        )}
      </div>

      <h3 className="font-syne font-bold text-gold text-[0.95rem] tracking-[0.5px] uppercase mb-4 mt-7">Your Purchase</h3>
      <div className="bg-soft border border-gold/15 rounded-[12px] p-5">
        {isAccount && allPending ? (
          <>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-softline">
              {Icon && (
                <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
              )}
              <div>
                <div className="font-medium">{count > 1 ? `${count} × ${first.platform}` : first.platform}</div>
                <div className="text-gold text-[0.75rem] font-semibold uppercase tracking-wider">Processing</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-[10px] border border-gold/20 bg-gold/5 px-4 py-3 text-[0.82rem] text-body/80">
              <svg className="animate-spin h-5 w-5 text-gold shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>
                Your account{count > 1 ? 's are' : ' is'} being prepared by the provider. Please wait while we fetch your credentials...
              </span>
            </div>
          </>
        ) : showMulti ? (
          <div className="space-y-5">
            {orders.map((o, i) => (
              <div key={o.id || i} className={i > 0 ? 'pt-4 border-t border-softline' : ''}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="font-medium text-[0.95rem]">
                    <span className="text-gold mr-2">{i + 1}.</span>
                    {o.type === 'social_account' ? o.platform : `${o.service} · ${o.country}`}
                  </div>
                  {o.type === 'social_account' ? (
                    accountPending(o) ? (
                      <span className="text-[0.68rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border text-gold border-gold/40 bg-gold/10">Processing</span>
                    ) : (
                      <span className="text-[0.68rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10">Delivered</span>
                    )
                  ) : (
                    <span className="text-[0.68rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border text-gold border-gold/40 bg-gold/10">{o.status}</span>
                  )}
                </div>
                {o.type === 'social_account'
                  ? accountPending(o)
                    ? <AccountPendingView o={o} />
                    : <AccountCompleted o={o} />
                  : <NumberView o={o} />}
              </div>
            ))}
          </div>
        ) : isAccount ? (
          <AccountCompleted o={first} withHeader />
        ) : (
          <NumberView o={first} />
        )}
      </div>

      <div className="flex flex-col gap-3.5 mt-8">
        {isAccount && !allPending && onViewAccounts && (
          <button onClick={onViewAccounts} className="btn-gold w-full py-4 text-[0.95rem] flex items-center justify-center gap-2 hover:-translate-y-[2px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.3)]">
            <KeyRound size={18} strokeWidth={1.9} /> View in Paid Accounts
          </button>
        )}
        {!isAccount && !allCompleted && onCheckSms && (
          <button
            onClick={() => onCheckSms(first.order_ref || first.id)}
            disabled={Boolean(checkingSms)}
            className="mt-4 w-full btn-ghost py-3 text-[0.85rem] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} strokeWidth={1.9} />
            {checkingSms ? 'Checking…' : 'Check SMS Code'}
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
          className="w-full py-3.5 rounded-[50px] font-semibold text-[0.95rem] bg-transparent text-muted border border-softline hover:border-softline hover:text-body"
        >
          Close
        </button>
      </div>

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gold text-night px-6 py-3 rounded-[50px] font-semibold text-[0.9rem] z-2500">{toast}</div>}
    </Modal>
  );
}