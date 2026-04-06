import type React from 'react';
import { Switch } from './Switch';

interface SwitchRowProps {
  label: string;
  sub?: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  border?: boolean;
}

export function SwitchRow({ label, sub, icon, checked, onChange, border = true }: SwitchRowProps) {
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
