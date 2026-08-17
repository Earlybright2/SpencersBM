import { Minus, Plus } from 'lucide-react';

const MAX_QTY = 10;

export default function QuantityStepper({ value, onChange, disabled }) {
  const down = () => onChange(Math.max(1, (Number(value) || 1) - 1));
  const up = () => onChange(Math.min(MAX_QTY, (Number(value) || 1) + 1));

  return (
    <div className={`flex items-center gap-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        type="button"
        onClick={down}
        disabled={disabled || (Number(value) || 1) <= 1}
        aria-label="Reduce quantity"
        className="w-9 h-9 flex items-center justify-center rounded-[9px] border border-gold/25 bg-gold/5 text-gold hover:bg-gold/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={15} strokeWidth={2.2} />
      </button>
      <span className="min-w-[2.4rem] text-center text-[0.95rem] font-semibold text-body">{Number(value) || 1}</span>
      <button
        type="button"
        onClick={up}
        disabled={disabled || (Number(value) || 1) >= MAX_QTY}
        aria-label="Increase quantity"
        className="w-9 h-9 flex items-center justify-center rounded-[9px] border border-gold/25 bg-gold/5 text-gold hover:bg-gold/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}