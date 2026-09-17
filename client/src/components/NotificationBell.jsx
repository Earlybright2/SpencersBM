import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import api from '../api.js';

// Header notification bell: polls /api/notifications, shows an unread badge and
// opens a dropdown with the latest notifications. Opening the panel marks them
// all as read (POST /api/notifications/read).
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data?.notifications || []);
      setUnread(res.data?.unread || 0);
    } catch {
      // Notifications are non-critical; silence auth/401 noise.
    }
  };

  // Initial load + light polling (45s) so top-ups/refunds pop up while the
  // dashboard is open.
  useEffect(() => {
    load();
    const id = setInterval(load, 45_000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Mark read immediately so the badge clears while the panel is open.
      setUnread(0);
      setLoading(true);
      try {
        const res = await api.post('/notifications/read');
        setItems(res.data?.notifications || []);
      } catch {
        // Non-critical — the badge will clear on next load.
      } finally {
        setLoading(false);
      }
    }
  };

  const dotColor = (t) =>
    t === 'success'
      ? 'bg-[#2ecc71]'
      : t === 'error'
        ? 'bg-[#e0645a]'
        : t === 'refund'
          ? 'bg-gold'
          : 'bg-muted';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        title="Notifications"
        className="relative w-10 h-10 rounded-[11px] border border-gold/20 bg-gold/5 text-gold flex items-center justify-center hover:bg-gold/15 hover:border-gold/40 transition-colors"
      >
        <Bell size={18} strokeWidth={1.9} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-night text-[0.62rem] font-bold flex items-center justify-center shadow-[0_2px_8px_rgba(255,199,0,0.5)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[320px] sm:w-[360px] card-border bg-card rounded-[14px] shadow-2xl z-50 overflow-hidden animate-[rise_0.25s_ease]">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-softline">
            <span className="font-syne text-[0.95rem] font-semibold">Notifications</span>
            {items.length > 0 && (
              <button
                onClick={async () => {
                  try {
                    const res = await api.post('/notifications/read');
                    setItems(res.data?.notifications || []);
                    setUnread(0);
                  } catch { /* non-critical */ }
                }}
                className="flex items-center gap-1.5 text-[0.72rem] text-gold hover:text-gold-light"
                title="Mark all as read"
              >
                <CheckCheck size={13} strokeWidth={2} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="text-faint text-[0.85rem] text-center py-8">Loading…</p>
            ) : items.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={30} strokeWidth={1.4} className="text-faint mx-auto mb-3" />
                <p className="text-faint text-[0.85rem]">No notifications yet.</p>
                <p className="text-faint text-[0.75rem] mt-1">Order updates and wallet top-ups will appear here.</p>
              </div>
            ) : (
              items.slice(0, 15).map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-softline/60 flex gap-3 last:border-b-0 ${n.read ? 'opacity-70' : ''}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mt-[7px] shrink-0 ${n.read ? 'bg-softline' : dotColor(n.type)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.85rem] font-medium leading-snug">{n.title}</div>
                    {n.body && <div className="text-faint text-[0.78rem] leading-snug mt-0.5">{n.body}</div>}
                    <div className="text-[0.68rem] text-subtle mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && <Check size={13} strokeWidth={2.2} className="text-gold shrink-0 mt-1" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
