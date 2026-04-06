import React from 'react';

interface NavItemProps {
  icon: React.ReactElement<any>;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ icon, label, active, onClick }: NavItemProps) {
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
