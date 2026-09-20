import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Users, LogOut, RefreshCw, ShieldCheck, TrendingUp, Search, Store, MessageSquare, Bell, Package, Smartphone, UserRound } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

// The old Numbers / Accounts sections managed the previous provider's local
// stock; Bulnix is now the sole provider, so pricing lives directly on the
// provider-backed services (Marketplace / SMS Verification / Followers Growth).
const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'sms', label: 'SMS Verification', icon: MessageSquare },
  { id: 'followers', label: 'Followers Growth', icon: TrendingUp },
  { id: 'sales', label: 'Sales', icon: ReceiptText },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell }
];

const fmtNgn = (n) => `\u20A6${Number(n || 0).toLocaleString()}`;

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card-border bg-gold/5 rounded-[15px] p-5 flex items-center gap-4">
      <span className="w-11 h-11 rounded-[12px] bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <div>
        <div className="text-[0.7rem] uppercase tracking-wider text-faint">{label}</div>
        <div className="font-syne text-xl">{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.72rem] uppercase tracking-wider text-faint font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.92rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle';

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);

  // Provider-backed services pricing state. Each service is its own sidebar
  // section now, so the former Services sub-tabs map directly to `section`.
  const [svcOverrides, setSvcOverrides] = useState([]);
  const [svcMarketplace, setSvcMarketplace] = useState([]);
  const [svcMarketplaceLoading, setSvcMarketplaceLoading] = useState(false);
  const [svcMarketplaceCategories, setSvcMarketplaceCategories] = useState([]);
  const [svcMktCategory, setSvcMktCategory] = useState('');
  const [svcMktSearch, setSvcMktSearch] = useState('');
  const [svcSmsCountries, setSvcSmsCountries] = useState([]);
  const [svcSmsCountriesLoading, setSvcSmsCountriesLoading] = useState(false);
  const [svcSmsCountry, setSvcSmsCountry] = useState('');
  const [svcSmsServices, setSvcSmsServices] = useState([]);
  const [svcSmsServicesLoading, setSvcSmsServicesLoading] = useState(false);
  const [svcSmsSearch, setSvcSmsSearch] = useState('');
  const [svcFlPlatform, setSvcFlPlatform] = useState('');
  const [svcFlServices, setSvcFlServices] = useState([]);
  const [svcFlServicesLoading, setSvcFlServicesLoading] = useState(false);
  const [svcFlSearch, setSvcFlSearch] = useState('');
  const [svcEditPrices, setSvcEditPrices] = useState({});

  // Notifications (support debugging) section state
  const [notifUserId, setNotifUserId] = useState('');
  const [notifSearch, setNotifSearch] = useState('');
  const [notifData, setNotifData] = useState(null); // { user, notifications, unread }
  const [notifLoading, setNotifLoading] = useState(false);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadSales = async () => {
    try {
      const res = await api.get('/admin/sales');
      setSales(res.data.sales || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadOverrides = async () => {
    try {
      const res = await api.get('/admin/bulnix/overrides');
      setSvcOverrides(res.data.overrides || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadSvcMarketplace = async () => {
    setSvcMarketplaceLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/bulnix/marketplace/products', { params: { category: svcMktCategory || undefined, search: svcMktSearch || undefined, limit: 60 } }),
        api.get('/bulnix/marketplace/categories')
      ]);
      setSvcMarketplace(prodRes.data?.products || []);
      setSvcMarketplaceCategories(catRes.data?.categories || []);
    } catch (err) {
      setSvcMarketplace([]);
    } finally {
      setSvcMarketplaceLoading(false);
    }
  };

  const loadSvcSmsCountries = async () => {
    setSvcSmsCountriesLoading(true);
    try {
      const res = await api.get('/bulnix/sms/countries', { params: { channel: 'worldwide' } });
      setSvcSmsCountries(res.data?.countries || []);
    } catch {
      setSvcSmsCountries([]);
    } finally {
      setSvcSmsCountriesLoading(false);
    }
  };

  const loadSvcSmsServices = async () => {
    if (!svcSmsCountry) { setSvcSmsServices([]); return; }
    setSvcSmsServicesLoading(true);
    try {
      const res = await api.get('/bulnix/sms/services', { params: { channel: 'worldwide', country_code: svcSmsCountry } });
      setSvcSmsServices(res.data?.services || []);
    } catch {
      setSvcSmsServices([]);
    } finally {
      setSvcSmsServicesLoading(false);
    }
  };

  const loadSvcFlServices = async () => {
    setSvcFlServicesLoading(true);
    try {
      const search = svcFlPlatform ? svcFlPlatform.split(/[\s/]+/)[0].toLowerCase() : undefined;
      const res = await api.get('/bulnix/followers/services', { params: { search } });
      setSvcFlServices(Array.isArray(res.data?.services) ? res.data.services : []);
    } catch {
      setSvcFlServices([]);
    } finally {
      setSvcFlServicesLoading(false);
    }
  };

  const saveOverride = async (serviceType, providerId, price) => {
    const cost = Number(price);
    if (!Number.isFinite(cost) || cost <= 0) {
      setError('Enter a valid positive price');
      return;
    }
    try {
      await api.put('/admin/bulnix/overrides', { serviceType, providerId, adminPrice: cost });
      setToast('Price updated');
      setSvcEditPrices((m) => {
        const next = { ...m };
        delete next[`${serviceType === 'marketplace' ? 'mkt' : serviceType === 'sms' ? 'sms' : 'flw'}-${providerId}`];
        return next;
      });
      loadOverrides();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const removeOverride = async (serviceType, providerId) => {
    try {
      await api.delete(`/admin/bulnix/overrides/${serviceType}/${providerId}`);
      setToast('Override removed');
      loadOverrides();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadUserNotifications = async (userId) => {
    if (!userId) { setNotifData(null); return; }
    setNotifLoading(true);
    try {
      const res = await api.get(`/admin/users/${encodeURIComponent(userId)}/notifications`);
      setNotifData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setNotifData(null);
    } finally {
      setNotifLoading(false);
    }
  };

  const openUserNotifications = (userId) => {
    setNotifUserId(userId);
    setSection('notifications');
    loadUserNotifications(userId);
  };

  const filteredNotifUsers = useMemo(() => {
    const q = notifSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q)
    );
  }, [users, notifSearch]);

  useEffect(() => {
    loadStats();
    loadSales();
    loadUsers();
    loadOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load service data when its sidebar section is active.
  useEffect(() => {
    if (section === 'marketplace') loadSvcMarketplace();
    if (section === 'sms' && svcSmsCountries.length === 0) loadSvcSmsCountries();
    if (section === 'followers') loadSvcFlServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    if (section === 'marketplace') loadSvcMarketplace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcMktCategory, svcMktSearch]);

  useEffect(() => {
    if (svcSmsCountry && section === 'sms') loadSvcSmsServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSmsCountry]);

  useEffect(() => {
    if (section === 'followers') loadSvcFlServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcFlPlatform]);

  // Admin search within SMS Verification services for the selected country.
  const filteredSvcSmsServices = useMemo(() => {
    const q = svcSmsSearch.trim().toLowerCase();
    if (!q) return svcSmsServices;
    return svcSmsServices.filter((s) =>
      `${s.name || ''} ${s.slug || ''}`.toLowerCase().includes(q)
    );
  }, [svcSmsServices, svcSmsSearch]);

  // Admin search within Followers Growth services.
  const filteredSvcFlServices = useMemo(() => {
    const q = svcFlSearch.trim().toLowerCase();
    if (!q) return svcFlServices;
    return svcFlServices.filter((s) =>
      `${s.name || ''} ${s.platform || ''} ${s.category || ''}`.toLowerCase().includes(q)
    );
  }, [svcFlServices, svcFlSearch]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebar = (
    <nav className="flex-1 px-3 py-4 space-y-[3px]">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => { setSection(s.id); setDrawerOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-[10px] rounded-[10px] text-[0.9rem] font-medium transition-all ${
            section === s.id ? 'bg-gold/10 text-gold border border-gold/20' : 'text-muted hover:text-body hover:bg-hover'
          }`}
        >
          <span className="text-gold"><s.icon size={18} strokeWidth={1.9} /></span>
          {s.label}
        </button>
      ))}
      <div className="pt-2.5 mt-2.5 border-t border-gold/10 space-y-[3px]">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-[10px] rounded-[10px] text-[0.9rem] font-medium text-muted hover:text-body hover:bg-hover">
          <span className="text-gold"><LogOut size={18} strokeWidth={1.9} /></span>
          Logout
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-page flex w-full">
      <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-gold/20 bg-gradient-to-b from-surface1 to-page fixed inset-y-0 left-0 z-40 flex-col">
        <div className="px-6 pt-5 pb-5 border-b border-gold/10">
          <div className="gold-text font-syne text-2xl font-bold tracking-[-1px]">SpencerSBM</div>
          <p className="text-faint text-[0.7rem] uppercase tracking-[0.2em] mt-1">Admin Panel</p>
        </div>
        {sidebar}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-surface2 border-r border-gold/10 shadow-2xl flex flex-col">
            <div className="px-6 pt-5 pb-5 border-b border-gold/10">
              <div className="gold-text font-syne text-2xl font-bold tracking-[-1px]">SpencerSBM</div>
              <p className="text-faint text-[0.7rem] uppercase tracking-[0.2em] mt-1">Admin Panel</p>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 lg:pl-[260px] min-w-0">
        <header className="sticky top-0 z-30 bg-page/90 backdrop-blur-[10px] border-b border-gold/10">
          <div className="flex items-center justify-between gap-4 px-4 md:px-8 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <button aria-label="Open menu" className="lg:hidden flex flex-col gap-[5px] p-1" onClick={() => setDrawerOpen(true)}>
                <span className="w-[24px] h-[2px] bg-gold" />
                <span className="w-[24px] h-[2px] bg-gold" />
                <span className="w-[24px] h-[2px] bg-gold" />
              </button>
              <h1 className="font-syne text-lg md:text-xl truncate">{SECTIONS.find((s) => s.id === section)?.label || 'Admin'}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleLogout} className="lg:hidden btn-ghost px-4 py-2 text-[0.82rem]">
                Logout
              </button>
              <ThemeToggle />
              <span className="hidden md:inline-block text-[0.85rem] text-muted">{user?.email}</span>
            </div>
          </div>
        </header>

        <main className="px-4 md:px-8 py-6 md:py-8 space-y-6">
          {error && (
            <div className="bg-[#e0645a]/10 border border-[#e0645a]/30 text-[#ff8a80] text-[0.9rem] rounded-[10px] px-4 py-3 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="font-bold ml-3 hover:text-body">&times;</button>
            </div>
          )}
          {toast && (
            <div className="bg-[#2ecc71]/10 border border-[#2ecc71]/30 text-[#2ecc71] text-[0.9rem] rounded-[10px] px-4 py-3">
              {toast}
            </div>
          )}

          {section === 'overview' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? '—'} />
                <StatCard icon={Package} label="Total Sales" value={stats?.totalSales ?? '—'} />
                <StatCard icon={TrendingUp} label="Revenue (NGN)" value={fmtNgn(stats?.revenue)} />
                <StatCard icon={Smartphone} label="Numbers Sold" value={stats?.numbersSold ?? '—'} />
                <StatCard icon={UserRound} label="Accounts Sold" value={stats?.accountsSold ?? '—'} />
                <StatCard icon={ShieldCheck} label="Available Accounts" value={stats?.availableAccounts ?? '—'} />
              </div>

              <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <h2 className="font-syne text-xl">Recent Sales</h2>
                  <button onClick={() => { loadSales(); loadStats(); }} className="btn-ghost px-4 py-2 text-[0.82rem] flex items-center gap-2">
                    <RefreshCw size={15} strokeWidth={1.9} /> Refresh
                  </button>
                </div>
                <SalesTable sales={sales.slice(0, 10)} empty="No sales yet." />
              </div>
            </>
          )}

          {/* ===== MARKETPLACE (pricing) ===== */}
          {section === 'marketplace' && (
            <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-syne text-xl mb-1">Marketplace Products</h2>
                  <p className="text-faint text-[0.85rem]">Browse products and set admin prices. Admin prices override the auto-calculated markup.</p>
                </div>
                <button onClick={loadSvcMarketplace} className="btn-ghost px-4 py-2 text-[0.82rem] flex items-center gap-2">
                  <RefreshCw size={15} strokeWidth={1.9} /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <Field label="Category">
                  <select value={svcMktCategory} onChange={(e) => setSvcMktCategory(e.target.value)} className={inputCls}>
                    <option value="" className="bg-surface2">All categories</option>
                    {svcMarketplaceCategories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-surface2">{c.name} ({c.count})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Search">
                  <div className="relative">
                    <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                    <input
                      value={svcMktSearch}
                      onChange={(e) => setSvcMktSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                    />
                  </div>
                </Field>
              </div>
              {svcMarketplaceLoading ? (
                <p className="text-faint text-[0.9rem] py-6 text-center">Loading products...</p>
              ) : svcMarketplace.length === 0 ? (
                <p className="text-faint text-[0.9rem] py-6 text-center">No products found. Check that the Marketplace service is connected.</p>
              ) : (
                <div className="space-y-3">
                  {svcMarketplace.map((p) => {
                    const override = svcOverrides.find((o) => o.service_type === 'marketplace' && o.provider_id === String(p.id));
                    return (
                      <div key={p.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[0.95rem] break-words leading-snug">{p.name}</div>
                            <div className="text-faint text-[0.78rem] break-words">{p.category || p.platform || '—'}{p.stock !== null ? ` · Stock: ${p.stock}` : ''}</div>
                          </div>
                          {override && (
                            <button onClick={() => removeOverride('marketplace', String(p.id))} className="text-[#e0645a] hover:bg-[#e0645a]/10 rounded-[8px] px-3 py-1.5 text-[0.78rem] font-medium border border-[#e0645a]/30">
                              Remove Override
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="text-[0.82rem] text-faint">
                            Auto price: <span className="text-gold font-semibold">{fmtNgn(p.price)}</span>
                          </div>
                          {override && (
                            <div className="text-[0.82rem] text-faint">
                              Admin price: <span className="text-[#2ecc71] font-semibold">{fmtNgn(override.admin_price)}</span>
                            </div>
                          )}
                          <div className="flex items-end gap-2 ml-auto">
                            <Field label="Set admin price (NGN)">
                              <input
                                type="number"
                                min="1"
                                value={svcEditPrices[`mkt-${p.id}`] ?? override?.admin_price ?? ''}
                                onChange={(e) => setSvcEditPrices((m) => ({ ...m, [`mkt-${p.id}`]: e.target.value }))}
                                className={`${inputCls} w-[140px]`}
                                placeholder={fmtNgn(p.price)}
                              />
                            </Field>
                            <button
                              onClick={() => saveOverride('marketplace', String(p.id), svcEditPrices[`mkt-${p.id}`])}
                              disabled={svcEditPrices[`mkt-${p.id}`] === undefined || svcEditPrices[`mkt-${p.id}`] === ''}
                              className="btn-gold px-4 py-2.5 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== SMS VERIFICATION (pricing) ===== */}
          {section === 'sms' && (
            <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-syne text-xl mb-1">SMS Verification Services</h2>
                  <p className="text-faint text-[0.85rem]">Select a country, search for a service, then set its admin price.</p>
                </div>
                <button onClick={() => { loadSvcSmsCountries(); if (svcSmsCountry) loadSvcSmsServices(); }} className="btn-ghost px-4 py-2 text-[0.82rem] flex items-center gap-2">
                  <RefreshCw size={15} strokeWidth={1.9} /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <Field label="Country">
                  <select
                    value={svcSmsCountry}
                    onChange={(e) => { setSvcSmsCountry(e.target.value); setSvcSmsSearch(''); }}
                    disabled={svcSmsCountriesLoading}
                    className={`${inputCls} disabled:opacity-50`}
                  >
                    <option value="" className="bg-surface2">{svcSmsCountriesLoading ? 'Loading...' : 'Choose a country'}</option>
                    {svcSmsCountries.map((c) => (
                      <option key={c.code} value={c.code} className="bg-surface2">{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Search services">
                  <div className="relative">
                    <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                    <input
                      value={svcSmsSearch}
                      onChange={(e) => setSvcSmsSearch(e.target.value)}
                      disabled={!svcSmsCountry}
                      placeholder={svcSmsCountry ? 'Search by service name or slug…' : 'Choose a country first'}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle disabled:opacity-50"
                    />
                  </div>
                </Field>
              </div>
              {!svcSmsCountry ? (
                <p className="text-faint text-[0.9rem] py-4 text-center">Select a country above to see available services.</p>
              ) : svcSmsServicesLoading ? (
                <p className="text-faint text-[0.9rem] py-6 text-center">Loading services...</p>
              ) : svcSmsServices.length === 0 ? (
                <p className="text-faint text-[0.9rem] py-6 text-center">No services found for this country.</p>
              ) : (
                <div className="space-y-3">
                  {filteredSvcSmsServices.map((s) => {
                    const override = svcOverrides.find((o) => o.service_type === 'sms' && o.provider_id === s.slug);
                    return (
                      <div key={s.slug} className="bg-gold/5 border border-gold/15 rounded-[12px] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[0.95rem] break-words leading-snug">{s.name}</div>
                            <div className="text-faint text-[0.78rem]">Slug: {s.slug}</div>
                          </div>
                          {override && (
                            <button onClick={() => removeOverride('sms', s.slug)} className="text-[#e0645a] hover:bg-[#e0645a]/10 rounded-[8px] px-3 py-1.5 text-[0.78rem] font-medium border border-[#e0645a]/30">
                              Remove Override
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="text-[0.82rem] text-faint">
                            Auto price: <span className="text-gold font-semibold">{fmtNgn(s.price)}</span>
                          </div>
                          {override && (
                            <div className="text-[0.82rem] text-faint">
                              Admin price: <span className="text-[#2ecc71] font-semibold">{fmtNgn(override.admin_price)}</span>
                            </div>
                          )}
                          <div className="flex items-end gap-2 ml-auto">
                            <Field label="Set admin price (NGN)">
                              <input
                                type="number"
                                min="1"
                                value={svcEditPrices[`sms-${s.slug}`] ?? override?.admin_price ?? ''}
                                onChange={(e) => setSvcEditPrices((m) => ({ ...m, [`sms-${s.slug}`]: e.target.value }))}
                                className={`${inputCls} w-[140px]`}
                                placeholder={fmtNgn(s.price)}
                              />
                            </Field>
                            <button
                              onClick={() => saveOverride('sms', s.slug, svcEditPrices[`sms-${s.slug}`])}
                              disabled={svcEditPrices[`sms-${s.slug}`] === undefined || svcEditPrices[`sms-${s.slug}`] === ''}
                              className="btn-gold px-4 py-2.5 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredSvcSmsServices.length === 0 && (
                    <p className="text-faint text-[0.9rem] py-6 text-center">No results for "{svcSmsSearch.trim()}".</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== FOLLOWERS GROWTH (pricing) ===== */}
          {section === 'followers' && (
            <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-syne text-xl mb-1">Followers Growth Services</h2>
                  <p className="text-faint text-[0.85rem]">Filter by platform, search for a service, then set its admin price (per 1K).</p>
                </div>
                <button onClick={loadSvcFlServices} className="btn-ghost px-4 py-2 text-[0.82rem] flex items-center gap-2">
                  <RefreshCw size={15} strokeWidth={1.9} /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <Field label="Platform">
                  <select value={svcFlPlatform} onChange={(e) => { setSvcFlPlatform(e.target.value); setSvcFlSearch(''); }} className={inputCls}>
                    <option value="" className="bg-surface2">All platforms</option>
                    {['Instagram', 'TikTok', 'YouTube', 'Twitter', 'Facebook', 'Telegram'].map((p) => (
                      <option key={p} value={p} className="bg-surface2">{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Search services">
                  <div className="relative">
                    <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                    <input
                      value={svcFlSearch}
                      onChange={(e) => setSvcFlSearch(e.target.value)}
                      placeholder="Search by name, platform or category…"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                    />
                  </div>
                </Field>
              </div>
              {svcFlServicesLoading ? (
                <p className="text-faint text-[0.9rem] py-6 text-center">Loading services...</p>
              ) : svcFlServices.length === 0 ? (
                <p className="text-faint text-[0.9rem] py-6 text-center">No services found. Check that the Followers Growth service is connected.</p>
              ) : (
                <div className="space-y-3">
                  {filteredSvcFlServices.map((s) => {
                    const override = svcOverrides.find((o) => o.service_type === 'followers' && o.provider_id === String(s.id));
                    return (
                      <div key={s.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[0.95rem] break-words leading-snug">{s.name}</div>
                            <div className="text-faint text-[0.78rem] break-words">{s.platform} · {s.category || '—'} · Min: {Number(s.min).toLocaleString()} · Max: {Number(s.max).toLocaleString()}</div>
                          </div>
                          {override && (
                            <button onClick={() => removeOverride('followers', String(s.id))} className="text-[#e0645a] hover:bg-[#e0645a]/10 rounded-[8px] px-3 py-1.5 text-[0.78rem] font-medium border border-[#e0645a]/30">
                              Remove Override
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="text-[0.82rem] text-faint">
                            Auto price (per 1K): <span className="text-gold font-semibold">{fmtNgn(s.priceNgnPer1000)}</span>
                          </div>
                          {override && (
                            <div className="text-[0.82rem] text-faint">
                              Admin price (per 1K): <span className="text-[#2ecc71] font-semibold">{fmtNgn(override.admin_price)}</span>
                            </div>
                          )}
                          <div className="flex items-end gap-2 ml-auto">
                            <Field label="Set admin price (NGN per 1K)">
                              <input
                                type="number"
                                min="1"
                                value={svcEditPrices[`flw-${s.id}`] ?? override?.admin_price ?? ''}
                                onChange={(e) => setSvcEditPrices((m) => ({ ...m, [`flw-${s.id}`]: e.target.value }))}
                                className={`${inputCls} w-[140px]`}
                                placeholder={fmtNgn(s.priceNgnPer1000)}
                              />
                            </Field>
                            <button
                              onClick={() => saveOverride('followers', String(s.id), svcEditPrices[`flw-${s.id}`])}
                              disabled={svcEditPrices[`flw-${s.id}`] === undefined || svcEditPrices[`flw-${s.id}`] === ''}
                              className="btn-gold px-4 py-2.5 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredSvcFlServices.length === 0 && (
                    <p className="text-faint text-[0.9rem] py-6 text-center">No results for "{svcFlSearch.trim()}".</p>
                  )}
                </div>
              )}
            </div>
          )}

          {section === 'sales' && (
            <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="font-syne text-xl">All Sales ({sales.length})</h2>
                <button onClick={loadSales} className="btn-ghost px-4 py-2 text-[0.82rem] flex items-center gap-2">
                  <RefreshCw size={15} strokeWidth={1.9} /> Refresh
                </button>
              </div>
              <SalesTable sales={sales} empty="No sales yet." />
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-6">
              <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <div>
                    <h2 className="font-syne text-xl mb-1">User Notifications</h2>
                    <p className="text-faint text-[0.85rem]">
                      See exactly what in-app notifications a user received — order updates, refunds and wallet top-ups — for support debugging.
                    </p>
                  </div>
                  <button
                    onClick={() => loadUserNotifications(notifUserId)}
                    disabled={!notifUserId}
                    className="btn-ghost px-4 py-2 text-[0.82rem] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={15} strokeWidth={1.9} /> Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <Field label="Search users">
                    <div className="relative">
                      <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                      <input
                        value={notifSearch}
                        onChange={(e) => setNotifSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                      />
                    </div>
                  </Field>
                  <Field label="User">
                    <select
                      value={notifUserId}
                      onChange={(e) => {
                        setNotifUserId(e.target.value);
                        loadUserNotifications(e.target.value);
                      }}
                      className={inputCls}
                    >
                      <option value="" className="bg-surface2">Choose a user</option>
                      {filteredNotifUsers.map((u) => (
                        <option key={u.id} value={u.id} className="bg-surface2">
                          {u.name} · {u.email} ({u.unreadNotifications || 0} unread)
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {!notifUserId ? (
                  <p className="text-faint text-[0.9rem] py-6 text-center">Choose a user above to see their notification history.</p>
                ) : notifLoading ? (
                  <p className="text-faint text-[0.9rem] py-6 text-center">Loading notifications…</p>
                ) : !notifData ? (
                  <p className="text-faint text-[0.9rem] py-6 text-center">No data loaded.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-[0.88rem] text-muted">
                        {notifData.user?.name} · {notifData.user?.email}
                      </span>
                      <span className="text-[0.72rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border text-gold border-gold/30 bg-gold/10">
                        {notifData.notifications.length} total
                      </span>
                      {notifData.unread > 0 && (
                        <span className="text-[0.72rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border text-[#e0645a] border-[#e0645a]/30 bg-[#e0645a]/10">
                          {notifData.unread} unread
                        </span>
                      )}
                    </div>
                    {notifData.notifications.length === 0 ? (
                      <p className="text-faint text-[0.9rem] py-6 text-center">This user has no notifications.</p>
                    ) : (
                      <div className="space-y-2">
                        {notifData.notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`bg-gold/5 border border-gold/15 rounded-[12px] px-4 py-3 flex gap-3 ${n.read ? 'opacity-70' : ''}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mt-[7px] shrink-0 ${
                                n.read
                                  ? 'bg-softline'
                                  : n.type === 'success'
                                    ? 'bg-[#2ecc71]'
                                    : n.type === 'error'
                                      ? 'bg-[#e0645a]'
                                      : n.type === 'refund'
                                        ? 'bg-gold'
                                        : 'bg-muted'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[0.88rem] font-medium">{n.title}</span>
                                <span className="text-[0.62rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-gold/25 bg-gold/10 text-gold">
                                  {n.type}
                                </span>
                                {!n.read && (
                                  <span className="text-[0.62rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border text-[#e0645a] border-[#e0645a]/30 bg-[#e0645a]/10">
                                    unread
                                  </span>
                                )}
                              </div>
                              {n.body && <div className="text-faint text-[0.8rem] leading-snug mt-0.5">{n.body}</div>}
                              <div className="text-[0.68rem] text-subtle mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {section === 'users' && (
            <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="font-syne text-xl">All Users ({users.length})</h2>
                <button onClick={loadUsers} className="btn-ghost px-4 py-2 text-[0.82rem] flex items-center gap-2">
                  <RefreshCw size={15} strokeWidth={1.9} /> Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[0.9rem]">
                  <thead>
                    <tr className="text-faint text-[0.72rem] uppercase tracking-wider border-b border-gold/10">
                      <th className="py-3 pr-4">Name</th>
                      <th className="py-3 pr-4">Email</th>
                      <th className="py-3 pr-4">Role</th>
                      <th className="py-3 pr-4">Wallet</th>
                      <th className="py-3 pr-4">Orders</th>
                      <th className="py-3 pr-4">Joined</th>
                      <th className="py-3">Notifs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-softline">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 pr-4 font-medium">{u.name}</td>
                        <td className="py-3 pr-4 text-muted">{u.email}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-[0.7rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border ${u.role === 'admin' ? 'text-gold border-gold/40 bg-gold/10' : 'text-muted border-softline'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gold">{fmtNgn(u.balance)}</td>
                        <td className="py-3 pr-4">{u.orders}</td>
                        <td className="py-3 pr-4 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <button
                            onClick={() => openUserNotifications(u.id)}
                            title="View notifications"
                            aria-label={`View notifications for ${u.name}`}
                            className="relative text-gold hover:bg-gold/10 rounded-[8px] p-2 transition-colors"
                          >
                            <Bell size={15} strokeWidth={1.9} />
                            {(u.unreadNotifications || 0) > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-gold text-night text-[0.58rem] font-bold flex items-center justify-center">
                                {u.unreadNotifications > 9 ? '9+' : u.unreadNotifications}
                              </span>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SalesTable({ sales, empty }) {
  if (sales.length === 0) {
    return <p className="text-faint text-[0.95rem] py-6 text-center">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[0.9rem]">
        <thead>
          <tr className="text-faint text-[0.72rem] uppercase tracking-wider border-b border-gold/10">
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4">Customer</th>
            <th className="py-3 pr-4">Product</th>
            <th className="py-3 pr-4">Type</th>
            <th className="py-3 pr-4">Amount</th>
            <th className="py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-softline">
          {sales.map((s) => (
            <tr key={s.id}>
              <td className="py-3 pr-4 text-muted whitespace-nowrap">{new Date(s.createdAt).toLocaleString()}</td>
              <td className="py-3 pr-4">{s.userName || s.userEmail}</td>
              <td className="py-3 pr-4 font-medium">{s.productName}</td>
              <td className="py-3 pr-4">
                <span className={`text-[0.7rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border ${s.type === 'social_account' ? 'text-gold border-gold/40 bg-gold/10' : 'text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10'}`}>
                  {s.type === 'social_account' ? 'Account' : 'Number'}
                </span>
              </td>
              <td className="py-3 pr-4 text-gold font-semibold">{fmtNgn(s.price)}</td>
              <td className="py-3">
                <span className="text-[0.7rem] font-semibold uppercase px-2.5 py-1 rounded-[50px] border text-gold border-gold/30 bg-gold/10">
                  {s.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}