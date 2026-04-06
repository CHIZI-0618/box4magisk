import { useState } from 'react';
import { Check } from 'lucide-react';

type SelectOption = string | { l: string; v: string };

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function Select({ value, options, onChange, className = 'w-36', disabled = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = options.find(option => (typeof option === 'object' ? option.v : option) === value) || value;
  const displayLabel = typeof currentOption === 'object' ? currentOption.l : currentOption;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={`${className} flex items-center justify-between bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-full pl-4 pr-3 py-1.5 outline-none font-semibold transition-all shadow-sm active:scale-95 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
      >
        <span className="truncate">{displayLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-max min-w-[140px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {options.map((option, index) => {
              const label = typeof option === 'object' ? option.l : option;
              const optionValue = typeof option === 'object' ? option.v : option;
              const isSelected = optionValue === value;
              return (
                <button
                  key={optionValue}
                  disabled={disabled}
                  onClick={() => {
                    onChange(optionValue);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-between space-x-4 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${index !== options.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/50' : ''}`}
                >
                  <span className="truncate">{label}</span>
                  {isSelected && <Check size={16} strokeWidth={3} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
