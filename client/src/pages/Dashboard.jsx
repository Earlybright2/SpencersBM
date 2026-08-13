import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Smartphone, UserRound, Check, MessageSquare, RefreshCw, Camera, Bird, ThumbsUp, Music2, Mail, Plus } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import WalletCard from '../components/WalletCard.jsx';
import AccountsModal from '../components/AccountsModal.jsx';
import SuccessModal from '../components/SuccessModal.jsx';
import { buildOrderData } from '../data/marketplace.js';

const TITLES = {
  overview: 'Overview',
  numbers: 'Virtual Numbers',
  accounts: 'Social Accounts',
  orders: 'My Orders',
  profile: 'My Profile'
};

function Select({ label, value, onChange, options, placeholder, loading }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[0.7rem] uppercase tracking-wider text-gray-500 font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full p-3 bg-gold/5 border border-gold/20 rounded-[10px] text-white text-[0.95rem] outline-none focus:border-gold disabled:opacity-60"
      >
        <option value="" className="bg-[#141414]">
          {loading ? 'Loading...' : placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} className="bg-[#141414]">
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

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

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  const setTab = (t) => {
    setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  };

  // OneGridHub state (shared across panels)
  const [servers, setServers] = useState([]);
  const [server, setServer] = useState('');
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('');
  const [services, setServices] = useState([]);
  const [service, setService] = useState('');
  const [loadingServers, setLoadingServers] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [price, setPrice] = useState(null);
  const [checkingPrice, setCheckingPrice] = useState(false);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState(null);
  const [checkingSms, setCheckingSms] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [providerOffline, setProviderOffline] = useState(false);
  const [error, setError] = useState('');

  const [accountsOpen, setAccountsOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const selectedServer = useMemo(() => servers.find((s) => s.id === server), [servers, server]);
  const selectedCountry = useMemo(() => countries.find((c) => c.id === country), [countries, country]);
  const selectedService = useMemo(() => services.find((s) => s.id === service), [services, service]);

  // ----- Data loading -----
  useEffect(() => {
    loadBalance(true);
    loadServers();
    loadOrders(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (server) {
      setPrice(null);
      setPurchased(null);
      loadCountries();
      loadServices();
    } else {
      setCountries([]);
      setServices([]);
      setCountry('');
      setService('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server]);

  const loadBalance = async (silent = false) => {
    if (!silent) setBalanceError('');
    try {
      const res = await api.get('/onegridhub/balance');
      setBalance(res.data);
      setProviderOffline(false);
    } catch (err) {
      const msg = getErrorMessage(err);
      setProviderOffline(true);
      setBalanceError(msg);
      if (!silent) setError(msg);
    }
  };

  const loadServers = async () => {
    setLoadingServers(true);
    try {
      const res = await api.get('/onegridhub/servers');
      setServers(res.data.servers || []);
      setProviderOffline(false);
    } catch (err) {
      setProviderOffline(true);
      setError(getErrorMessage(err));
    } finally {
      setLoadingServers(false);
    }
  };

  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const res = await api.get('/onegridhub/countries', { params: { server } });
      setCountries(res.data.countries || []);
      setProviderOffline(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const res = await api.get('/onegridhub/services', { params: { server } });
      setServices(res.data.services || []);
      setProviderOffline(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingServices(false);
    }
  };

  const loadOrders = async (silent = false) => {
    if (!silent) setOrdersLoading(true);
    try {
      const res = await api.get('/onegridhub/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      if (!silent) setError(getErrorMessage(err));
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };

  const handleCheckPrice = async () => {
    if (!server || !country || !service) {
      setError('Select a server, country and service first.');
      return;
    }
    setError('');
    setCheckingPrice(true);
    setPrice(null);
    try {
      const res = await api.get('/onegridhub/price', { params: { server, country, service } });
      setPrice(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCheckingPrice(false);
    }
  };

  const handleBuy = async () => {
    if (!server || !country || !service) {
      setError('Select a server, country and service first.');
      return;
    }
    setError('');
    setBuying(true);
    setPurchased(null);
    try {
      const res = await api.post('/onegridhub/buy', {
        server,
        country,
        service,
        serviceName: selectedService?.name,
        countryName: selectedCountry?.name
      });
      setPurchased(res.data.order);
      setTab('numbers');
      loadBalance(true);
      loadOrders(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBuying(false);
    }
  };

  const handleCheckSms = async (orderRef) => {
    setError('');
    setCheckingSms(true);
    try {
      const res = await api.get('/onegridhub/status', { params: { order_ref: orderRef } });
      setPurchased((prev) => (prev ? { ...prev, latestStatus: res.data } : prev));
      loadOrders(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCheckingSms(false);
    }
  };

  const handleCancel = async (orderRef) => {
    setError('');
    setCancelling(true);
    try {
      await api.post('/onegridhub/cancel', { order_ref: orderRef });
      loadOrders(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const handleBuyAccount = (account) => {
    setAccountsOpen(false);
    const order = buildOrderData(
      {
        type: 'social_account',
        productName: `${account.platform} Account`,
        platformService: account.platform,
        country: null,
        price: account.price
      },
      user?.email || ''
    );
    setSuccessOrder(order);
    setSuccessOpen(true);
  };

  const activeCount = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'received').length;

  return (
    <DashboardLayout
      title={tab === 'overview' ? `Welcome, ${user?.name?.split(' ')[0]}` : (TITLES[tab] || 'Dashboard')}
      balance={balance}
      balanceError={balanceError}
      onRetryBalance={() => loadBalance()}
    >
      {providerOffline && (
        <div className="mb-6 rounded-[12px] border border-gold/20 bg-gold/10 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-[0.9rem] text-gold flex items-center gap-2">
            <AlertTriangle size={18} strokeWidth={1.9} />
            The numbers provider is currently unreachable. Orders and pricing may be unavailable — please retry shortly.
          </p>
          <button onClick={() => { setError(''); loadBalance(); loadServers(); }} className="btn-gold px-4 py-2 text-[0.82rem] shrink-0">
            Retry
          </button>
        </div>
      )}

      {error && (
        <p className="bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.9rem] rounded-[10px] px-4 py-3 mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold ml-3 hover:text-white">
            &times;
          </button>
        </p>
      )}

{/* ===== OVERVIEW ===== */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <WalletCard balance={balance} />

          <div className="card-border bg-gradient-to-br from-gold/8 to-gold/2 rounded-[15px] p-6 md:p-8">
              <h2 className="font-syne text-2xl mb-2">
                Welcome back, <span className="gold-gradient-text">{user?.name?.split(' ')[0]}</span>
              </h2>
              <p className="text-gray-400 text-[0.95rem] mb-6">
                Buy virtual numbers, browse social accounts and track all your orders from one place.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-night/40 border border-gold/10 rounded-[12px] p-5 text-center">
                  <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 mb-1">Total Orders</div>
                  <div className="font-syne text-xl">{orders.length}</div>
                </div>
                <div className="bg-night/40 border border-gold/10 rounded-[12px] p-5 text-center">
                  <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 mb-1">Active Numbers</div>
                  <div className="font-syne text-xl">{activeCount}</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => setTab('numbers')}
                  className="btn-gold px-6 py-3 text-[0.9rem] hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2"
                >
                  <Smartphone size={18} strokeWidth={1.9} /> Buy Virtual Number
                </button>
                <button
                  onClick={() => setTab('accounts')}
                  className="btn-ghost px-6 py-3 text-[0.9rem] flex items-center justify-center gap-2"
                >
                  <UserRound size={18} strokeWidth={1.9} /> Browse Accounts
                </button>
              </div>
            </div>

            <PanelCard title="Recent Orders" actions={orders.length > 0 && <button onClick={() => setTab('orders')} className="text-[0.85rem] text-gold hover:text-gold-light">View all →</button>}>
              {orders.length === 0 ? (
                <p className="text-gray-500 text-[0.95rem] py-6 text-center">
                  No orders yet. Buy your first virtual number to get started.
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
                          <div className="text-[0.92rem] font-medium truncate">{order.service || order.productName}</div>
                          <div className="text-gray-500 text-[0.75rem]">
                            {order.order_ref || order.id} · {new Date(order.purchasedAt || Date.now()).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[0.7rem] font-semibold uppercase px-3 py-1 rounded-[50px] border shrink-0 ${
                          order.status === 'cancelled'
                            ? 'text-[#e0645a] border-[#e0645a]/40 bg-[#e0645a]/10'
                            : order.status === 'received'
                              ? 'text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10'
                              : 'text-gold border-gold/40 bg-gold/10'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>
      )}

      {/* ===== VIRTUAL NUMBERS ===== */}
      {tab === 'numbers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PanelCard title="Purchase a Virtual Number">
            <div className="space-y-5">
              <Select
                label="Server"
                value={server}
                onChange={setServer}
                options={servers.map((s) => ({ id: s.id, name: `${s.label} (${s.region})` }))}
                placeholder="Select a server"
                loading={loadingServers}
              />

              {server && (
                <Select
                  label="Country"
                  value={country}
                  onChange={(v) => {
                    setCountry(v);
                    setPrice(null);
                    setPurchased(null);
                  }}
                  options={countries.map((c) => ({ id: c.id, name: c.name }))}
                  placeholder="Select a country"
                  loading={loadingCountries}
                />
              )}

              {server && (
                <Select
                  label="Service (SMS target)"
                  value={service}
                  onChange={(v) => {
                    setService(v);
                    setPrice(null);
                    setPurchased(null);
                  }}
                  options={services.map((s) => ({ id: s.id, name: s.name }))}
                  placeholder="Select a service"
                  loading={loadingServices}
                />
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCheckPrice}
                  disabled={checkingPrice || !server || !country || !service}
                  className="btn-ghost px-6 py-3 text-[0.9rem] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingPrice ? 'Checking...' : 'Check Price'}
                </button>
                <button
                  onClick={handleBuy}
                  disabled={buying || !server || !country || !service}
                  className="btn-gold px-6 py-3 text-[0.9rem] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(212,175,55,0.35)]"
                >
                  {buying ? 'Purchasing...' : 'Purchase Number'}
                </button>
              </div>

              {price && (
                <div className="bg-gold/8 border border-gold/20 rounded-[10px] p-4 flex items-center justify-between">
                  <span className="text-gray-300 text-[0.9rem]">
                    {selectedService?.name} · {selectedCountry?.name}
                  </span>
                  <span className="text-gold font-semibold text-lg">
                    {Number(price.price).toLocaleString()} {price.currency}
                  </span>
                </div>
              )}
            </div>

            {purchased && (
              <div className="mt-6 border border-gold/30 rounded-[12px] p-5 bg-gold/5">
                <h3 className="font-syne text-lg text-gold mb-3 flex items-center gap-2">
                  <Check size={20} strokeWidth={2.2} /> Number Ordered
                </h3>
                <div className="space-y-1 text-[0.93rem]">
                  <Row label="Phone Number" value={purchased.number || '—'} mono />
                  <Row label="Order Ref" value={purchased.order_ref || '—'} mono />
                  <Row label="Service" value={purchased.service || '—'} />
                  <Row label="Country" value={purchased.country || '—'} />
                  {purchased.price && (
                    <Row label="Price" value={`${Number(purchased.price).toLocaleString()} ${purchased.currency || ''}`} />
                  )}
                  <Row label="Status" value={purchased.status} />
                </div>
                {purchased.latestStatus?.sms && (
                  <div className="mt-4 bg-night/60 border border-gold/20 rounded-[10px] p-4 text-center">
                    <div className="text-[0.75rem] uppercase tracking-wider text-gray-400 mb-1">Received SMS Code</div>
                    <div className="font-mono text-xl text-gold break-all">{purchased.latestStatus.sms}</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 mt-5">
                  <button
                    onClick={() => handleCheckSms(purchased.order_ref)}
                    disabled={checkingSms}
                    className="btn-ghost px-5 py-2.5 text-[0.85rem] disabled:opacity-60 flex items-center gap-2"
                  >
                    <MessageSquare size={16} strokeWidth={1.9} />
                    {checkingSms ? 'Checking...' : 'Check SMS / Status'}
                  </button>
                  <button
                    onClick={() => handleCancel(purchased.order_ref)}
                    disabled={cancelling}
                    className="px-5 py-2.5 rounded-[50px] font-semibold text-[0.85rem] bg-transparent text-[#e0645a] border border-[#e0645a]/40 hover:bg-[#e0645a]/10 disabled:opacity-60"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                </div>
              </div>
            )}
          </PanelCard>

          <div className="space-y-6">
            <PanelCard title="How it works">
              <ol className="space-y-3 text-gray-300 text-[0.92rem] list-decimal list-inside">
                <li>Select a server, country and the service you need to verify (e.g. WhatsApp).</li>
                <li>Click <span className="text-gold">Check Price</span> to see the live cost.</li>
                <li>Click <span className="text-gold">Purchase Number</span> — a virtual number is reserved for you.</li>
                <li>Use the number on your target platform, then tap <span className="text-gold">Check SMS / Status</span> to fetch the OTP code.</li>
                <li>Cancel the order when you no longer need the number.</li>
              </ol>
              <p className="text-[0.8rem] text-gray-500 mt-4">
                Numbers are paid for from your OneGridHub wallet. Keep the wallet funded to place orders.
              </p>
            </PanelCard>
            <button
              onClick={() => setTab('accounts')}
              className="btn-gold w-full py-4 text-[0.95rem] hover:-translate-y-[2px] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2"
            >
              <UserRound size={18} strokeWidth={1.9} /> Buy a Social Media Account
            </button>
          </div>
        </div>
      )}

      {/* ===== SOCIAL ACCOUNTS ===== */}
      {tab === 'accounts' && (
        <PanelCard
          title="Social Media Accounts"
          actions={
            <button onClick={() => setAccountsOpen(true)} className="btn-gold px-5 py-2.5 text-[0.85rem]">
              Browse &amp; Buy
            </button>
          }
        >
          <p className="text-gray-400 text-[0.92rem] mb-6">
            Purchase premium, aged social media accounts with instant delivery. Available platforms include
            Instagram, X (Twitter), Facebook, TikTok and Gmail — delivered securely straight to your email.
          </p>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[0.9rem] text-gray-300">
            {[
              { label: 'Instagram', icon: Camera },
              { label: 'Twitter / X', icon: Bird },
              { label: 'Facebook', icon: ThumbsUp },
              { label: 'TikTok', icon: Music2 },
              { label: 'Gmail', icon: Mail },
              { label: 'And more', icon: Plus }
            ].map((p) => (
              <li key={p.label} className="bg-gold/5 border border-gold/10 rounded-[10px] px-4 py-3 flex items-center gap-2.5">
                <p.icon size={16} strokeWidth={1.9} className="text-gold shrink-0" />
                {p.label}
              </li>
            ))}
          </ul>
        </PanelCard>
      )}

      {/* ===== MY ORDERS ===== */}
      {tab === 'orders' && (
        <PanelCard
          title="Order History"
          actions={
            <button onClick={() => loadOrders()} disabled={ordersLoading} className="btn-ghost px-5 py-2.5 text-[0.85rem] disabled:opacity-60 flex items-center gap-2">
              <RefreshCw size={16} strokeWidth={1.9} className={ordersLoading ? 'animate-spin' : ''} />
              {ordersLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          }
        >
          {orders.length === 0 ? (
            <p className="text-gray-500 text-[0.95rem] py-10 text-center">
              {ordersLoading ? 'Loading your orders...' : 'No orders yet. Head to the numbers or accounts section to get started.'}
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const sms = order.sms;
                return (
                  <div key={order.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-gold w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                          {order.type === 'virtual_number' ? <Smartphone size={18} /> : <UserRound size={18} />}
                        </span>
                        <div>
                          <div className="font-medium text-[0.95rem]">{order.service || order.productName}</div>
                          <div className="text-gray-500 text-[0.8rem]">
                            {order.order_ref || order.id} · {new Date(order.purchasedAt || Date.now()).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[0.75rem] font-semibold uppercase px-3 py-1 rounded-[50px] border ${
                          order.status === 'cancelled'
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
                    <Row label="Country" value={order.country || '—'} />
                    {order.price && <Row label="Amount" value={`${Number(order.price).toLocaleString()} ${order.currency || ''}`} />}
                    {sms && <Row label="SMS Code" value={sms} mono />}

                    {order.type === 'virtual_number' && order.status !== 'cancelled' && (
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => handleCheckSms(order.order_ref)}
                          disabled={checkingSms}
                          className="btn-ghost px-4 py-2 text-[0.8rem] disabled:opacity-60 flex items-center gap-1.5"
                        >
                          <MessageSquare size={14} strokeWidth={1.9} />
                          {checkingSms ? 'Checking...' : 'Check SMS'}
                        </button>
                        <button
                          onClick={() => handleCancel(order.order_ref)}
                          disabled={cancelling}
                          className="px-4 py-2 rounded-[50px] font-semibold text-[0.8rem] bg-transparent text-[#e0645a] border border-[#e0645a]/40 hover:bg-[#e0645a]/10 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
                  {balance ? `Wallet: ${Number(balance.balance).toLocaleString()} ${balance.currency}` : 'Wallet: Offline'}
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
          </div>
        </PanelCard>
      )}

      <AccountsModal open={accountsOpen} onClose={() => setAccountsOpen(false)} onBuy={handleBuyAccount} />
      <SuccessModal open={successOpen} order={successOrder} onClose={() => setSuccessOpen(false)} />
    </DashboardLayout>
  );
}