interface SectionTitleProps {
  title: string;
}

export function SectionTitle({ title }: SectionTitleProps) {
  return <h3 className="text-[13px] font-bold text-slate-500 dark:text-slate-400 ml-2 mt-6 mb-2 uppercase tracking-wider transition-colors">{title}</h3>;
}
