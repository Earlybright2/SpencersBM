import { useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { countries } from '../data/marketplace.js';
import { platformIcon } from '../data/marketplace.js';

const inputCls =
  'w-full px-3.5 py-2.5 bg-[#0d0d0d] border border-gold/20 rounded-[10px] text-white text-[0.9rem] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-[#555]';

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

// Cascading browse for social media accounts: pick a platform, then a country, then buy.
export default function CascadingAccounts({ items, onBuy, busy }) {
  const [platform, setPlatform] = useState('');
  const [country, setCountry] = useState('');

  const platforms = useMemo(() => {
    const map = new Map();
    items.forEach((p) => {
      if (!p.platform) return;
      if (!map.has(p.platform)) map.set(p.platform, 0);
      map.set(p.platform, map.get(p.platform) + 1);
    });
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const countriesAvailable = useMemo(() => {
    const map = new Map();
    items.forEach((p) => {
      if (p.platform !== platform) return;
      const key = p.country || 'Mixed';
      const name = p.countryName || key;
      if (!map.has(key)) map.set(key, { key, name, count: 0 });
      map.get(key).count += 1;
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, platform]);

  const results = useMemo(
    () =>
      items.filter((p) => p.platform === platform && (p.country || 'Mixed') === country),
    [items, platform, country]
  );

  const onPlatformChange = (v) => {
    setPlatform(v);
    setCountry('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.72rem] uppercase tracking-wider text-gray-500 font-medium">1. Select platform</label>
          <select value={platform} onChange={(e) => onPlatformChange(e.target.value)} className={inputCls}>
            <option value="">Choose a platform</option>
            {platforms.map((s) => (
              <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.72rem] uppercase tracking-wider text-gray-500 font-medium">2. Select country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} disabled={!platform} className={`${inputCls} disabled:opacity-50`}>
            <option value="">Choose a country</option>
            {countriesAvailable.map((c) => (
              <option key={c.key} value={c.key}>{c.name} ({c.count})</option>
            ))}
          </select>
        </div>
      </div>

      {!platform ? (
        <p className="text-gray-500 text-[0.95rem] py-6 text-center">
          Pick a platform above to browse available accounts.
        </p>
      ) : !country ? (
        <p className="text-gray-500 text-[0.95rem] py-6 text-center">
          Now pick a country to see prices and buy.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((p) => {
            const Icon = platformIcon(p.platform);
            const soldOut = p.available <= 0;
            return (
              <div key={p.id} className="card-border bg-night/40 rounded-[12px] p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[1.4rem] leading-none">{flagFor(p.countryName)}</span>
                  <span className="w-9 h-9 rounded-[9px] bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0">
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-[0.95rem] truncate">{p.platform}</div>
                    <div className="text-gray-500 text-[0.78rem]">{p.countryName || p.country} · {p.available} available</div>
                  </div>
                </div>
                {p.desc && <p className="text-gray-400 text-[0.82rem] mb-3 line-clamp-2">{p.desc}</p>}
                <div className="text-[0.9rem] mb-4">
                  <span className="text-gold font-semibold text-lg">{fmtNgn(p.price)}</span>
                </div>
                <button
                  onClick={() => onBuy(p)}
                  disabled={Boolean(busy) || soldOut}
                  className="btn-gold w-full py-3 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <UserRound size={16} strokeWidth={1.8} />
                  {busy === `buy-${p.id}` ? 'Buying...' : soldOut ? 'Sold Out' : 'Buy Account'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
