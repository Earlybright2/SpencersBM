import { useEffect, useRef, useState } from 'react';

export default function CountdownTimer({ expiresAt, onExpired, className = '' }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  const fired = useRef(false);
  const cb = useRef(onExpired);
  cb.current = onExpired;

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setLeft(next);
      if (next <= 0 && !fired.current) {
        fired.current = true;
        cb.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const totalSec = Math.ceil(left / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {totalSec <= 0 ? '00:00' : hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}
    </span>
  );
}