import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Smartphone, UserRound, ReceiptText, Users, LogOut, Trash2, RefreshCw, ShieldCheck, Power, TrendingUp, Package, Search } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'numbers', label: 'Numbers', icon: Smartphone },
  { id: 'accounts', label: 'Accounts', icon: UserRound },
  { id: 'sales', label: 'Sales', icon: ReceiptText },
  { id: 'users', label: 'Users', icon: Users }
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
  const [products, setProducts] = useState({ numbers: [], accounts: [] });
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);

  const [numbersSearch, setNumbersSearch] = useState('');
  const [accountsSearch, setAccountsSearch] = useState('');

  const [servers, setServers] = useState([]);

  const [digServers, setDigServers] = useState([]);

  const [digSync, setDigSync] = useState({ server: '', category: '', search: '' });
  const [digSyncing, setDigSyncing] = useState(false);
  const [digResult, setDigResult] = useState(null);

  const [syncServer, setSyncServer] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const [editService, setEditService] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editPrices, setEditPrices] = useState({});
  const [editAccServer, setEditAccServer] = useState('');
  const [editAccService, setEditAccService] = useState('');

  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/admin/products');
      setProducts(res.data.products || { numbers: [], accounts: [] });
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

  useEffect(() => {
    loadStats();
    loadProducts();
    loadSales();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadServers = async () => {
    try {
      const res = await api.get('/onegridhub/servers');
      setServers(res.data.servers || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (section === 'numbers' || section === 'accounts') loadServers();
    if (section === 'accounts') loadDigServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const loadDigServers = async () => {
    try {
      const res = await api.get('/onegridhub/digital/servers');
      setDigServers(res.data.servers || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const syncNumbers = async () => {
    if (!syncServer || syncing) return;
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await api.post('/onegridhub/sync-numbers', { server: syncServer });
      setSyncResult(res.data);
      setToast('Number products synced from provider');
      loadProducts();
      loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const editServices = useMemo(() => {
    const set = new Set();
    products.numbers.forEach((p) => {
      const name = p.serviceName || p.service;
      if (name) set.add(name);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products.numbers]);

  const editCountries = useMemo(() => {
    const map = new Map();
    products.numbers.forEach((p) => {
      if ((p.serviceName || p.service) !== editService) return;
      const key = p.country || 'unknown';
      if (!map.has(key)) map.set(key, p.countryName || key);
    });
    return [...map.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products.numbers, editService]);

  const editMatches = useMemo(
    () =>
      products.numbers.filter(
        (p) => (p.serviceName || p.service) === editService && (p.country || 'unknown') === editCountry
      ),
    [products.numbers, editService, editCountry]
  );

  const saveNumberPrice = async (id) => {
    const price = Number(editPrices[id]);
    if (!Number.isFinite(price) || price <= 0) {
      setError('Enter a valid positive price');
      return;
    }
    try {
      await api.put(`/admin/products/numbers/${id}`, { price });
      setToast('Price updated');
      setEditPrices((m) => ({ ...m, [id]: '' }));
      loadProducts();
      loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const editAccServers = useMemo(() => {
    const set = new Set();
    products.accounts.forEach((p) => {
      if (p.providerServer) set.add(p.providerServer);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products.accounts]);

  const editAccServices = useMemo(() => {
    const map = new Map();
    products.accounts.forEach((p) => {
      if (editAccServer && p.providerServer !== editAccServer) return;
      const key = `${p.platform}|${p.country || 'Mixed'}`;
      const name = `${p.platform}${p.countryName ? ` · ${p.countryName}` : ''}`;
      if (!map.has(key)) map.set(key, { key, name });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products.accounts, editAccServer]);

  const editAccMatches = useMemo(
    () =>
      products.accounts.filter((p) => {
        if (editAccServer && p.providerServer !== editAccServer) return false;
        if (editAccService && `${p.platform}|${p.country || 'Mixed'}` !== editAccService) return false;
        return true;
      }),
    [products.accounts, editAccServer, editAccService]
  );

  const filteredNumbers = useMemo(() => {
    const q = numbersSearch.trim().toLowerCase();
    if (!q) return products.numbers;
    return products.numbers.filter((p) =>
      `${p.serviceName || p.service || ''} ${p.countryName || p.country || ''} ${p.price || ''}`.toLowerCase().includes(q)
    );
  }, [products.numbers, numbersSearch]);

  const filteredAccounts = useMemo(() => {
    const q = accountsSearch.trim().toLowerCase();
    if (!q) return products.accounts;
    return products.accounts.filter((p) =>
      `${p.platform || ''} ${p.countryName || p.country || ''} ${p.desc || ''} ${p.price || ''}`.toLowerCase().includes(q)
    );
  }, [products.accounts, accountsSearch]);

  const saveAccountPrice = async (id) => {
    const price = Number(editPrices[id]);
    if (!Number.isFinite(price) || price <= 0) {
      setError('Enter a valid positive price');
      return;
    }
    try {
      await api.put(`/admin/products/accounts/${id}`, { price });
      setToast('Price updated');
      setEditPrices((m) => ({ ...m, [id]: '' }));
      loadProducts();
      loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const updateNumber = async (id, updates) => {
    try {
      await api.put(`/admin/products/numbers/${id}`, updates);
      setToast('Updated');
      loadProducts();
      loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const deleteNumber = async (id) => {
    try {
      await api.delete(`/admin/products/numbers/${id}`);
      setToast('Number product removed');
      loadProducts();
      loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const updateAccount = async (id, updates) => {
    try {
      await api.put(`/admin/products/accounts/${id}`, updates);
      setToast('Updated');
      loadProducts();
      loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const deleteAccount = async (id) => {
    try {
      await api.delete(`/admin/products/accounts/${id}`);
      setToast('Account product removed');
      loadProducts();
      loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const syncDigital = async () => {
    if (!digSync.server || digSyncing) return;
    setDigSyncing(true);
    setError('');
    setDigResult(null);
    try {
      const res = await api.post('/admin/digital/sync', {
        server: digSync.server,
        category: digSync.category || undefined,
        search: digSync.search || undefined
      });
      setDigResult(res.data);
      setToast('Social account products synced from provider');
      loadProducts();
      loadStats();
      loadDigServers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDigSyncing(false);
    }
  };

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
        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-[10px] rounded-[10px] text-[0.9rem] font-medium text-muted hover:text-body hover:bg-hover">
          <span className="text-gold"><ShieldCheck size={18} strokeWidth={1.9} /></span>
          Dashboard
        </Link>
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

          {section === 'numbers' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8 xl:col-span-2">
                <h2 className="font-syne text-xl mb-1">Sync Numbers from Provider</h2>
                <p className="text-faint text-[0.85rem] mb-5">
                  Fetches available numbers and prices from OneGridHub for a server and updates the marketplace (popular services only, auto-priced with margin).
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <Field label="Provider server">
                      <select value={syncServer} onChange={(e) => setSyncServer(e.target.value)} className={inputCls}>
                        <option value="" className="bg-surface2">Select a server</option>
                        {servers.map((s) => (
                          <option key={s.id} value={s.id} className="bg-surface2">{s.label} ({s.region})</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <button onClick={syncNumbers} disabled={!syncServer || syncing} className="btn-gold px-6 py-2.5 text-[0.9rem] disabled:opacity-50 flex items-center gap-2">
                    <RefreshCw size={16} strokeWidth={2} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
                {syncResult && (
                  <p className="text-[0.85rem] text-muted mt-4">
                    Created <span className="text-gold font-semibold">{syncResult.created}</span> · Updated{' '}
                    <span className="text-gold font-semibold">{syncResult.updated}</span> · Skipped{' '}
                    <span className="text-faint">{syncResult.skipped}</span>
                  </p>
                )}
              </div>

              <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8 xl:col-span-2">
                <h2 className="font-syne text-xl mb-1">Edit Number Prices</h2>
                <p className="text-faint text-[0.85rem] mb-5">
                  Pick a platform, then a country, to see and update the current price of that pack.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Field label="1. Platform / service">
                    <select
                      value={editService}
                      onChange={(e) => { setEditService(e.target.value); setEditCountry(''); setEditPrices({}); }}
                      className={inputCls}
                    >
                      <option value="" className="bg-surface2">Choose a service</option>
                      {editServices.map((s) => (
                        <option key={s} value={s} className="bg-surface2">{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="2. Country">
                    <select
                      value={editCountry}
                      onChange={(e) => { setEditCountry(e.target.value); setEditPrices({}); }}
                      disabled={!editService}
                      className={`${inputCls} disabled:opacity-50`}
                    >
                      <option value="" className="bg-surface2">Choose a country</option>
                      {editCountries.map((c) => (
                        <option key={c.key} value={c.key} className="bg-surface2">{c.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {editMatches.length === 0 ? (
                  <p className="text-faint text-[0.9rem] py-4 text-center">
                    {editService ? (editCountry ? 'No products for this selection.' : 'Pick a country to see the current price.') : 'Pick a platform above.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {editMatches.map((p) => (
                      <div key={p.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-4 flex flex-wrap items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.9rem] font-medium">{p.serviceName || p.service} · {p.countryName || p.country}</div>
                          <div className="text-faint text-[0.78rem]">Current price: {fmtNgn(p.price)} · {p.server}</div>
                        </div>
                        <div className="flex items-end gap-2">
                          <Field label="New price (NGN)">
                            <input
                              type="number"
                              min="1"
                              value={editPrices[p.id] ?? p.price}
                              onChange={(e) => setEditPrices((m) => ({ ...m, [p.id]: e.target.value }))}
                              className={`${inputCls} w-[140px]`}
                            />
                          </Field>
                          <button onClick={() => saveNumberPrice(p.id)} className="btn-gold px-4 py-2.5 text-[0.85rem]">Save</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8 xl:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <h2 className="font-syne text-xl">Number Products ({filteredNumbers.length})</h2>
                  <div className="relative w-full max-w-[300px]">
                    <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                    <input
                      value={numbersSearch}
                      onChange={(e) => setNumbersSearch(e.target.value)}
                      placeholder="Search service, country or price…"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                    />
                  </div>
                </div>
                {filteredNumbers.length === 0 ? (
                  <p className="text-faint text-[0.95rem] py-6 text-center">
                    {products.numbers.length === 0 ? 'No number products yet.' : `No results for "${numbersSearch.trim()}".`}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredNumbers.map((p) => (
                      <div key={p.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="font-medium text-[0.95rem]">{p.serviceName || p.service} · {p.countryName || p.country}</div>
                            <div className="text-faint text-[0.78rem]">{p.server}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateNumber(p.id, { enabled: !p.enabled })}
                              className={`px-3 py-1.5 rounded-[50px] text-[0.75rem] font-semibold border ${p.enabled ? 'text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10' : 'text-muted border-softline bg-hover'}`}
                            >
                              <Power size={13} strokeWidth={2} className="inline mr-1" /> {p.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                            <button onClick={() => deleteNumber(p.id)} className="text-[#e0645a] hover:bg-[#e0645a]/10 rounded-[8px] p-2">
                              <Trash2 size={16} strokeWidth={1.8} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-gold font-semibold">{fmtNgn(p.price)}</span>
                          <input
                            type="number"
                            min="1"
                            defaultValue={p.price}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v) && v > 0 && v !== p.price) updateNumber(p.id, { price: v });
                            }}
                            className="w-32 px-3 py-2 bg-input border border-gold/20 rounded-[8px] text-body text-[0.88rem] outline-none focus:border-gold"
                          />
                          <span className="text-[0.75rem] text-faint">Edit price, then click away</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'accounts' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8 xl:col-span-2">
                <h2 className="font-syne text-xl mb-1">Sync Social Accounts from Provider</h2>
                <p className="text-faint text-[0.85rem] mb-5">
                  Fetches pre-built social media accounts from OneGridHub (digital products) and adds them to the marketplace, auto-priced with margin.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <Field label="Provider server">
                      <select value={digSync.server} onChange={(e) => setDigSync((f) => ({ ...f, server: e.target.value }))} className={inputCls}>
                        <option value="" className="bg-surface2">Select a server</option>
                        {digServers.map((s) => (
                          <option key={s.id} value={s.id} className="bg-surface2">{s.label} ({s.products} products)</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <Field label="Category (optional)">
                      <input
                        type="text"
                        value={digSync.category}
                        onChange={(e) => setDigSync((f) => ({ ...f, category: e.target.value }))}
                        placeholder="e.g. Instagram"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <Field label="Search (optional)">
                      <input
                        type="text"
                        value={digSync.search}
                        onChange={(e) => setDigSync((f) => ({ ...f, search: e.target.value }))}
                        placeholder="Filter by name"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <button onClick={syncDigital} disabled={!digSync.server || digSyncing} className="btn-gold px-6 py-2.5 text-[0.9rem] disabled:opacity-50 flex items-center gap-2">
                    <RefreshCw size={16} strokeWidth={2} className={digSyncing ? 'animate-spin' : ''} />
                    {digSyncing ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
                {digResult && (
                  <p className="text-[0.85rem] text-muted mt-4">
                    Created <span className="text-gold font-semibold">{digResult.created}</span> · Updated{' '}
                    <span className="text-gold font-semibold">{digResult.updated}</span> · Skipped{' '}
                    <span className="text-faint">{digResult.skipped}</span>
                  </p>
                )}
              </div>

              <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8 xl:col-span-2">
                <h2 className="font-syne text-xl mb-1">Edit Account Prices</h2>
                <p className="text-faint text-[0.85rem] mb-5">
                  Pick a provider server, then a service (platform + country) to see and update the sell price of each account product.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Field label="1. Provider server">
                    <select
                      value={editAccServer}
                      onChange={(e) => { setEditAccServer(e.target.value); setEditAccService(''); setEditPrices({}); }}
                      className={inputCls}
                    >
                      <option value="" className="bg-surface2">All servers</option>
                      {editAccServers.map((s) => (
                        <option key={s} value={s} className="bg-surface2">{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="2. Service (platform · country)">
                    <select
                      value={editAccService}
                      onChange={(e) => { setEditAccService(e.target.value); setEditPrices({}); }}
                      className={inputCls}
                    >
                      <option value="" className="bg-surface2">All services</option>
                      {editAccServices.map((s) => (
                        <option key={s.key} value={s.key} className="bg-surface2">{s.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {editAccMatches.length === 0 ? (
                  <p className="text-faint text-[0.9rem] py-4 text-center">
                    No account products match this selection. Sync from the provider above or add one below.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {editAccMatches.map((p) => (
                      <div key={p.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-4 flex flex-wrap items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.9rem] font-medium">
                            {p.platform}{p.countryName ? ` · ${p.countryName}` : ''}
                          </div>
                          <div className="text-faint text-[0.78rem]">
                            Current price: {fmtNgn(p.price)}{p.providerServer ? ` · ${p.providerServer}` : ''}
                          </div>
                        </div>
                        <div className="flex items-end gap-2">
                          <Field label="New price (NGN)">
                            <input
                              type="number"
                              min="1"
                              value={editPrices[p.id] ?? p.price}
                              onChange={(e) => setEditPrices((m) => ({ ...m, [p.id]: e.target.value }))}
                              className={`${inputCls} w-[140px]`}
                            />
                          </Field>
                          <button onClick={() => saveAccountPrice(p.id)} className="btn-gold px-4 py-2.5 text-[0.85rem]">Save</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-border bg-gold/3 rounded-[15px] p-6 md:p-8 xl:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <h2 className="font-syne text-xl">Account Products ({filteredAccounts.length})</h2>
                  <div className="relative w-full max-w-[300px]">
                    <Search size={16} strokeWidth={1.9} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
                    <input
                      value={accountsSearch}
                      onChange={(e) => setAccountsSearch(e.target.value)}
                      placeholder="Search platform, country or price…"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle"
                    />
                  </div>
                </div>
                {filteredAccounts.length === 0 ? (
                  <p className="text-faint text-[0.95rem] py-6 text-center">
                    {products.accounts.length === 0 ? 'No account products yet.' : `No results for "${accountsSearch.trim()}".`}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredAccounts.map((p) => {
                      const isProvider = Boolean(p.providerProductId);
                      return (
                        <div key={p.id} className="bg-gold/5 border border-gold/15 rounded-[12px] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <div>
                              <div className="font-medium text-[0.95rem]">{p.platform}{p.countryName ? ` · ${p.countryName}` : ''}</div>
                              <div className="text-faint text-[0.78rem]">{p.desc || '—'}{isProvider ? ` · ${p.providerServer || ''}${p.providerProductId ? ` (${p.providerProductId})` : ''}` : ''}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateAccount(p.id, { enabled: !p.enabled })}
                                className={`px-3 py-1.5 rounded-[50px] text-[0.75rem] font-semibold border ${p.enabled ? 'text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10' : 'text-muted border-softline bg-hover'}`}
                              >
                                <Power size={13} strokeWidth={2} className="inline mr-1" /> {p.enabled ? 'Enabled' : 'Disabled'}
                              </button>
                              <button onClick={() => deleteAccount(p.id)} className="text-[#e0645a] hover:bg-[#e0645a]/10 rounded-[8px] p-2">
                                <Trash2 size={16} strokeWidth={1.8} />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-gold font-semibold">{fmtNgn(p.price)}</span>
                            <input
                              type="number"
                              min="1"
                              defaultValue={p.price}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (Number.isFinite(v) && v > 0 && v !== p.price) updateAccount(p.id, { price: v });
                              }}
                              className="w-32 px-3 py-2 bg-input border border-gold/20 rounded-[8px] text-body text-[0.88rem] outline-none focus:border-gold"
                            />
                            <span className="text-[0.75rem] text-faint">Edit price, then click away</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
                      <th className="py-3">Joined</th>
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
                        <td className="py-3 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
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