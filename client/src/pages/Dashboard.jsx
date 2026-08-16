import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Smartphone, UserRound, MessageSquare, RefreshCw, Check, Copy, Landmark, Wallet, TrendingUp, Package, KeyRound, X, Store, Search, Headphones, Clock, Download } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import WalletCard from '../components/WalletCard.jsx';
import SuccessModal from '../components/SuccessModal.jsx';
import CascadingNumbers from '../components/CascadingNumbers.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import { platformIcon } from '../data/marketplace.js';
import CascadingAccounts from '../components/CascadingAccounts.jsx';
import { downloadReceiptPdf } from '../utils/receipt.js';

const TITLES = {
  overview: 'Overview',
  store: 'Store',
  numbers: 'Virtual Numbers',
  accounts: 'Social Accounts',
  'paid-accounts': 'Paid Accounts',
  orders: 'Order History',
  profile: 'My Profile'
};

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-gray-400 text-[0.85rem]">{label}</span>
      <span className={`text-right font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function PanelCard({ title, children, actions }) {
  return (
    <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="font-syne text-xl">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

function RefreshButton({ onClick, label = 'Refresh' }) {
  const [spinning, setSpinning] = useState(false);
  const handle = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await onClick();
    } finally {
      setSpinning(false);
    }
  };
  return (
    <button
      onClick={handle}
      disabled={spinning}
      className="btn-ghost px-4 py-2.5 text-[0.82rem] flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <RefreshCw size={15} strokeWidth={1.9} className={`shrink-0 ${spinning ? 'animate-spin' : ''}`} />
      {spinning ? 'Refreshing...' : label}
    </button>
  );
}

const fmtNgn = (n) => `\u20A6${Number(n || 0).toLocaleString()}`;

// Numbers keep the same SMS window the provider uses (~20 min). Old orders that
// predate expiresAt fall back to purchasedAt + 20 minutes.
const SMS_EXPIRY_MS = 20 * 60 * 1000;
const smsExpiresAt = (order) =>
  order.expiresAt ||
  new Date(new Date(order.purchasedAt || Date.now()).getTime() + SMS_EXPIRY_MS).toISOString();

const isSuccessfulPayment = (p) =>
  !['cancelled', 'expired', 'failed', 'initiated'].includes(String(p.status || '').toLowerCase());

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const fundRef = params.get('fund');

  const setTab = (t) => {
    setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  };

  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState({ numbers: [], accounts: [] });
  const [orders, setOrders] = useState([]);
  const [paidAccounts, setPaidAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [lastPurchase, setLastPurchase] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const [checkingSms, setCheckingSms] = useState('');
  const [cancelling, setCancelling] = useState('');
  const [smsNote, setSmsNote] = useState(null);
  const [expiredIds, setExpiredIds] = useState(() => new Set());
  const [storeView, setStoreView] = useState('numbers');
  const [storeSearch, setStoreSearch] = useState('');
  const [numbersSearch, setNumbersSearch] = useState('');

  const loadWallet = async (silent = false) => {
    try {
      const res = await api.get('/wallet');
      setWallet(res.data);
    } catch (err) {
      if (!silent) setError(getErrorMessage(err));
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await api.get('/orders/catalog');
      setCatalog(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadPaidAccounts = async () => {
    try {
      const res = await api.get('/orders/paid-accounts');
      setPaidAccounts(res.data.accounts || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadWallet(true);
    loadCatalog();
    loadOrders();
    loadPaidAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for a completed top-up after being redirected back from OPay/card.
  useEffect(() => {
    if (!fundRef) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      try {
        const res = await api.get('/wallet/fund-status', { params: { reference: fundRef } });
        if (res.data.status === 'succeeded') {
          clearInterval(id);
          loadWallet(true);
          setParams({ tab: 'overview' }, { replace: true });
        }
      } catch {
        // transient polling errors are ignored
      }
      if (tries >= 8) {
        clearInterval(id);
        setParams({ tab: 'overview' }, { replace: true });
      }
    }, 3500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundRef]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(''), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied('');
    }
  };

  const handleBuyNumber = async (product) => {
    if (busy) return;
    setError('');
    setBusy(`buy-${product.id}`);
    try {
      const res = await api.post('/orders/numbers', { productId: product.id });
      setLastPurchase(res.data.order);
      setSuccessOpen(true);
      loadWallet(true);
      loadOrders(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const handleBuyAccount = async (product) => {
    if (busy) return;
    setError('');
    setBusy(`buy-${product.id}`);
    try {
      const res = await api.post('/orders/accounts', { productId: product.id });
      setLastPurchase(res.data.order);
      setSuccessOpen(true);
      loadWallet(true);
      loadOrders(true);
      loadPaidAccounts(true);
      if (res.data.order?.status === 'pending') {
        pollAccountStatus(res.data.order.order_ref);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  // Poll a pending provider-backed account purchase until the credentials arrive.
  const pollAccountStatus = async (orderRef) => {
    for (let i = 0; i < 20; i += 1) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await api.get('/orders/account-status', { params: { order_ref: orderRef } });
        loadOrders(true);
        loadPaidAccounts(true);
        if (res.data.status === 'completed') {
          loadWallet(true);
          return;
        }
      } catch {
        // transient errors are ignored; keep polling
      }
    }
  };

  const handleCheckSms = async (orderRef) => {
    setError('');
    setCheckingSms(orderRef);
    setSmsNote(null);
    try {
      const res = await api.get('/orders/status', { params: { order_ref: orderRef } });
      loadOrders(true);
      const hasCode = Boolean(res.data?.otp || res.data?.sms || res.data?.code || res.data?.sms_code);
      if (!hasCode) {
        setSmsNote({ ref: orderRef, message: 'No code yet — it usually arrives within the SMS window below. Keep checking.' });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCheckingSms('');
    }
  };

  const handleModalCheckSms = async (orderRef) => {
    if (!orderRef || checkingSms) return;
    setError('');
    setCheckingSms(orderRef);
    try {
      await api.get('/orders/status', { params: { order_ref: orderRef } });
      const res = await api.get('/orders');
      const fresh = res.data.orders?.find((o) => o.order_ref === orderRef || o.id === orderRef);
      if (fresh) setLastPurchase(fresh);
      loadOrders(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCheckingSms('');
    }
  };

  const handleCancel = async (orderRef) => {
    setError('');
    setCancelling(orderRef);
    try {
      await api.post('/orders/cancel', { order_ref: orderRef });
      loadOrders(true);
      loadWallet(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancelling('');
    }
  };

  const numberOrders = useMemo(() => orders.filter((o) => o.type === 'virtual_number'), [orders]);

  const numbersByCountry = useMemo(() => {
    const map = {};
    catalog.numbers.forEach((p) => {
      const key = p.country || 'unknown';
      if (!map[key]) map[key] = { country: key, countryName: p.countryName || key, items: [] };
      map[key].items.push(p);
    });
    return Object.values(map);
  }, [catalog.numbers]);

  const filteredCountries = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return numbersByCountry;
    return numbersByCountry.filter((g) => {
      if (String(g.countryName || '').toLowerCase().includes(q)) return true;
      return g.items.some((p) => String(p.serviceName || p.service || '').toLowerCase().includes(q));
    });
  }, [numbersByCountry, storeSearch]);

  const filteredAccounts = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return catalog.accounts;
    return catalog.accounts.filter((p) =>
      String(p.platform || '').toLowerCase().includes(q) || String(p.desc || '').toLowerCase().includes(q)
    );
  }, [catalog.accounts, storeSearch]);

  const filteredNumbers = useMemo(() => {
    const q = numbersSearch.trim().toLowerCase();
    if (!q) return catalog.numbers;
    return catalog.numbers.filter((p) =>
      String(p.serviceName || p.service || '').toLowerCase().includes(q) ||
      String(p.countryName || p.country || '').toLowerCase().includes(q)
    );
  }, [catalog.numbers, numbersSearch]);

  // Order History = every payment: purchases (numbers/accounts) + wallet funding credits.
  const paymentHistory = useMemo(() => {
    const purchases = orders.map((o) => ({
      id: o.id,
      date: o.purchasedAt,
      kind: 'purchase',
      type: o.type,
      title: o.type === 'virtual_number' ? `${o.service || 'Number'} · ${o.country || ''}` : o.platform,
      amount: Number(o.price) || 0,
      ref: o.order_ref || o.id,
      status: o.status
    }));
    const funds = (wallet?.transactions || []).map((t) => ({
      id: t.reference,
      date: t.createdAt,
      kind: 'fund',
      type: t.type === 'credit' ? 'credit' : 'debit',
      title: t.kind === 'refund' ? 'Order Refund' : (t.type === 'credit' ? 'Wallet Funding' : 'Purchase Payment'),
      amount: Number(t.amount) || 0,
      ref: t.reference,
      status: t.status
    }));
    return [...purchases, ...funds].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [orders, wallet]);

  const handleDownloadPayment = (p) => {
    if (p.kind === 'purchase') {
      const order = orders.find((o) => o.id === p.id || o.order_ref === p.ref);
      downloadReceiptPdf({
        ref: p.ref,
        subtitle: 'ORDER RECEIPT',
        date: p.date,
        amount: p.amount,
        status: p.status,
        sectionTitle: 'YOUR PURCHASE',
        rows: order
          ? order.type === 'virtual_number'
            ? [
                ['Phone Number', order.number || ''],
                ['Service', order.service],
                ['Country', order.country],
                ['SMS Code', order.sms || 'Not received yet'],
                ['Status', order.status]
              ]
            : [
                ['Platform', order.platform],
                ['Username / Email', order.username],
                ['Password', order.password]
              ]
          : [['Product', p.title]]
      });
    } else if (p.kind === 'fund') {
      if (p.type === 'credit') {
        downloadReceiptPdf({
          ref: p.ref,
          subtitle: 'FUNDING RECEIPT',
          date: p.date,
          amount: p.amount,
          status: 'Completed',
          rows: [['Type', 'Wallet Top-up']],
          sectionTitle: 'DETAILS',
          note: 'Thank you for funding your wallet!'
        });
      } else {
        downloadReceiptPdf({
          ref: p.ref,
          subtitle: 'PAYMENT RECEIPT',
          date: p.date,
          amount: p.amount,
          status: 'Completed',
          rows: [['Type', 'Purchase Payment'], ['Product', p.title]],
          sectionTitle: 'DETAILS'
        });
      }
    }
  };

  const totalSpent = useMemo(() => orders.reduce((s, o) => s + (Number(o.price) || 0), 0), [orders]);
  const activeNumbers = useMemo(() => numberOrders.filter((o) => o.status !== 'cancelled' && o.status !== 'received').length, [numberOrders]);

  return (
    <DashboardLayout
      title={tab === 'overview' ? `Welcome, ${user?.name?.split(' ')[0]}` : (TITLES[tab] || 'Dashboard')}
    >
      {fundRef && (
        <div className="mb-6 rounded-[12px] border border-gold/20 bg-gold/10 px-4 py-3 flex items-center gap-2.5 text-[0.9rem] text-gold">
          <RefreshCw size={16} strokeWidth={1.9} className="animate-spin shrink-0" />
          Processing your top-up… we&apos;ll update your balance automatically.
        </div>
      )}

      {error && (
        <div className="bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.9rem] rounded-[10px] px-4 py-3 mb-6 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle size={17} strokeWidth={1.9} /> {error}
          </span>
          <button onClick={() => setError('')} className="font-bold ml-3 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* ===== OVERVIEW ===== */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <WalletCard balance={wallet} onFunded={() => loadWallet(true)} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-border bg-gold/5 rounded-[15px] p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <Package size={22} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-gray-500">Total Orders</div>
                <div className="font-syne text-xl">{orders.length}</div>
              </div>
            </div>
            <div className="card-border bg-gold/5 rounded-[15px] p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <Smartphone size={22} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-gray-500">Active Numbers</div>
                <div className="font-syne text-xl">{activeNumbers}</div>
              </div>
            </div>
            <div className="card-border bg-gold/5 rounded-[15px] p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <TrendingUp size={22} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-gray-500">Total Spent</div>
                <div className="font-syne text-xl">{fmtNgn(totalSpent)}</div>
              </div>
            </div>
          </div>

          <PanelCard
            title="Recent Orders"
            actions={orders.length > 0 && <button onClick={() => setTab('orders')} className="text-[0.85rem] text-gold hover:text-gold-light">View all →</button>}
          >
            {orders.length === 0 ? (
              <p className="text-gray-500 text-[0.95rem] py-6 text-center">
                No orders yet. Buy your first virtual number or account to get started.
              </p>
            ) : (
              <div className="divide-y divide-white/5">
                {orders.slice(0, 4).map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-gold w-8 h-8 rounded-[8px] bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                        {order.type === 'virtual_number' ? <Smartphone size={16} /> : <UserRound size={16} />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[0.92rem] font-medium truncate">
                          {order.type === 'virtual_number' ? `${order.service} · ${order.country}` : order.platform}
                        </div>
                        <div className="text-gray-500 text-[0.75rem]">
                          {order.order_ref || order.id} · {new Date(order.purchasedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span className="text-[0.9rem] font-semibold shrink-0">{fmtNgn(order.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      )}

      {/* ===== STORE ===== */}
      {tab === 'store' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <Store size={22} strokeWidth={1.8} />
              </span>
              <div>
                <div className="font-syne text-lg">Marketplace</div>
                <div className="text-gray-500 text-[0.8rem]">Virtual numbers &amp; social accounts ready to buy</div>
              </div>
            </div>
            <div className="flex gap-2 p-1 rounded-full border border-gold/20 bg-gold/5">
              {[
                { key: 'numbers', label: 'Virtual Numbers', icon: Smartphone },
                { key: 'accounts', label: 'Social Accounts', icon: UserRound }
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => setStoreView(v.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[0.85rem] font-medium transition-all ${
                    storeView === v.key ? 'bg-gold text-night' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <v.icon size={16} strokeWidth={1.9} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {storeView === 'numbers' ? (
            <PanelCard
              title="Numbers by Country"
              actions={
                <div className="relative w-full max-w-[280px]">
                  <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Search country or service…"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#0d0d0d] border border-gold/20 rounded-[10px] text-white text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-[#555]"
                  />
                </div>
              }
            >
              {filteredCountries.length === 0 ? (
                <p className="text-gray-500 text-[0.95rem] py-6 text-center">
                  {numbersByCountry.length === 0
                    ? 'No virtual numbers are available right now. Check back soon.'
                    : `No results for "${storeSearch.trim()}".`}
                </p>
              ) : (
                <CascadingNumbers
                  items={filteredCountries.flatMap((g) => g.items)}
                  onBuy={handleBuyNumber}
                  busy={busy}
                />
              )}
            </PanelCard>
          ) : (
            <PanelCard
              title="Social Media Accounts"
              actions={
                <div className="relative w-full max-w-[280px]">
                  <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Search platform…"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#0d0d0d] border border-gold/20 rounded-[10px] text-white text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-[#555]"
                  />
                </div>
              }
            >
              {filteredAccounts.length === 0 ? (
                <p className="text-gray-500 text-[0.95rem] py-6 text-center">
                  {catalog.accounts.length === 0
                    ? 'No social accounts are listed right now. Check back soon.'
                    : `No results for "${storeSearch.trim()}".`}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAccounts.map((p) => {
                    const Icon = platformIcon(p.platform);
                    return (
                      <div key={p.id} className="card-border bg-night/40 rounded-[12px] p-5 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                            <Icon size={20} strokeWidth={1.8} />
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-[0.95rem] truncate">{p.platform}</div>
                            <div className="text-gray-500 text-[0.78rem]">{p.countryName || p.country}</div>
                          </div>
                        </div>
                        {p.desc && <p className="text-gray-400 text-[0.85rem] mb-3">{p.desc}</p>}
                        <div className="text-[0.9rem] mb-4">
                          <span className="text-gold font-semibold text-lg">{fmtNgn(p.price)}</span>
                        </div>
                        <button
                          onClick={() => handleBuyAccount(p)}
                          disabled={Boolean(busy)}
                          className="btn-gold w-full py-3 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {busy === `buy-${p.id}` ? 'Purchasing...' : 'Buy Account'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelCard>
          )}
        </div>
      )}

      {/* ===== NUMBERS ===== */}
      {tab === 'numbers' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-[12px] border border-gold/20 bg-gold/5 px-4 py-3.5 text-[0.88rem] text-gray-300">
            <Smartphone size={17} strokeWidth={1.9} className="text-gold shrink-0 mt-0.5" />
            <p>
              Your purchased numbers and their SMS codes appear under <span className="text-gold font-medium">&quot;Your Numbers&quot;</span> below. Social media account credentials are saved under <span className="text-gold font-medium">&quot;Paid Accounts&quot;</span> in the dashboard sidebar.
            </p>
          </div>
          <PanelCard
            title="Buy a Virtual Number"
            actions={
              <div className="relative w-full max-w-[280px]">
                <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  value={numbersSearch}
                  onChange={(e) => setNumbersSearch(e.target.value)}
                  placeholder="Search service or country…"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0d0d0d] border border-gold/20 rounded-[10px] text-white text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-[#555]"
                />
              </div>
            }
          >
            {filteredNumbers.length === 0 ? (
              <p className="text-gray-500 text-[0.95rem] py-6 text-center">
                {catalog.numbers.length === 0
                  ? 'No virtual numbers are available right now. Check back soon.'
                  : `No results for "${numbersSearch.trim()}".`}
              </p>
            ) : (
              <CascadingNumbers items={filteredNumbers} onBuy={handleBuyNumber} busy={busy} />
            )}
          </PanelCard>

          <PanelCard title="Your Numbers">
            {numberOrders.length === 0 ? (
              <p className="text-gray-500 text-[0.95rem] py-6 text-center">
                No numbers yet. Buy one above to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {numberOrders.map((order) => (
                  <div key={order.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="font-medium text-[0.95rem]">
                          {order.service} · {order.country}
                        </div>
                        <div className="text-gray-500 text-[0.8rem]">
                          {order.order_ref || order.id} · {new Date(order.purchasedAt || Date.now()).toLocaleString()}
                        </div>
                      </div>
                      <span
                        className={`text-[0.72rem] font-semibold uppercase px-3 py-1 rounded-[50px] border ${
                          order.status === 'cancelled' || order.status === 'expired'
                            ? 'text-[#e0645a] border-[#e0645a]/40 bg-[#e0645a]/10'
                            : order.status === 'received'
                              ? 'text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10'
                              : 'text-gold border-gold/40 bg-gold/10'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    {order.number && <Row label="Number" value={order.number} mono />}
                    <Row label="Amount" value={fmtNgn(order.price)} />
                    {order.sms && <Row label="SMS Code" value={order.sms} mono />}

                    {order.status !== 'received' && order.status !== 'cancelled' && order.status !== 'expired' && (
                      expiredIds.has(order.id) ? (
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2 text-[0.82rem] text-[#e0645a]">
                          <AlertTriangle size={14} strokeWidth={1.9} className="shrink-0 mt-0.5" />
                          <span>SMS window has closed and no code was received. You can cancel for a refund.</span>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[0.82rem] text-gray-400">
                          <Clock size={14} strokeWidth={1.9} className="text-gold shrink-0" />
                          <CountdownTimer
                            expiresAt={smsExpiresAt(order)}
                            onExpired={() => setExpiredIds((prev) => new Set([...prev, order.id]))}
                            className="text-gold"
                          />
                          <span>left for the SMS code to arrive</span>
                        </div>
                      )
                    )}

                    {order.status !== 'cancelled' && order.status !== 'received' && (
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => handleCheckSms(order.order_ref)}
                          disabled={Boolean(checkingSms)}
                          className="btn-ghost px-4 py-2 text-[0.8rem] disabled:opacity-60 flex items-center gap-1.5"
                        >
                          <MessageSquare size={14} strokeWidth={1.9} />
                          {checkingSms === order.order_ref ? 'Checking...' : 'Check SMS'}
                        </button>
                        <button
                          onClick={() => handleCancel(order.order_ref)}
                          disabled={Boolean(cancelling)}
                          className="px-4 py-2 rounded-[50px] font-semibold text-[0.8rem] bg-transparent text-[#e0645a] border border-[#e0645a]/40 hover:bg-[#e0645a]/10 disabled:opacity-60"
                        >
                          {cancelling === order.order_ref ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    )}

                    {smsNote?.ref === order.order_ref && (
                      <div className="mt-3 text-[0.8rem] text-gray-400 flex items-start gap-2">
                        <Clock size={13} strokeWidth={1.9} className="text-gold shrink-0 mt-0.5" />
                        <span>{smsNote.message}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      )}

      {/* ===== ACCOUNTS ===== */}
      {tab === 'accounts' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-[12px] border border-gold/20 bg-gold/5 px-4 py-3.5 text-[0.88rem] text-gray-300">
            <UserRound size={17} strokeWidth={1.9} className="text-gold shrink-0 mt-0.5" />
            <p>
              Once your payment is successful, your account username and password appear under{' '}
              <span className="text-gold font-medium">&quot;Paid Accounts&quot;</span> in the dashboard sidebar.
            </p>
          </div>
          <PanelCard title="Social Media Accounts">
            {catalog.accounts.length === 0 ? (
              <p className="text-gray-500 text-[0.95rem] py-6 text-center">
                No social accounts are listed right now. Check back soon.
              </p>
            ) : (
              <CascadingAccounts items={catalog.accounts} onBuy={handleBuyAccount} busy={busy} />
            )}
          </PanelCard>
        </div>
      )}

      {/* ===== PAID ACCOUNTS ===== */}
      {tab === 'paid-accounts' && (
        <PanelCard
          title="Paid Accounts"
          actions={
            <RefreshButton onClick={loadPaidAccounts} />
          }
        >
          {paidAccounts.length === 0 ? (
            <div className="text-center py-10">
              <KeyRound size={42} strokeWidth={1.4} className="text-gold mx-auto mb-4" />
              <p className="text-gray-500 text-[0.95rem]">
                You haven&apos;t purchased any social media accounts yet. Your purchased account credentials will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paidAccounts.map((a) => {
                const Icon = platformIcon(a.platform);
                const pending = a.status === 'pending' || (!a.username && !a.password);
                return (
                  <div key={a.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                          <Icon size={18} strokeWidth={1.8} />
                        </span>
                        <div>
                          <div className="font-medium text-[0.95rem]">{a.platform}</div>
                          <div className="text-gray-500 text-[0.8rem]">
                            {a.order_ref} · {new Date(a.purchasedAt || Date.now()).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <span className="text-[0.9rem] font-semibold text-gold">{fmtNgn(a.price)}</span>
                    </div>
                    {pending ? (
                      <div className="flex items-center justify-between gap-3 flex-wrap bg-night/50 border border-gold/20 rounded-[10px] px-4 py-3">
                        <div className="flex items-center gap-2.5 text-[0.9rem] text-gray-300">
                          <RefreshCw size={16} strokeWidth={1.9} className="text-gold animate-spin" />
                          <span>
                            Your account is being prepared by the provider. Credentials will be emailed to you and appear in Paid Accounts within{' '}
                            <CountdownTimer
                              expiresAt={a.expiresAt || new Date(new Date(a.purchasedAt || Date.now()).getTime() + 10 * 60 * 1000).toISOString()}
                              className="text-gold font-semibold"
                            />
                          </span>
                        </div>
                        <button
                          onClick={() => pollAccountStatus(a.order_ref)}
                          className="btn-ghost px-4 py-2 text-[0.8rem]"
                        >
                          Check Status
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-night/50 border border-gold/15 rounded-[10px] px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[0.65rem] uppercase tracking-widest text-gray-500 font-semibold">Username / Email</div>
                              <div className="font-mono text-[0.92rem] break-all">{a.username}</div>
                            </div>
                            <button onClick={() => copyText(a.username, `u-${a.id}`)} className="text-gold hover:bg-gold/10 rounded-[8px] p-2 shrink-0">
                              {copied === `u-${a.id}` ? <Check size={17} /> : <Copy size={17} />}
                            </button>
                          </div>
                          <div className="bg-night/50 border border-gold/15 rounded-[10px] px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[0.65rem] uppercase tracking-widest text-gray-500 font-semibold">Password</div>
                              <div className="font-mono text-[0.92rem] break-all">{a.password}</div>
                            </div>
                            <button onClick={() => copyText(a.password, `p-${a.id}`)} className="text-gold hover:bg-gold/10 rounded-[8px] p-2 shrink-0">
                              {copied === `p-${a.id}` ? <Check size={17} /> : <Copy size={17} />}
                            </button>
                          </div>
                        </div>
                        <p className="text-[0.75rem] text-gray-500 mt-3 flex items-center gap-1.5">
                          <Landmark size={14} strokeWidth={1.8} className="text-gold" />
                          Keep these credentials safe. Store them somewhere secure.
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>
      )}

      {/* ===== ORDER HISTORY ===== */}
      {tab === 'orders' && (
        <PanelCard
          title="Order History"
          actions={
            <RefreshButton onClick={() => Promise.all([loadWallet(), loadOrders()])} />
          }
        >
          {paymentHistory.length === 0 ? (
            <p className="text-gray-500 text-[0.95rem] py-10 text-center">
              No payments yet. Fund your wallet or make a purchase and it will show up here.
            </p>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((p) => (
                <div key={p.id} className="bg-gold/5 border border-gold/15 rounded-[12px] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 border ${
                        p.kind === 'fund'
                          ? p.type === 'credit'
                            ? 'text-[#2ecc71] border-[#2ecc71]/30 bg-[#2ecc71]/10'
                            : 'text-[#e0645a] border-[#e0645a]/30 bg-[#e0645a]/10'
                          : 'text-gold border-gold/25 bg-gold/10'
                      }`}
                    >
                      {p.kind === 'fund' ? (p.type === 'credit' ? <Wallet size={16} /> : <X size={16} />) : (p.type === 'virtual_number' ? <Smartphone size={16} /> : <UserRound size={16} />)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[0.92rem] font-medium truncate">{p.title}</div>
                      <div className="text-gray-500 text-[0.78rem] font-mono truncate">
                        {p.ref} · {new Date(p.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-semibold text-[0.95rem] ${p.kind === 'fund' && p.type === 'credit' ? 'text-[#2ecc71]' : ''}`}>
                      {p.kind === 'fund' && p.type === 'credit' ? '+' : ''}{fmtNgn(p.amount)}
                    </span>
                    <span className="text-[0.68rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border text-gold border-gold/30 bg-gold/10">
                      {p.status}
                    </span>
                    {isSuccessfulPayment(p) && (
                      <button
                        onClick={() => handleDownloadPayment(p)}
                        title="Download receipt"
                        className="text-gold hover:bg-gold/10 rounded-[8px] p-1.5 transition-colors"
                      >
                        <Download size={15} strokeWidth={1.9} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      )}

      {/* ===== PROFILE ===== */}
      {tab === 'profile' && (
        <PanelCard title="My Profile">
          <div className="space-y-6">
            <div className="bg-black/40 border border-gold/10 rounded-[12px] p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-night font-bold text-3xl shadow-lg">
                {(user?.name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-syne text-2xl mb-1">{user?.name}</h3>
                <p className="text-gray-400 text-[1rem]">{user?.email}</p>
                <div className="mt-4 inline-block bg-gold/10 border border-gold/20 text-gold px-4 py-2 rounded-[50px] text-[0.85rem] font-medium">
                  {wallet ? `Wallet: ${fmtNgn(wallet.balance)}` : 'Wallet: Offline'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5">
                <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 mb-1">Account ID</div>
                <div className="font-mono text-[0.95rem]">{user?.id || '—'}</div>
              </div>
              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5">
                <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 mb-1">Member Since</div>
                <div className="font-medium text-[0.95rem]">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
              </div>
            </div>

            <div className="bg-gold/5 border border-gold/15 rounded-[12px] p-6">
              <h4 className="font-syne text-lg mb-2 flex items-center gap-2">
                <Headphones size={18} strokeWidth={1.9} className="text-gold" />
                Customer Support
              </h4>
              <p className="text-gray-400 text-[0.9rem] leading-relaxed">
                Having any issues with your orders or account? Send us an email at{' '}
                <a href="mailto:spencersbm1@hotmail.com" className="text-gold hover:text-gold-light break-all">
                  spencersbm1@hotmail.com
                </a>{' '}
                and our support team will get back to you promptly.
              </p>
            </div>
          </div>
        </PanelCard>
      )}

      <SuccessModal
        open={successOpen}
        order={lastPurchase}
        onClose={() => setSuccessOpen(false)}
        onViewAccounts={() => { setSuccessOpen(false); setTab('paid-accounts'); }}
        onCheckSms={handleModalCheckSms}
        checkingSms={Boolean(checkingSms)}
      />
    </DashboardLayout>
  );
}