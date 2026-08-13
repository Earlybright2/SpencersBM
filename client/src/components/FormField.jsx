import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FormField({
  label,
  type = 'text',
  id,
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  hint
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="block text-[0.85rem] text-gray-400">
          {label}
        </label>
        {hint && <span className="text-[0.75rem] text-[#707070]">{hint}</span>}
      </div>
      <div className="relative group">
        {Icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707070] group-focus-within:text-gold transition-colors pointer-events-none">
            <Icon size={18} strokeWidth={1.8} />
          </span>
        )}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full py-3.5 bg-[#0d0d0d] border border-gold/20 rounded-[12px] text-white text-[0.95rem] outline-none transition-all placeholder:text-[#555] focus:border-gold focus:ring-2 focus:ring-gold/20 ${
            Icon ? 'pl-11' : 'pl-4'
          } ${isPassword ? 'pr-12' : 'pr-4'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707070] hover:text-gold transition-colors"
          >
            {show ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
          </button>
        )}
      </div>
    </div>
  );
}