import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange, className = '' }) {
  if (!totalPages || totalPages <= 1) return null;

  const prev = () => onChange(Math.max(1, page - 1));
  const next = () => onChange(Math.min(totalPages, page + 1));

  const btnCls =
    'w-9 h-9 flex items-center justify-center rounded-[9px] border border-gold/25 bg-gold/5 text-gold hover:bg-gold/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <div className={`flex items-center justify-center gap-3 pt-6 ${className}`}>
      <button type="button" onClick={prev} disabled={page <= 1} aria-label="Previous page" className={btnCls}>
        <ChevronLeft size={16} strokeWidth={2} />
      </button>
      <span className="text-[0.85rem] text-muted">
        Page <span className="text-gold font-semibold">{page}</span> of <span className="text-gold font-semibold">{totalPages}</span>
      </span>
      <button type="button" onClick={next} disabled={page >= totalPages} aria-label="Next page" className={btnCls}>
        <ChevronRight size={16} strokeWidth={2} />
      </button>
    </div>
  );
}