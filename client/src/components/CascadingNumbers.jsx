import { useMemo, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { countries } from '../data/marketplace.js';
import QuantityStepper from './QuantityStepper.jsx';

const inputCls =
  'w-full px-3.5 py-2.5 bg-input border border-gold/20 rounded-[10px] text-body text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-subtle';

const countryFlags = Object.fromEntries(
  countries.map((c) => [c.name.toLowerCase().replace(/\s+/g, ''), c.flag])
);
countryFlags['unitedstates'] = '🇺🇸';
countryFlags['uae'] = '🇦🇪';

function flagFor(countryName) {
  const key = String(countryName || '').toLowerCase().replace(/\s+/g, '');
  return countryFlags[key] || '🌍';
}

const fmtNgn = (n) => `\u20A6${Number(n || 0).toLocaleString()}`;

// Cascading browse: pick a service, then a country, then buy.
export default function CascadingNumbers({ items, onBuy, busy }) {
  const [service, setService] = useState('');
  const [country, setCountry] = useState('');
  const [qty, setQty] = useState({});

  const services = useMemo(() => {
    const map = new Map();
    items.forEach((p) => {
      const name = p.serviceName || p.service;
      if (!name) return;
      if (!map.has(name)) map.set(name, 0);
      map.set(name, map.get(name) + 1);
    });
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const countriesAvailable = useMemo(() => {
    const map = new Map();
    items.forEach((p) => {
      if ((p.serviceName || p.service) !== service) return;
      const key = p.country || 'unknown';
      const name = p.countryName || key;
      if (!map.has(key)) map.set(key, { key, name, count: 0 });
      map.get(key).count += 1;
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, service]);

  const results = useMemo(
    () =>
      items.filter(
        (p) => (p.serviceName || p.service) === service && (p.country || 'unknown') === country
      ),
    [items, service, country]
  );

  const onServiceChange = (v) => {
    setService(v);
    setCountry('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.72rem] uppercase tracking-wider text-faint font-medium">1. Select platform / service</label>
          <select value={service} onChange={(e) => onServiceChange(e.target.value)} className={inputCls}>
            <option value="">Choose a service</option>
            {services.map((s) => (
              <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.72rem] uppercase tracking-wider text-faint font-medium">2. Select country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} disabled={!service} className={`${inputCls} disabled:opacity-50`}>
            <option value="">Choose a country</option>
            {countriesAvailable.map((c) => (
              <option key={c.key} value={c.key}>{c.name} ({c.count})</option>
            ))}
          </select>
        </div>
      </div>

      {!service ? (
        <p className="text-faint text-[0.95rem] py-6 text-center">
          Pick a platform above to browse available numbers.
        </p>
      ) : !country ? (
        <p className="text-faint text-[0.95rem] py-6 text-center">
          Now pick a country to see prices and buy.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((p) => (
            <div key={p.id} className="card-border bg-card rounded-[12px] p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[1.6rem] leading-none">{flagFor(p.countryName)}</span>
                <div className="min-w-0">
                  <div className="font-medium text-[0.95rem] truncate">{p.serviceName || p.service}</div>
                  <div className="text-faint text-[0.78rem]">{p.countryName || p.country}</div>
                </div>
              </div>
              <div className="text-[0.9rem] mb-3">
                <span className="text-gold font-semibold text-lg">{fmtNgn(p.price)}</span>
                {(qty[p.id] || 1) > 1 && (
                  <span className="text-faint text-[0.82rem] ml-2">
                    × {qty[p.id] || 1} = <span className="text-gold font-semibold">{fmtNgn(p.price * (qty[p.id] || 1))}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <QuantityStepper
                  value={qty[p.id] || 1}
                  onChange={(v) => setQty((prev) => ({ ...prev, [p.id]: v }))}
                  disabled={Boolean(busy)}
                />
                <span className="text-faint text-[0.72rem] uppercase tracking-wider font-medium">Quantity</span>
              </div>
              <button
                onClick={() => onBuy(p, qty[p.id] || 1)}
                disabled={Boolean(busy)}
                className="btn-gold w-full py-3 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Smartphone size={16} strokeWidth={1.8} />
                {busy === `buy-${p.id}` ? 'Buying...' : (qty[p.id] || 1) > 1 ? `Buy ${qty[p.id] || 1} Numbers` : 'Buy Number'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}