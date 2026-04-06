import React from 'react';
import type { ProxyMap } from './types';
import { cn } from '@/lib/cn';

export const PROXIES_PREFS_STORAGE_KEY = 'box4:webui:proxies:prefs';

export const getLatencyStyle = (ms: number) => {
  if (!ms || ms === 0) return { text: 'text-slate-400 dark:text-slate-500', bg: 'bg-slate-300 dark:bg-slate-700', border: 'border-slate-300 dark:border-slate-700' };
  if (ms < 200) return { text: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
  if (ms < 800) return { text: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500/30' };
  if (ms < 1500) return { text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500/30' };
  return { text: 'text-rose-500', bg: 'bg-rose-500', border: 'border-rose-500/30' };
};

export const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatRelativeTime = (time: number | string) => {
  if (!time || time.toString().startsWith('0001-01-01')) return '从未更新';

  let dateText = time.toString();
  if (typeof time === 'string' && time.includes('.')) {
    const parts = time.split('.');
    if (parts[1] && parts[1].length > 3) {
      const match = parts[1].match(/^(\d{3})\d+(.*)$/);
      if (match) {
        dateText = `${parts[0]}.${match[1]}${match[2]}`;
      }
    }
  }

  const date = typeof time === 'number' ? new Date(time * 1000) : new Date(dateText);
  if (isNaN(date.getTime())) return '时间错误';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < -60) return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  if (diffInSeconds < 60) return '刚刚';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} 天前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

export const formatDate = (timestamp: number) => {
  if (!timestamp) return '长期有效';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const NodeRoutingChain = React.memo(({ now, proxies }: { now?: string; proxies: ProxyMap }) => {
  if (!now) return <span>-</span>;
  const chain = [now];
  let curr = proxies[now];
  let depth = 0;
  while (curr && curr.now && depth < 5) {
    chain.push(curr.now);
    curr = proxies[curr.now];
    depth++;
  }

  return (
    <>
      {chain.map((name, index) => (
        <React.Fragment key={`${name}:${index}`}>
          {index > 0 && <span className="text-slate-300 dark:text-slate-600 px-0.5 text-[10px]">➔</span>}
          <span className={cn('truncate', index === chain.length - 1 && 'font-bold text-slate-800 dark:text-slate-200')}>{name}</span>
        </React.Fragment>
      ))}
    </>
  );
});

NodeRoutingChain.displayName = 'NodeRoutingChain';

export const LatencyBar = React.memo(({ nodes }: { nodes: Array<{ latency: number }> }) => {
  const total = nodes.length;
  if (total === 0) return null;

  const counts = { fast: 0, normal: 0, slow: 0, fail: 0 };
  nodes.forEach(node => {
    const ms = node.latency;
    if (!ms || ms === 0) counts.fail++;
    else if (ms < 200) counts.fast++;
    else if (ms < 800) counts.normal++;
    else counts.slow++;
  });

  return (
    <div className="mt-3 w-full h-1 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden flex">
      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(counts.fast / total) * 100}%` }} />
      <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(counts.normal / total) * 100}%` }} />
      <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${(counts.slow / total) * 100}%` }} />
      <div className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-500" style={{ width: `${(counts.fail / total) * 100}%` }} />
    </div>
  );
});

LatencyBar.displayName = 'LatencyBar';
