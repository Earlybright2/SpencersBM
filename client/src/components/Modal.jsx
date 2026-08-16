import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-[500px]'
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-2000 bg-overlay backdrop-blur-[5px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-gradient-to-br from-surface1 to-surface2 border border-gold/20 rounded-[15px] p-6 md:p-8 w-full ${maxWidth} relative animate-fade-in-up max-h-[88vh] flex flex-col`}
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="font-syne text-xl md:text-[1.8rem]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gold/10 border border-gold/25 text-gold hover:text-night hover:bg-gold hover:rotate-90 transition-all"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="overflow-y-auto pr-1 -mr-1 overscroll-contain">{children}</div>
      </div>
    </div>
  );
}