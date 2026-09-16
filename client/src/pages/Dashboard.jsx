import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Smartphone, UserRound, MessageSquare, RefreshCw, Check, Copy, Landmark,
  Wallet, TrendingUp, Package, KeyRound, X, Store, Search, Headphones, Clock, Download,
  MessageCircle, ChevronDown, ChevronUp, LayoutGrid, ShoppingCart,
  Globe, SlidersHorizontal, Rocket, ArrowRight, Send, Link as LinkIcon,
  History, Boxes
} from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import WalletCard from '../components/WalletCard.jsx';
import SuccessModal from '../components/SuccessModal.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import { platformIcon } from '../data/marketplace.js';
import QuantityStepper from '../components/QuantityStepper.jsx';
import Pagination from '../components/Pagination.jsx';
import { downloadReceiptPdf } from '../utils/receipt.js';
import { TelegramIcon } from '../components/SocialIcons.jsx';

const TITLES = {
  overview: 'Overview',
  marketplace: 'Marketplace',
  categories: 'Account Categories',
  sms: 'SMS Verification',
  followers: 'Followers Growth',
  orders: 'My Orders',
  profile: 'My Profile',
  transactions: 'Transaction History'
};

const SUBTITLES = {
  marketplace: 'Verified social & digital accounts, ready to deliver',
  categories: 'Browse accounts by platform',
  sms: 'Virtual numbers for any OTP',
  followers: 'Grow any social platform on autopilot',
  orders: 'Your numbers, accounts & credentials',
  transactions: 'Every payment, top-up and refund'
};

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-muted text-[0.85rem]">{label}</span>
      <span className={`text-right font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function PanelCard({ title, children, actions, icon: Icon }) {
  return (
    <div className="card-border bg-gold/3 rounded-[18px] p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2 className="font-syne text-xl flex items-center gap-2.5">
          {Icon && (
            <span className="w-9 h-9 rounded-[10px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
              <Icon size={18} strokeWidth={1.9} />
            </span>
          )}
          {title}
        </h2>
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

const fmtNgn = (n) => `₦${Number(n || 0).toLocaleString()}`;

const TRANSFER_NOTICE =
  'After a successful bank transfer, If you haven\'t seen the funds yet refresh this page and wait up to 5 minutes for your balance to reflect — your order is delivered as soon as the transaction is confirmed. Need help? Go to the Profile tab and contact SpencerSBM.';

// Numbers keep the same SMS window the provider uses (~20 min). Old orders that
// predate expiresAt fall back to purchasedAt + 20 minutes.
const SMS_EXPIRY_MS = 20 * 60 * 1000;
const NUMBERS_PAGE_SIZE = 5;
const HISTORY_PAGE_SIZE = 20;
const PAID_PAGE_SIZE = 10;
const smsExpiresAt = (order) =>
  order.expiresAt ||
  new Date(new Date(order.purchasedAt || Date.now()).getTime() + SMS_EXPIRY_MS).toISOString();

// A provider sometimes delivers only part of the code (e.g. "447" instead of the
// full "447684"). Codes shorter than 4 digits are flagged as incomplete so users
// don't mistake a broken code for the real one.
const isIncompleteSms = (order) => {
  if (!order?.sms) return false;
  const digits = String(order.sms).replace(/\D/g, '');
  return digits.length >= 1 && digits.length < 4;
};

const isSuccessfulPayment = (p) =>
  !['cancelled', 'expired', 'failed', 'initiated'].includes(String(p.status || '').toLowerCase());

// Status pill that reflects whether a Bulnix-backed service is connected yet.
function StatusPill({ live }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[0.72rem] font-semibold px-3 py-1 rounded-full border ${
        live
          ? 'text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10'
          : 'text-gold border-gold/40 bg-gold/10'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-[#2ecc71]' : 'bg-gold animate-pulse'}`} />
      {live ? 'Live' : 'Connecting soon'}
    </span>
  );
}

// Premium "being connected / coming soon" service page. Shows the vision for a
// Bulnix-backed service and lights up its status as keys arrive.
function ComingSoon({ icon: Icon, title, tagline, points, live, children }) {
  return (
    <div className="space-y-6">
      <div className="card-border bg-gold/3 rounded-[20px] p-8 md:p-10 relative overflow-hidden shine-overlay">
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-gold/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <span className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-gold-light to-gold-dark text-night flex items-center justify-center shrink-0 shadow-[0_10px_28px_rgba(255,199,0,0.4)]">
            <Icon size={30} strokeWidth={1.8} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="font-syne text-2xl md:text-3xl">{title}</h2>
              <StatusPill live={live} />
            </div>
            <p className="text-muted text-[0.98rem] max-w-[560px]">{tagline}</p>
          </div>
        </div>
      </div>

      {points?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {points.map((pt) => (
            <div key={pt.title} className="card-border bg-card rounded-[14px] p-5 card-hover">
              <span className="w-10 h-10 rounded-[11px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center mb-3">
                <pt.icon size={19} strokeWidth={1.9} />
              </span>
              <div className="font-medium text-[0.98rem] mb-1">{pt.title}</div>
              <div className="text-faint text-[0.85rem] leading-relaxed">{pt.desc}</div>
            </div>
          ))}
        </div>
      )}

      {children}

      {!live && (
        <div className="rounded-[12px] border border-gold/20 bg-gold/8 px-5 py-4 flex items-start gap-3 text-[0.9rem] text-body/80">
          <Rocket size={18} strokeWidth={1.9} className="text-gold shrink-0 mt-0.5" />
          <p>
            We&apos;re putting the finishing touches on this service. It will go live here automatically —
            no need to check back manually. Meanwhile, explore the <span className="text-gold font-medium">Marketplace</span> and <span className="text-gold font-medium">SMS Verification</span>.
          </p>
        </div>
      )}
    </div>
  );
}

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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [lastPurchase, setLastPurchase] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const [checkingSms, setCheckingSms] = useState('');
  const [cancelling, setCancelling] = useState('');
  const [smsNote, setSmsNote] = useState(null);
  const [expiredIds, setExpiredIds] = useState(() => new Set());
  const [numbersSearch, setNumbersSearch] = useState('');
  const [numbersPage, setNumbersPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [paidPage, setPaidPage] = useState(1);
  const [openAccounts, setOpenAccounts] = useState(() => new Set());

  // ----- Bulnix SMS (virtual numbers): country → service purchase flow -----
  const [smsCountries, setSmsCountries] = useState([]);
  const [smsCountry, setSmsCountry] = useState('');
  const [smsCountriesLoading, setSmsCountriesLoading] = useState(false);
  const [smsServices, setSmsServices] = useState([]);
  const [smsServicesLoading, setSmsServicesLoading] = useState(false);

  // ----- Bulnix (new provider) state -----
  const [bxStatus, setBxStatus] = useState(null); // { marketplace, sms, followers }
  const [bxCategories, setBxCategories] = useState([]);
  const [bxProducts, setBxProducts] = useState([]);
  const [bxLoadingProducts, setBxLoadingProducts] = useState(false);
  const [mktSearch, setMktSearch] = useState('');
  const [mktSearchDebounced, setMktSearchDebounced] = useState('');
  const [mktCategory, setMktCategory] = useState('');
  const [mktQty, setMktQty] = useState({});
  const [smsRoute, setSmsRoute] = useState('worldwide');

  // Followers Growth
  const [flServices, setFlServices] = useState([]);
  const [flForm, setFlForm] = useState({ serviceId: '', link: '', quantity: '' });
  const [flBusy, setFlBusy] = useState(false);
  const [flMsg, setFlMsg] = useState(null);
  const [flPlatform, setFlPlatform] = useState('Instagram');

  const bxOn = (svc) => Boolean(bxStatus?.[svc]);

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

  const loadBxStatus = async () => {
    try {
      const res = await api.get('/bulnix/status');
      setBxStatus(res.data?.services || {});
    } catch {
      setBxStatus({});
    }
  };

  const loadBxCategories = async () => {
    try {
      const res = await api.get('/bulnix/marketplace/categories');
      setBxCategories(res.data?.categories || []);
    } catch {
      setBxCategories([]);
    }
  };

  // Load Bulnix SMS countries once the SMS tab is open and the service is live.
  useEffect(() => {
    if (tab !== 'sms' || !bxOn('sms') || smsCountries.length) return;
    let cancelled = false;
    setSmsCountriesLoading(true);
    api.get('/bulnix/sms/countries', { params: { channel: 'worldwide' } })
      .then((res) => { if (!cancelled) setSmsCountries(res.data?.countries || []); })
      .catch(() => { if (!cancelled) setSmsCountries([]); })
      .finally(() => { if (!cancelled) setSmsCountriesLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bxStatus]);

  // Load the verification services available for the chosen country.
  useEffect(() => {
    if (!smsCountry) { setSmsServices([]); return; }
    let cancelled = false;
    setSmsServicesLoading(true);
    setSmsServices([]);
    api.get('/bulnix/sms/services', { params: { channel: 'worldwide', country_code: smsCountry } })
      .then((res) => { if (!cancelled) setSmsServices(res.data?.services || []); })
      .catch(() => { if (!cancelled) setSmsServices([]); })
      .finally(() => { if (!cancelled) setSmsServicesLoading(false); });
    return () => { cancelled = true; };
  }, [smsCountry]);

  useEffect(() => {
    loadWallet(true);
    loadCatalog();
    loadOrders();
    loadPaidAccounts();
    loadBxStatus();
    loadBxCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the marketplace search box.
  useEffect(() => {
    const t = setTimeout(() => setMktSearchDebounced(mktSearch.trim()), 350);
    return () => clearTimeout(t);
  }, [mktSearch]);

  // Load Bulnix marketplace products when the tab is open and the service is live.
  useEffect(() => {
    if (tab !== 'marketplace' || !bxOn('marketplace')) return;
    let cancelled = false;
    setBxLoadingProducts(true);
    api
      .get('/bulnix/marketplace/products', {
        params: { category: mktCategory || undefined, search: mktSearchDebounced || undefined, limit: 60 }
      })
      .then((res) => {
        if (cancelled) return;
        setBxProducts(res.data?.products || []);
      })
      .catch(() => {
        if (!cancelled) setBxProducts([]);
      })
      .finally(() => {
        if (!cancelled) setBxLoadingProducts(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bxStatus, mktCategory, mktSearchDebounced]);

  // Load Followers services for the selected platform when live.
  useEffect(() => {
    if (tab !== 'followers' || !bxOn('followers')) return;
    let cancelled = false;
    const search = flPlatform ? flPlatform.split(/[\s/]+/)[0].toLowerCase() : undefined;
    setFlServices([]);
    api.get('/bulnix/followers/services', { params: { search } }).then((res) => {
      if (!cancelled) setFlServices(Array.isArray(res.data?.services) ? res.data.services : []);
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bxStatus, flPlatform]);

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

  // Buy a Bulnix virtual number for the selected country + service (worldwide route).
  // The SMS code arrives afterwards via /orders/status polling (Check SMS button).
  const handleBuyNumber = async (service) => {
    if (busy || !smsCountry) return;
    setError('');
    setBusy(`buy-${service.slug}`);
    try {
      const res = await api.post('/bulnix/sms/order', {
        channel: 'worldwide',
        countryCode: smsCountry,
        serviceSlug: service.slug
      });
      setLastPurchase(res.data.order ? [res.data.order] : (res.data.orders || []));
      setSuccessOpen(true);
      loadWallet(true);
      loadOrders(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  // Buy admin-stocked inventory accounts. Credentials are delivered synchronously.
  const handleBuyAccount = async (product, quantity = 1) => {
    if (busy) return;
    setError('');
    setBusy(`buy-${product.id}`);
    try {
      const res = await api.post('/orders/accounts', { productId: product.id, quantity });
      const orders = res.data.orders || [res.data.order];
      setLastPurchase(orders);
      setSuccessOpen(true);
      loadWallet(true);
      loadOrders(true);
      loadPaidAccounts(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  // Bulnix marketplace purchase — same wallet-backed UX as handleBuyAccount.
  const handleBuyBulnix = async (product, quantity = 1) => {
    if (busy) return;
    setError('');
    setBusy(`buy-${product.id}`);
    try {
      const res = await api.post('/bulnix/marketplace/order', { productId: product.id, quantity });
      const orders = res.data.orders || [res.data.order];
      setLastPurchase(orders);
      setSuccessOpen(true);
      loadWallet(true);
      loadOrders(true);
      loadPaidAccounts(true);
      const pendingRefs = (orders || [])
        .filter((o) => o.status === 'pending' && (!o.username || !o.password))
        .map((o) => o.order_ref || o.id);
      pendingRefs.forEach((ref) => pollBulnixStatus(ref));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const handleBuyMarketplace = (item, quantity = 1) => {
    if (item.source === 'bulnix') return handleBuyBulnix(item, quantity);
    return handleBuyAccount(item, quantity);
  };

  // Poll a pending Bulnix marketplace order until credentials are delivered.
  const pollBulnixStatus = async (orderRef) => {
    for (let i = 0; i < 20; i += 1) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await api.get(`/bulnix/marketplace/order/${encodeURIComponent(orderRef)}/status`);
        loadOrders(true);
        loadPaidAccounts(true);
        if (res.data?.delivered) {
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

      // Provider killed the number — auto-refunded by backend.
      if (res.data?._expired) {
        loadWallet(true);
        if (res.data?._refunded) {
          setSmsNote({ ref: orderRef, message: res.data?.message || 'This number went dead. The provider cancelled it without delivering an SMS code. You have been automatically refunded.' });
        } else {
          setSmsNote({ ref: orderRef, message: 'This number went dead — the provider cancelled it without delivering an SMS code.' });
        }
        return;
      }

      const hasCode = Boolean(res.data?.otp || res.data?.sms || res.data?.code || res.data?.sms_code);
      if (hasCode) {
        const raw = res.data?.otp || res.data?.sms || res.data?.code || res.data?.sms_code;
        const digits = String(raw || '').replace(/\D/g, '');
        if (digits.length && digits.length < 4) {
          setSmsNote({ ref: orderRef, message: 'The provider returned an incomplete code (it got cut short). Keep checking, or cancel for a full refund.' });
        }
      } else {
        setSmsNote({ ref: orderRef, message: 'No code yet — it usually arrives within the SMS window Above. Keep checking.' });
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
      const statusRes = await api.get('/orders/status', { params: { order_ref: orderRef } });
      // If provider killed the number, refresh wallet for the auto-refund.
      if (statusRes.data?._expired) loadWallet(true);
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
      loadPaidAccounts(true);
      loadWallet(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancelling('');
    }
  };

  const handlePlaceCampaign = async (e) => {
    e?.preventDefault?.();
    if (flBusy) return;
    setFlMsg(null);
    if (!flForm.link.trim()) {
      setFlMsg({ type: 'error', text: 'Paste the link to your profile or post.' });
      return;
    }
    setFlBusy(true);
    try {
      const res = await api.post('/bulnix/followers/order', {
        serviceId: flForm.serviceId,
        link: flForm.link.trim(),
        quantity: Number(flForm.quantity) || undefined
      });
      setFlMsg({ type: 'success', text: 'Campaign placed! It will begin processing shortly.' });
      setFlForm({ serviceId: '', link: '', quantity: '' });
      loadWallet(true);
      return res;
    } catch (err) {
      setFlMsg({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setFlBusy(false);
    }
  };

  const numberOrders = useMemo(() => orders.filter((o) => o.type === 'virtual_number'), [orders]);

  // SMS services for the chosen country, filtered by the search box.
  const filteredSmsServices = useMemo(() => {
    const q = numbersSearch.trim().toLowerCase();
    if (!q) return smsServices;
    return smsServices.filter((s) =>
      String(s.name || s.slug || '').toLowerCase().includes(q)
    );
  }, [smsServices, numbersSearch]);

  // Marketplace items — Bulnix when live, else the local admin-stocked catalog.
  const usingBulnixMarket = bxOn('marketplace');
  const marketplaceItems = useMemo(() => {
    if (usingBulnixMarket) {
      return bxProducts.map((p) => ({
        id: String(p.id),
        source: 'bulnix',
        title: p.name || p.platform || 'Account',
        subtitle: p.category || p.platform || p.country || '',
        platform: p.platform || p.category || p.name,
        price: p.price,
        priceUsd: p.priceUsd,
        stock: p.stock,
        desc: p.description
      }));
    }
    const q = mktSearchDebounced.toLowerCase();
    return catalog.accounts
      .filter((p) => !q ||
        String(p.platform || '').toLowerCase().includes(q) ||
        String(p.desc || '').toLowerCase().includes(q) ||
        String(p.countryName || p.country || '').toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        source: 'catalog',
        title: p.desc || p.platform,
        subtitle: p.countryName || p.country || p.platform,
        platform: p.platform,
        price: p.price,
        priceUsd: null,
        stock: typeof p.stock === 'number' ? p.stock : null,
        country: p.country
      }));
  }, [usingBulnixMarket, bxProducts, catalog.accounts, mktSearchDebounced]);

  // Categories — Bulnix categories when live, else derived from the local catalog.
  const categoriesList = useMemo(() => {
    if (bxOn('marketplace') && bxCategories.length) {
      return bxCategories.map((c) => ({ id: String(c.id), name: c.name, count: c.count }));
    }
    const map = {};
    catalog.accounts.forEach((a) => {
      const k = a.platform || 'Other';
      if (!map[k]) map[k] = { id: k, name: k, count: 0 };
      map[k].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [bxStatus, bxCategories, catalog.accounts]);

  const openCategory = (cat) => {
    if (bxOn('marketplace')) {
      setMktCategory(String(cat.id));
      setMktSearch('');
    } else {
      setMktCategory('');
      setMktSearch(cat.name);
    }
    setTab('marketplace');
  };

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
                ['Password', order.password],
                ...(order.email ? [['Account Email', order.email]] : []),
                ...(order.email_password || order.emailPassword ? [['Email Password', order.email_password || order.emailPassword]] : []),
                ...(order.recovery ? [['Recovery', order.recovery]] : [])
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

  const numbersTotalPages = Math.max(1, Math.ceil(numberOrders.length / NUMBERS_PAGE_SIZE));
  const safeNumbersPage = Math.min(numbersPage, numbersTotalPages);
  const visibleNumberOrders = numberOrders.slice((safeNumbersPage - 1) * NUMBERS_PAGE_SIZE, safeNumbersPage * NUMBERS_PAGE_SIZE);

  const historyTotalPages = Math.max(1, Math.ceil(paymentHistory.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const visiblePaymentHistory = paymentHistory.slice((safeHistoryPage - 1) * HISTORY_PAGE_SIZE, safeHistoryPage * HISTORY_PAGE_SIZE);

  const paidTotalPages = Math.max(1, Math.ceil(paidAccounts.length / PAID_PAGE_SIZE));
  const safePaidPage = Math.min(paidPage, paidTotalPages);
  const visiblePaidAccounts = paidAccounts.slice((safePaidPage - 1) * PAID_PAGE_SIZE, safePaidPage * PAID_PAGE_SIZE);

  const toggleAccount = (id) =>
    setOpenAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ---- Reusable render helpers (used across SMS + My Orders) ----
  const renderNumbersList = () => (
    <>
      {numberOrders.length === 0 ? (
        <p className="text-faint text-[0.95rem] py-6 text-center">
          No numbers yet. Buy one to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {visibleNumberOrders.map((order) => (
            <div key={order.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <div className="font-medium text-[0.95rem]">
                    {order.service} · {order.country}
                  </div>
                  <div className="text-faint text-[0.8rem]">
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
              {order.number && (
                <div className="flex justify-between gap-4 py-1.5">
                  <span className="text-muted text-[0.85rem]">Number</span>
                  <span className="text-right font-medium font-mono flex items-center gap-2">
                    {order.number}
                    <button
                      onClick={() => copyText(order.number, `num-${order.id}`)}
                      className="text-gold hover:bg-gold/10 rounded-[6px] p-1 shrink-0 transition-colors"
                      title="Copy number"
                    >
                      {copied === `num-${order.id}` ? <Check size={14} strokeWidth={2.2} /> : <Copy size={14} strokeWidth={2.2} />}
                    </button>
                  </span>
                </div>
              )}
              <Row label="Amount" value={fmtNgn(order.price)} />
              {order.sms && <Row label="SMS Code" value={order.sms} mono />}
              {order.status === 'expired' && (
                <div className="mt-3 rounded-[10px] border border-[#e0645a]/30 bg-[#e0645a]/10 px-4 py-3 text-[0.82rem] text-[#ff8a80] flex items-start gap-2">
                  <AlertTriangle size={15} strokeWidth={1.9} className="shrink-0 mt-0.5" />
                  <span>
                    This number went dead — the provider cancelled it without delivering an SMS code. Your refund has been processed automatically.
                  </span>
                </div>
              )}
              {isIncompleteSms(order) && (
                <div className="mt-3 rounded-[10px] border border-[#e0645a]/30 bg-[#e0645a]/10 px-4 py-3 text-[0.82rem] text-[#ff8a80] flex items-start gap-2">
                  <AlertTriangle size={15} strokeWidth={1.9} className="shrink-0 mt-0.5" />
                  <span>
                    This SMS code looks incomplete — the provider only delivered part of it. Click &quot;Check SMS&quot; again, or cancel for a full refund.
                  </span>
                </div>
              )}

              {order.status !== 'received' && order.status !== 'cancelled' && order.status !== 'expired' && (
                expiredIds.has(order.id) ? (
                  <div className="mt-3 pt-3 border-t border-softline flex items-start gap-2 text-[0.82rem] text-[#e0645a]">
                    <AlertTriangle size={14} strokeWidth={1.9} className="shrink-0 mt-0.5" />
                    <span>SMS window has closed and no code was received. You can cancel for a refund.</span>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-softline flex items-center gap-2 text-[0.82rem] text-muted">
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

              {order.status !== 'cancelled' && (order.status !== 'received' || isIncompleteSms(order)) && (
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
                <div className="mt-3 text-[0.8rem] text-muted flex items-start gap-2">
                  <Clock size={13} strokeWidth={1.9} className="text-gold shrink-0 mt-0.5" />
                  <span>{smsNote.message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination page={safeNumbersPage} totalPages={numbersTotalPages} onChange={setNumbersPage} />
    </>
  );

  const renderPaidAccountsList = () => (
    <>
      {paidAccounts.length === 0 ? (
        <div className="text-center py-10">
          <KeyRound size={42} strokeWidth={1.4} className="text-gold mx-auto mb-4" />
          <p className="text-faint text-[0.95rem]">
            You haven&apos;t purchased any social media accounts yet. Your purchased account credentials will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePaidAccounts.map((a) => {
            const Icon = platformIcon(a.platform || 'Account');
            const cancelled = a.status === 'cancelled';
            const pending = !cancelled && (a.status === 'pending' || (!a.username && !a.password));
            const open = openAccounts.has(a.id);
            return (
              <div key={a.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-5">
                <div className={`flex flex-wrap items-center justify-between gap-3 ${open ? 'mb-4' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <div>
                      <div className="font-medium text-[0.95rem]">{a.platform}</div>
                      <div className="text-faint text-[0.8rem]">
                        {a.order_ref} · {new Date(a.purchasedAt || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[0.72rem] font-semibold uppercase px-3 py-1 rounded-[50px] border ${
                        cancelled
                          ? 'text-[#e0645a] border-[#e0645a]/40 bg-[#e0645a]/10'
                          : pending
                            ? 'text-gold border-gold/40 bg-gold/10'
                            : 'text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10'
                      }`}
                    >
                      {cancelled ? 'cancelled' : pending ? 'processing' : 'completed'}
                    </span>
                    <span className="text-[0.9rem] font-semibold text-gold">{fmtNgn(a.price)}</span>
                    <button
                      onClick={() => toggleAccount(a.id)}
                      aria-label={open ? 'Hide account details' : 'Show account details'}
                      title={open ? 'Hide details' : 'Show details'}
                      className="w-9 h-9 flex items-center justify-center rounded-[9px] border border-gold/25 bg-gold/10 text-gold hover:bg-gold/20 transition-colors shrink-0"
                    >
                      {open ? <ChevronUp size={17} strokeWidth={2} /> : <ChevronDown size={17} strokeWidth={2} />}
                    </button>
                  </div>
                </div>
                {open && (cancelled ? (
                  <div className="flex items-center gap-2.5 text-[0.9rem] text-[#e0645a] bg-field border border-[#e0645a]/20 rounded-[10px] px-4 py-3">
                    <AlertTriangle size={16} strokeWidth={1.9} className="shrink-0" />
                    <span>
                      This order was cancelled and <strong>₦{Number(a.price || 0).toLocaleString()}</strong> was refunded to your wallet.
                    </span>
                  </div>
                ) : pending ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap bg-field border border-gold/20 rounded-[10px] px-4 py-3">
                    <div className="flex items-center gap-2.5 text-[0.9rem] text-body/80">
                      <RefreshCw size={16} strokeWidth={1.9} className="text-gold animate-spin shrink-0" />
                      <span>
                        Your account is being prepared by the provider. Credentials will appear here shortly.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { if (a.provider === 'bulnix') pollBulnixStatus(a.order_ref); else { loadOrders(true); loadPaidAccounts(true); } }}
                        className="btn-ghost px-4 py-2 text-[0.8rem]"
                      >
                        Check Status
                      </button>
                      <button
                        onClick={() => handleCancel(a.order_ref)}
                        disabled={Boolean(cancelling)}
                        className="px-4 py-2 rounded-[50px] font-semibold text-[0.8rem] bg-transparent text-[#e0645a] border border-[#e0645a]/40 hover:bg-[#e0645a]/10 disabled:opacity-60"
                      >
                        {cancelling === a.order_ref ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const credFields = [
                        { label: 'Username', value: a.username || '', key: `u-${a.id}` },
                        { label: 'Password', value: a.password || '', key: `p-${a.id}` },
                        { label: 'Account Email', value: a.email || '', key: `e-${a.id}` },
                        { label: 'Email Password', value: a.email_password || a.emailPassword || '', key: `ep-${a.id}` },
                        { label: 'Recovery', value: a.recovery || '', key: `r-${a.id}` }
                      ].filter((f) => f.value);
                      const extraFields = (Array.isArray(a.extra) ? a.extra : [])
                        .filter((v) => String(v).trim())
                        .map((v, i) => ({ label: `Additional Detail ${i + 1}`, value: String(v), key: `x-${a.id}-${i}` }));
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[...credFields, ...extraFields].map((f) => (
                            <div key={f.key} className="bg-field border border-gold/15 rounded-[10px] px-4 py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[0.65rem] uppercase tracking-widest text-faint font-semibold">{f.label}</div>
                                <div className="font-mono text-[0.92rem] break-all">{f.value}</div>
                              </div>
                              <button onClick={() => copyText(f.value, f.key)} className="text-gold hover:bg-gold/10 rounded-[8px] p-2 shrink-0">
                                {copied === f.key ? <Check size={17} /> : <Copy size={17} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {a.account_raw && (
                      <div className="bg-field border border-gold/15 rounded-[10px] px-4 py-3 mt-3">
                        <div className="text-[0.65rem] uppercase tracking-widest text-faint font-semibold mb-1">Full Details (from provider)</div>
                        <div className="font-mono text-[0.88rem] break-all text-body/90">{a.account_raw}</div>
                      </div>
                    )}
                    <p className="text-[0.75rem] text-faint mt-3 flex items-center gap-1.5">
                      <Landmark size={14} strokeWidth={1.8} className="text-gold" />
                      Keep these credentials safe. Store them somewhere secure.
                    </p>
                  </>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={safePaidPage} totalPages={paidTotalPages} onChange={setPaidPage} />
    </>
  );

  const MarketProductCard = ({ item }) => {
    const Icon = platformIcon(String(item.platform || item.title || 'Account'));
    const qty = mktQty[item.id] || 1;
    const outOfStock = item.stock === 0;
    return (
      <div className="card-border bg-card rounded-[14px] p-5 flex flex-col card-hover">
        <div className="flex items-start gap-3 mb-3">
          <span className="w-11 h-11 rounded-[11px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
            <Icon size={21} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-[0.95rem] truncate">{item.title}</div>
            {item.subtitle && <div className="text-faint text-[0.78rem] truncate">{item.subtitle}</div>}
          </div>
          {item.stock !== null && item.stock !== undefined && (
            <span className={`text-[0.68rem] font-semibold px-2 py-1 rounded-full border shrink-0 ${
              outOfStock ? 'text-[#e0645a] border-[#e0645a]/30 bg-[#e0645a]/10' : 'text-muted border-softline bg-soft'
            }`}>
              {outOfStock ? 'Sold out' : `${item.stock} left`}
            </span>
          )}
        </div>

        {item.desc && <p className="text-muted text-[0.83rem] mb-3 line-clamp-2">{item.desc}</p>}

        <div className="mt-auto">
          <div className="flex items-end gap-2 mb-3">
            <span className="text-gold font-syne font-bold text-xl">{fmtNgn(item.price)}</span>
            {item.priceUsd ? (
              <span className="text-faint text-[0.8rem] mb-0.5">${Number(item.priceUsd).toFixed(2)}</span>
            ) : null}
            {qty > 1 && (
              <span className="text-faint text-[0.8rem] mb-0.5 ml-auto">
                = <span className="text-gold font-semibold">{fmtNgn(item.price * qty)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <QuantityStepper
              value={qty}
              onChange={(v) => setMktQty((prev) => ({ ...prev, [item.id]: v }))}
              disabled={Boolean(busy) || outOfStock}
            />
            <span className="text-faint text-[0.72rem] uppercase tracking-wider font-medium">Quantity</span>
          </div>
          <button
            onClick={() => handleBuyMarketplace(item, qty)}
            disabled={Boolean(busy) || outOfStock}
            className="btn-gold w-full py-3 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} strokeWidth={2} />
            {busy === `buy-${item.id}` ? 'Purchasing...' : outOfStock ? 'Sold out' : qty > 1 ? `Buy ${qty}` : 'Buy Now'}
          </button>
        </div>
      </div>
    );
  };

  const quickServices = [
    { tab: 'marketplace', label: 'Marketplace', desc: 'Verified accounts', icon: Store },
    { tab: 'sms', label: 'SMS Verification', desc: 'Numbers for any OTP', icon: MessageSquare, badge: 'NEW' },
    { tab: 'followers', label: 'Followers Growth', desc: 'Grow your socials', icon: TrendingUp, badge: 'NEW' },
    { tab: 'categories', label: 'Categories', desc: 'Browse by platform', icon: LayoutGrid }
  ];

  return (
    <DashboardLayout
      title={tab === 'overview' ? `Welcome, ${user?.name?.split(' ')[0] || ''}`.trim() : (TITLES[tab] || 'Dashboard')}
      subtitle={tab === 'overview' ? "Here's what's happening with your account" : SUBTITLES[tab]}
    >
      {fundRef && (
        <div className="mb-6 rounded-[12px] border border-gold/20 bg-gold/10 px-4 py-3 flex items-center gap-2.5 text-[0.9rem] text-gold">
          <RefreshCw size={16} strokeWidth={1.9} className="animate-spin shrink-0" />
          Processing your top-up… we&apos;ll update your balance automatically.
        </div>
      )}

      {error && (
        <div className="bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.9rem] rounded-[10px] px-4 py-3 mb-6">
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-start gap-2 flex-1">
              <AlertTriangle size={17} strokeWidth={1.9} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setError('')} className="font-bold ml-1 hover:text-body">
                &times;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== OVERVIEW ===== */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[12px] border border-gold/25 bg-gold/8">
            <div className="marquee-track py-3 text-[0.88rem] text-gold">
              <span className="px-4">{TRANSFER_NOTICE}</span>
              <span className="px-4 text-gold/40">✦</span>
              <span className="px-4">{TRANSFER_NOTICE}</span>
              <span className="px-4 text-gold/40">✦</span>
            </div>
          </div>

          <WalletCard balance={wallet} onFunded={() => loadWallet(true)} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-border bg-gold/5 rounded-[15px] p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <Package size={22} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-faint">Total Orders</div>
                <div className="font-syne text-xl">{orders.length}</div>
              </div>
            </div>
            <div className="card-border bg-gold/5 rounded-[15px] p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <Smartphone size={22} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-faint">Active Numbers</div>
                <div className="font-syne text-xl">{activeNumbers}</div>
              </div>
            </div>
            <div className="card-border bg-gold/5 rounded-[15px] p-5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <TrendingUp size={22} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-faint">Total Spent</div>
                <div className="font-syne text-xl">{fmtNgn(totalSpent)}</div>
              </div>
            </div>
          </div>

          {/* Quick access to services */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickServices.map((s) => (
              <button
                key={s.tab}
                onClick={() => setTab(s.tab)}
                className="card-border bg-card rounded-[15px] p-5 text-left card-hover group relative"
              >
                {s.badge && <span className="badge-new absolute top-3 right-3">{s.badge}</span>}
                <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <s.icon size={21} strokeWidth={1.8} />
                </span>
                <div className="font-medium text-[0.95rem]">{s.label}</div>
                <div className="text-faint text-[0.78rem] flex items-center gap-1">
                  {s.desc}
                  <ArrowRight size={12} strokeWidth={2} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>

          <PanelCard
            title="Recent Orders"
            icon={Package}
            actions={orders.length > 0 && <button onClick={() => setTab('orders')} className="text-[0.85rem] text-gold hover:text-gold-light">View all →</button>}
          >
            {orders.length === 0 ? (
              <p className="text-faint text-[0.95rem] py-6 text-center">
                No orders yet. Buy your first virtual number or account to get started.
              </p>
            ) : (
              <div className="divide-y divide-softline">
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
                        <div className="text-faint text-[0.75rem]">
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

      {/* ===== MARKETPLACE ===== */}
      {tab === 'marketplace' && (
        <div className="space-y-6">
          {/* Hero */}
          <div className="card-border bg-gold/3 rounded-[18px] p-6 md:p-7 relative overflow-hidden">
            <div className="absolute -top-16 -right-10 w-56 h-56 bg-gold/10 rounded-full blur-[70px] pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-[13px] bg-gradient-to-br from-gold-light to-gold-dark text-night flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(255,199,0,0.35)]">
                  <Store size={24} strokeWidth={1.9} />
                </span>
                <div>
                  <div className="font-syne text-xl">Marketplace</div>
                  <div className="text-faint text-[0.82rem]">Verified accounts, instant delivery, paid from your wallet</div>
                </div>
              </div>
              <div className="relative w-full lg:max-w-[360px]">
                <Search size={17} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                <input
                  value={mktSearch}
                  onChange={(e) => setMktSearch(e.target.value)}
                  placeholder="Search accounts, platforms…"
                  className="w-full pl-10 pr-3.5 py-3 bg-input border border-gold/20 rounded-[12px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                />
              </div>
            </div>
          </div>

          {/* Category chips */}
          {categoriesList.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setMktCategory(''); setMktSearch(''); }}
                className={`chip transition-colors ${!mktCategory && !mktSearch ? 'border-gold/50 bg-gold/10 text-gold' : 'hover:border-gold/40'}`}
              >
                <Boxes size={14} strokeWidth={2} /> All
              </button>
              {categoriesList.slice(0, 10).map((c) => {
                const active = usingBulnixMarket ? mktCategory === String(c.id) : mktSearch.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.id}
                    onClick={() => openCategory(c)}
                    className={`chip transition-colors ${active ? 'border-gold/50 bg-gold/10 text-gold' : 'hover:border-gold/40'}`}
                  >
                    {c.name}
                    {typeof c.count === 'number' && c.count > 0 && <span className="text-faint">· {c.count}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {bxLoadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card-border bg-card rounded-[14px] p-5 h-[220px] shimmer" />
              ))}
            </div>
          ) : marketplaceItems.length === 0 ? (
            <PanelCard title="Products">
              <p className="text-faint text-[0.95rem] py-8 text-center">
                {(mktSearch || mktCategory)
                  ? 'No products match your search. Try another platform or clear the filter.'
                  : 'No products listed yet. Check back shortly.'}
              </p>
            </PanelCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {marketplaceItems.map((item) => (
                <MarketProductCard key={`${item.source}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ACCOUNT CATEGORIES ===== */}
      {tab === 'categories' && (
        <div className="space-y-6">
          <PanelCard title="Browse by Category" icon={LayoutGrid}>
            {categoriesList.length === 0 ? (
              <p className="text-faint text-[0.95rem] py-8 text-center">
                Categories will appear here once products are available.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoriesList.map((c) => {
                  const Icon = platformIcon(String(c.name || 'Account'));
                  return (
                    <button
                      key={c.id}
                      onClick={() => openCategory(c)}
                      className="card-border bg-card rounded-[14px] p-5 text-left card-hover group"
                    >
                      <span className="w-12 h-12 rounded-[13px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Icon size={23} strokeWidth={1.8} />
                      </span>
                      <div className="font-medium text-[0.95rem] truncate">{c.name}</div>
                      <div className="text-faint text-[0.78rem]">
                        {typeof c.count === 'number' && c.count > 0 ? `${c.count} products` : 'View products'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </PanelCard>
        </div>
      )}

      {/* ===== SMS VERIFICATION ===== */}
      {tab === 'sms' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-[12px] border border-gold/20 bg-gold/5 px-4 py-3.5 text-[0.88rem] text-body/80">
            <MessageSquare size={17} strokeWidth={1.9} className="text-gold shrink-0 mt-0.5" />
            <p>
              Buy a virtual number, then watch for its code under <span className="text-gold font-medium">&quot;Your Numbers&quot;</span> below.
              Purchased numbers &amp; codes are always available in <span className="text-gold font-medium">My Orders</span>.
            </p>
          </div>

          {/* Route selector */}
          <div className="flex gap-2 p-1 rounded-full border border-gold/20 bg-gold/5 w-fit">
            {[
              { key: 'worldwide', label: 'Worldwide', icon: Globe },
              { key: 'network', label: 'Network Select', icon: SlidersHorizontal }
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setSmsRoute(r.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[0.85rem] font-medium transition-all ${
                  smsRoute === r.key ? 'bg-gold text-night' : 'text-muted hover:text-body'
                }`}
              >
                <r.icon size={16} strokeWidth={1.9} />
                {r.label}
              </button>
            ))}
          </div>

          {!bxOn('sms') ? (
            <ComingSoon
              icon={MessageSquare}
              title="SMS Verification"
              live={false}
              tagline="Virtual numbers for any OTP — WhatsApp, Telegram, Google and 500+ services, paid straight from your wallet. This service is being connected and will be live here shortly."
              points={[
                { icon: Globe, title: '190+ countries', desc: 'Worldwide numbers for any verification.' },
                { icon: MessageSquare, title: '500+ services', desc: 'WhatsApp, Telegram, Google and more.' },
                { icon: Clock, title: 'Instant codes', desc: 'Numbers activate on the spot; codes arrive fast.' }
              ]}
            />
          ) : smsRoute === 'network' ? (
            <ComingSoon
              icon={SlidersHorizontal}
              title="Network Select routing"
              live={false}
              tagline="Pick the exact mobile operator for higher delivery rates on strict services. This premium route is being connected — for now, Worldwide routing already covers every network."
              points={[
                { icon: SlidersHorizontal, title: 'Operator targeting', desc: 'Choose MTN, Airtel, Vodafone and more per order.' },
                { icon: TrendingUp, title: 'Higher success', desc: 'Better delivery on strict verifications.' },
                { icon: Globe, title: '190+ countries', desc: 'Deep coverage as operators come online.' }
              ]}
            />
          ) : (
            <>
              <PanelCard
                title="Buy a Virtual Number"
                icon={Smartphone}
                actions={smsCountry ? (
                  <div className="relative w-full max-w-[280px]">
                    <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                    <input
                      value={numbersSearch}
                      onChange={(e) => setNumbersSearch(e.target.value)}
                      placeholder="Search a service…"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                    />
                  </div>
                ) : null}
              >
                {/* 1. Country picker */}
                <div className="flex flex-col gap-1.5 mb-5 max-w-[360px]">
                  <label className="text-[0.72rem] uppercase tracking-wider text-faint font-medium">1. Select country</label>
                  <select
                    value={smsCountry}
                    onChange={(e) => { setSmsCountry(e.target.value); setNumbersSearch(''); }}
                    disabled={smsCountriesLoading}
                    className="w-full px-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">{smsCountriesLoading ? 'Loading countries…' : 'Choose a country'}</option>
                    {smsCountries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Services for the chosen country */}
                {!smsCountry ? (
                  <p className="text-faint text-[0.95rem] py-6 text-center">
                    Pick a country above to see available services and prices.
                  </p>
                ) : smsServicesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="card-border bg-card rounded-[12px] p-5 h-[150px] shimmer" />
                    ))}
                  </div>
                ) : filteredSmsServices.length === 0 ? (
                  <p className="text-faint text-[0.95rem] py-6 text-center">
                    {smsServices.length === 0
                      ? 'No services are available for this country right now. Try another country.'
                      : `No results for "${numbersSearch.trim()}".`}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredSmsServices.map((s) => (
                      <div key={s.slug} className="card-border bg-card rounded-[12px] p-5 flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                            <MessageSquare size={18} strokeWidth={1.8} />
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-[0.95rem] truncate">{s.name}</div>
                            {(s.availability !== null && s.availability !== undefined) && (
                              <div className="text-faint text-[0.78rem]">{Number(s.availability).toLocaleString()} available</div>
                            )}
                          </div>
                        </div>
                        <div className="text-[0.9rem] mb-4">
                          <span className="text-gold font-semibold text-lg">{fmtNgn(s.price)}</span>
                        </div>
                        <button
                          onClick={() => handleBuyNumber(s)}
                          disabled={Boolean(busy) || !s.price}
                          className="btn-gold w-full py-3 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                        >
                          <Smartphone size={16} strokeWidth={1.8} />
                          {busy === `buy-${s.slug}` ? 'Buying…' : 'Buy Number'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>

              <PanelCard title="Your Numbers" icon={Smartphone}>
                {renderNumbersList()}
              </PanelCard>
            </>
          )}
        </div>
      )}

      {/* ===== FOLLOWERS GROWTH ===== */}
      {tab === 'followers' && (
        <ComingSoon
          icon={TrendingUp}
          title="Followers Growth"
          live={bxOn('followers')}
          tagline="Launch growth campaigns for Instagram, TikTok, YouTube, X and more. Pick a service, drop your link, and watch your numbers climb — paid straight from your wallet."
          points={[
            { icon: TrendingUp, title: 'Real growth', desc: 'Followers, likes, views & engagement.' },
            { icon: Globe, title: 'Every platform', desc: 'Instagram, TikTok, YouTube, X, Facebook.' },
            { icon: History, title: 'Track campaigns', desc: 'Live status on every order you place.' }
          ]}
        >
          <div className="card-border bg-card rounded-[16px] p-6 md:p-7">
            <h3 className="font-syne text-lg mb-5 flex items-center gap-2">
              <Send size={18} strokeWidth={1.9} className="text-gold" /> Place a Campaign
            </h3>

            {flMsg && (
              <div className={`mb-5 rounded-[10px] px-4 py-3 text-[0.88rem] border ${
                flMsg.type === 'success'
                  ? 'text-[#2ecc71] border-[#2ecc71]/30 bg-[#2ecc71]/10'
                  : 'text-[#ff8a80] border-[#e0645a]/30 bg-[#e0645a]/10'
              }`}>
                {flMsg.text}
              </div>
            )}

            <form onSubmit={handlePlaceCampaign} className="space-y-4">
              <div>
                <label className="block text-[0.75rem] uppercase tracking-wider text-faint font-semibold mb-2">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'Facebook'].map((p) => {
                    const Icon = platformIcon(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => { setFlPlatform(p); setFlForm((f) => ({ ...f, serviceId: '' })); }}
                        className={`chip transition-colors ${flPlatform === p ? 'border-gold/50 bg-gold/10 text-gold' : 'hover:border-gold/40'}`}
                      >
                        <Icon size={14} strokeWidth={2} /> {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {flServices.length > 0 && (
                <div>
                  <label className="block text-[0.75rem] uppercase tracking-wider text-faint font-semibold mb-2">Service</label>
                  <select
                    value={flForm.serviceId}
                    onChange={(e) => setFlForm((f) => ({ ...f, serviceId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                  >
                    <option value="">Select a service…</option>
                    {flServices.map((s, i) => (
                      <option key={s.id || i} value={s.id || s.service || i}>
                        {(s.name || s.title || s.service || `Service ${i + 1}`)}
                        {s.priceNgnPer1000 ? ` — ₦${Number(s.priceNgnPer1000).toLocaleString()}/1k` : ''}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const svc = flServices.find((s) => String(s.id) === String(flForm.serviceId));
                    if (!svc) return null;
                    const qty = Number(flForm.quantity) || 0;
                    const est = qty && svc.priceNgnPer1000 ? Math.ceil((svc.priceNgnPer1000 * qty) / 1000 / 100) * 100 : 0;
                    return (
                      <p className="mt-2 text-[0.75rem] text-faint flex flex-wrap gap-x-3 gap-y-1">
                        {svc.min || svc.max ? (
                          <span>Range: {Number(svc.min || 1).toLocaleString()}–{Number(svc.max || 0).toLocaleString()}</span>
                        ) : null}
                        {est ? <span className="text-gold font-semibold">Est. ₦{est.toLocaleString()}</span> : null}
                      </p>
                    );
                  })()}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
                <div>
                  <label className="block text-[0.75rem] uppercase tracking-wider text-faint font-semibold mb-2">Link</label>
                  <div className="relative">
                    <LinkIcon size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                    <input
                      value={flForm.link}
                      onChange={(e) => setFlForm((f) => ({ ...f, link: e.target.value }))}
                      placeholder="https://instagram.com/yourhandle"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.75rem] uppercase tracking-wider text-faint font-semibold mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={flForm.quantity}
                    onChange={(e) => setFlForm((f) => ({ ...f, quantity: e.target.value }))}
                    placeholder="1000"
                    className="w-full px-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={flBusy || !bxOn('followers')}
                className="btn-gold px-7 py-3 text-[0.9rem] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} strokeWidth={2} />
                {flBusy ? 'Placing…' : bxOn('followers') ? 'Place Campaign' : 'Connecting soon'}
              </button>
            </form>
          </div>
        </ComingSoon>
      )}

      {/* ===== MY ORDERS ===== */}
      {tab === 'orders' && (
        <div className="space-y-6">
          <PanelCard
            title="Your Accounts"
            icon={KeyRound}
            actions={<RefreshButton onClick={loadPaidAccounts} />}
          >
            {renderPaidAccountsList()}
          </PanelCard>

          <PanelCard
            title="Your Numbers"
            icon={Smartphone}
            actions={<RefreshButton onClick={loadOrders} />}
          >
            {renderNumbersList()}
          </PanelCard>
        </div>
      )}

      {/* ===== TRANSACTION HISTORY ===== */}
      {tab === 'transactions' && (
        <PanelCard
          title="Transaction History"
          icon={History}
          actions={<RefreshButton onClick={() => Promise.all([loadWallet(), loadOrders()])} />}
        >
          {paymentHistory.length === 0 ? (
            <p className="text-faint text-[0.95rem] py-10 text-center">
              No payments yet. Fund your wallet or make a purchase and it will show up here.
            </p>
          ) : (
            <div className="space-y-3">
              {visiblePaymentHistory.map((p) => (
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
                      <div className="text-faint text-[0.78rem] font-mono truncate">
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
          <Pagination page={safeHistoryPage} totalPages={historyTotalPages} onChange={setHistoryPage} />
        </PanelCard>
      )}

      {/* ===== PROFILE ===== */}
      {tab === 'profile' && (
        <PanelCard title="My Profile" icon={UserRound}>
          <div className="space-y-6">
            <div className="bg-soft border border-gold/10 rounded-[12px] p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-night font-bold text-3xl shadow-lg">
                {(user?.name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-syne text-2xl mb-1">{user?.name}</h3>
                <p className="text-muted text-[1rem]">{user?.email}</p>
                <div className="mt-4 inline-block bg-gold/10 border border-gold/20 text-gold px-4 py-2 rounded-[50px] text-[0.85rem] font-medium">
                  {wallet ? `Wallet: ${fmtNgn(wallet.balance)}` : 'Wallet: Offline'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-soft border border-softline rounded-[12px] p-5">
                <div className="text-[0.7rem] uppercase tracking-wider text-faint mb-1">Account ID</div>
                <div className="font-mono text-[0.95rem]">{user?.id || '—'}</div>
              </div>
              <div className="bg-soft border border-softline rounded-[12px] p-5">
                <div className="text-[0.7rem] uppercase tracking-wider text-faint mb-1">Member Since</div>
                <div className="font-medium text-[0.95rem]">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
              </div>
            </div>

            <div className="bg-gold/5 border border-gold/15 rounded-[12px] p-6">
              <h4 className="font-syne text-lg mb-2 flex items-center gap-2">
                <Headphones size={18} strokeWidth={1.9} className="text-gold" />
                Customer Support
              </h4>
              <p className="text-muted text-[0.9rem] leading-relaxed">
                Having any issues with your orders or account? Send us an email at{' '}
                <a href="mailto:spencersbm1@hotmail.com" className="text-gold hover:text-gold-light break-all">
                  spencersbm1@hotmail.com
                </a>{' '}
                or chat with us on WhatsApp and our support team will get back to you promptly.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/2349138187814?text=${encodeURIComponent("Hey SpencerSBM, I'm a user on your platform, I have an issue with one of my orders")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost inline-flex items-center justify-center gap-2 px-6 py-3 text-[0.9rem] w-full sm:w-auto"
                >
                  <MessageCircle size={18} strokeWidth={1.9} />
                  Chat on WhatsApp
                </a>
                <a
                  href="https://t.me/spencersbm"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost inline-flex items-center justify-center gap-2 px-6 py-3 text-[0.9rem] w-full sm:w-auto"
                >
                  <TelegramIcon size={18} />
                  Join Telegram Group for More Updates
                </a>
              </div>
            </div>
          </div>
        </PanelCard>
      )}

      <SuccessModal
        open={successOpen}
        order={lastPurchase}
        onClose={() => setSuccessOpen(false)}
        onViewAccounts={() => { setSuccessOpen(false); setTab('orders'); }}
        onCheckSms={handleModalCheckSms}
        checkingSms={Boolean(checkingSms)}
      />
    </DashboardLayout>
  );
}
