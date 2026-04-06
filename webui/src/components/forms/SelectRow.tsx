import { Select } from './Select';

type SelectOption = string | { l: string; v: string };

interface SelectRowProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  border?: boolean;
}

export function SelectRow({ label, value, options, onChange, border = false }: SelectRowProps) {
  return (
    <div className={`flex items-center justify-between p-3 transition-colors ${border ? 'border-b border-slate-100 dark:border-slate-800/50' : ''}`}>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">{label}</span>
      <Select value={value} options={options} onChange={onChange} />
    </div>
  );
}
