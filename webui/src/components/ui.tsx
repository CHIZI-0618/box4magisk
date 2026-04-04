import React, { useState } from 'react';
import { Check } from 'lucide-react';

export function NavItem({ icon, label, active, onClick }: { icon: React.ReactElement<any>, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-20 h-12 transition-transform active:scale-95 relative">
      <div className={`transition-colors duration-300 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
        {React.cloneElement(icon, { strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className={`text-[11px] mt-1 font-semibold transition-colors duration-300 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </span>
      {active && <div className="absolute -bottom-2 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full transition-colors" />}
    </button>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-[13px] font-bold text-slate-500 dark:text-slate-400 ml-2 mt-6 mb-2 uppercase tracking-wider transition-colors">{title}</h3>;
}

export function SwitchRow({ label, sub, icon, checked, onChange, border = true }: any) {
  return (
    <div className={`flex items-center justify-between p-3 transition-colors ${border ? 'border-b border-slate-100 dark:border-slate-800/50' : ''}`}>
      <div className="flex items-center space-x-3">
        {icon && <div className="text-slate-400 dark:text-slate-500 transition-colors">{icon}</div>}
        <div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">{label}</div>
          {sub && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight transition-colors">{sub}</div>}
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

export function Switch({ checked, onChange }: any) {
  return (
    <button
      type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-200 shadow-sm ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export function Select({ value, options, onChange, className = "w-36" }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = options.find((o: any) => (typeof o === 'object' ? o.v : o) === value) || value;
  const displayLabel = typeof currentOption === 'object' ? currentOption.l : currentOption;

  return (
    <div className="relative">
      <button
        type="button" onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-full pl-4 pr-3 py-1.5 outline-none font-semibold transition-all shadow-sm active:scale-95 focus:ring-2 focus:ring-indigo-500/30`}
      >
        <span className="truncate">{displayLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}> <path d="m6 9 6 6 6-6" /> </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-max min-w-[140px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {options.map((o: any, idx: number) => {
              const l = typeof o === 'object' ? o.l : o;
              const v = typeof o === 'object' ? o.v : o;
              const isSelected = v === value;
              return (
                <button
                  key={v}
                  onClick={() => { onChange(v); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-between space-x-4 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${idx !== options.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/50' : ''}`}
                >
                  <span className="truncate">{l}</span>
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

export function SelectRow({ label, value, options, onChange, border = false }: any) {
  return (
    <div className={`flex items-center justify-between p-3 transition-colors ${border ? 'border-b border-slate-100 dark:border-slate-800/50' : ''}`}>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">{label}</span>
      <Select value={value} options={options} onChange={onChange} />
    </div>
  );
}

export function InputRow({ label, value, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-1">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">{label}</span>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-36 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-mono rounded-full px-4 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/30 text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
      />
    </div>
  );
}
