import { ensureFieldVisible } from '@/lib/focus';

interface InputRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function InputRow({ label, value, onChange }: InputRowProps) {
  return (
    <div className="flex items-center justify-between p-1">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">{label}</span>
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={event => ensureFieldVisible(event.currentTarget)}
        className="w-36 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-mono rounded-full px-4 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/30 text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
      />
    </div>
  );
}
