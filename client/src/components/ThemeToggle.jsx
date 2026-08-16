import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-[54px] h-[29px] rounded-full border border-gold/30 bg-surface2 transition-colors shrink-0"
    >
      <span
        className={`absolute top-[2px] w-[23px] h-[23px] rounded-full flex items-center justify-center transition-all duration-300 ${
          dark
            ? 'left-[2px] bg-gold text-night'
            : 'left-[27px] bg-gradient-to-br from-gold to-gold-dark text-night'
        }`}
      >
        {dark ? <Moon size={14} strokeWidth={2.2} /> : <Sun size={14} strokeWidth={2.2} />}
      </span>
    </button>
  );
}
