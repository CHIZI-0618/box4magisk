import React from 'react';
import { Activity, ChevronDown, Clock, Database, RefreshCw, Server, Zap } from 'lucide-react';
import type { ProxyProvider } from '@/lib/clash';
import { cn } from '@/lib/cn';
import { t } from '@/i18n';
import { formatBytes, formatDate, formatRelativeTime, getLatencyStyle } from '../utils';

interface ProxyProviderCardProps {
  name: string;
  provider: ProxyProvider;
  latencies: Record<string, number>;
  testingOwners: Record<string, number>;
  testingNodes: Record<string, number>;
  isExpanded: boolean;
  isUpdating: boolean;
  onToggleExpand: (name: string) => void;
  onUpdate: (e: React.MouseEvent, name: string) => void;
  onTest: (e: React.MouseEvent, name: string) => void;
  onTestNode: (e: React.MouseEvent, groupName: string, nodes: string[]) => void;
}

export const ProxyProviderCard = React.memo((props: ProxyProviderCardProps) => {
  const { name, provider, latencies, testingOwners, testingNodes, isExpanded, isUpdating, onToggleExpand, onUpdate, onTest, onTestNode } = props;
  const isTesting = Boolean(testingOwners[`provider:${name}`]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between cursor-pointer group-card" onClick={() => onToggleExpand(name)}>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-[17px] text-slate-900 dark:text-slate-100">{name}</h3>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {provider.vehicleType}
            </span>
          </div>
          <div className="text-[12px] text-slate-400 dark:text-slate-500 mt-2.5 flex items-center space-x-4">
            <span className="flex items-center"><Activity size={12} className="mr-1" /> {formatRelativeTime(provider.updatedAt)}</span>
            <span className="font-semibold flex items-center"><Server size={12} className="mr-1" /> {provider.proxies?.length || 0} {t('proxies.nodes')}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          <button
            onClick={e => onTest(e, name)}
            disabled={isTesting}
            className={cn('p-2 rounded-xl transition-all', isTesting ? 'text-indigo-500 animate-pulse' : 'hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800')}
            title={t('proxies.tooltip.test_provider')}
            aria-label={t('proxies.aria.test_provider')}
          >
            <Zap size={18} />
          </button>
          <button
            onClick={e => onUpdate(e, name)}
            disabled={isUpdating}
            className={cn('p-2 rounded-xl transition-all', isUpdating ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500' : 'hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800')}
            title={t('proxies.tooltip.update_provider')}
            aria-label={t('proxies.aria.update_provider')}
          >
            <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
          </button>
          <ChevronDown size={20} className={cn('ml-1 transition-transform duration-300', isExpanded && 'rotate-180')} />
        </div>
      </div>

      {provider.subscriptionInfo && (() => {
        const sub = provider.subscriptionInfo;
        const used = (sub.Download || 0) + (sub.Upload || 0);
        const total = sub.Total || 0;
        const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;

        return (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 space-y-3">
            <div className="flex items-center justify-between text-[12px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center space-x-1.5">
                <Database size={14} className="text-indigo-500" />
                <span className="font-medium">{formatBytes(used)} / {formatBytes(total)}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-orange-500 font-medium">
                <Clock size={14} />
                <span>{t('proxies.expire')}: {formatDate(sub.Expire)}</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })()}

      {isExpanded && provider.proxies && (
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/50 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
          {provider.proxies.map((node, index) => {
            const ms = latencies[node.name] || 0;
            const style = getLatencyStyle(ms);
            const isNodeTesting = Boolean(testingNodes[node.name]) && ms === 0;
            return (
              <div key={index} className="flex flex-col px-3 py-2 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 transition-all hover:border-indigo-200 dark:hover:border-indigo-800/50 opacity-90">
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.bg)} />
                  <div className="text-[12px] font-semibold truncate text-slate-700 dark:text-slate-300 flex-1 leading-tight">{node.name}</div>
                </div>

                <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 border-dashed">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium tracking-wide uppercase truncate pr-1">
                    {node.type || 'Unknown'}
                  </span>
                  <div
                    className={cn('text-[10px] font-mono font-bold bg-slate-100/80 dark:bg-slate-800 px-1.5 py-0.5 rounded transition-all cursor-pointer shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95', style.text)}
                    onClick={e => onTestNode(e, name, [node.name])}
                    title={t('proxies.test_latency')}
                    aria-label={t('proxies.aria.test_node_latency')}
                  >
                    {ms ? `${ms} ms` : (isNodeTesting ? '...' : '-')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

ProxyProviderCard.displayName = 'ProxyProviderCard';
