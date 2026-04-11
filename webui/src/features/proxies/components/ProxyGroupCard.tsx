import React, { useMemo } from 'react';
import { ArrowUpDown, Check, ChevronDown, Clock, SortAsc, Zap } from 'lucide-react';
import type { Proxy } from '@/lib/clash';
import type { NodeSortType, ProxyMap } from '../types';
import { cn } from '@/lib/cn';
import { t } from '@/i18n';
import { getLatencyStyle, LatencyBar, NodeRoutingChain } from '../utils';

interface ProxyGroupCardProps {
  groupName: string;
  group: Proxy;
  proxies: ProxyMap;
  latencies: Record<string, number>;
  testingOwners: Record<string, number>;
  testingNodes: Record<string, number>;
  isExpanded: boolean;
  sortType: NodeSortType;
  onToggleExpand: (name: string) => void;
  onToggleSort: (e: React.MouseEvent, name: string) => void;
  onTestGroup: (e: React.MouseEvent, name: string, nodes: string[]) => void;
  onSelectNode: (groupName: string, nodeName: string) => void;
}

export const ProxyGroupCard = React.memo((props: ProxyGroupCardProps) => {
  const { groupName, group, proxies, latencies, testingOwners, testingNodes, isExpanded, sortType, onToggleExpand, onToggleSort, onTestGroup, onSelectNode } = props;
  const isSelector = group.type === 'Selector';
  const isTesting = Boolean(testingOwners[`group:${groupName}`]);
  const nowMs = latencies[group.now || ''] || 0;
  const nowStyle = getLatencyStyle(nowMs);

  const { sortedNodes, missingNodeDetails } = useMemo(() => {
    const normalizedNodes = (group.all || [])
      .map((rawName, index) => {
        const name = typeof rawName === 'string' ? rawName.trim() : '';
        return {
          key: `${groupName}:${index}:${name || '__empty__'}`,
          name,
          index,
          detail: name ? proxies?.[name] : undefined,
          latency: name ? (latencies[name] || 0) : 0,
        };
      })
      .filter(node => node.name.length > 0);

    const missing = normalizedNodes.filter(node => !node.detail).length;
    const sorted = [...normalizedNodes].sort((a, b) => {
      if (sortType === 'latency') {
        const dA = a.latency || 999999;
        const dB = b.latency || 999999;
        if (dA !== dB) return dA - dB;
      }
      if (sortType === 'name') {
        const byName = a.name.localeCompare(b.name);
        if (byName !== 0) return byName;
      }
      return a.index - b.index;
    });

    return { sortedNodes: sorted, missingNodeDetails: missing };
  }, [group.all, groupName, proxies, latencies, sortType]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors overflow-hidden">
      <div className="flex items-center justify-between cursor-pointer group-card" onClick={() => onToggleExpand(groupName)}>
        <div className="flex items-center space-x-2">
          <h3 className="font-bold text-[17px] text-slate-900 dark:text-slate-100">{groupName}</h3>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">{group.type}</span>
        </div>
        <div className="flex items-center space-x-1 text-slate-400">
          <button
            onClick={e => onToggleSort(e, groupName)}
            className={cn('p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center space-x-1', sortType !== 'default' && 'text-indigo-500')}
            title={`${t('proxies.sort.current')}: ${sortType}`}
          >
            {sortType === 'name' ? <SortAsc size={18} /> : (sortType === 'latency' ? <Clock size={18} /> : <ArrowUpDown size={18} />)}
          </button>
          <button
            onClick={e => onTestGroup(e, groupName, group.all || [])}
            disabled={isTesting}
            className={cn('p-1.5 rounded-lg transition-colors', isTesting ? 'animate-pulse text-indigo-500' : 'hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/80')}
          >
            <Zap size={18} />
          </button>
          <ChevronDown size={20} className={cn('ml-1 transition-transform duration-300', isExpanded && 'rotate-180')} />
        </div>
      </div>

      {!isExpanded && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between text-[13px]">
            <div className="flex items-center text-slate-600 dark:text-slate-300 pr-4 overflow-hidden">
              <span className="text-slate-400 dark:text-slate-500 mr-2 shrink-0">◉</span>
              <span className="truncate font-medium flex items-center space-x-1">
                <NodeRoutingChain now={group.now} proxies={proxies} />
              </span>
            </div>
            <span className={cn('font-mono font-bold shrink-0', nowStyle.text)}>{nowMs ? `${nowMs} ms` : '-'}</span>
          </div>
          <LatencyBar nodes={sortedNodes} />
        </div>
      )}

      {isExpanded && (
        <div className="mt-5 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {missingNodeDetails > 0 && (
            <div className="col-span-2 px-3 py-2 rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-[11px] text-amber-700 dark:text-amber-300">
              {t('proxies.group.missing_details', { count: missingNodeDetails })}
            </div>
          )}
          {sortedNodes.length === 0 && (
            <div className="col-span-2 px-3 py-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-[12px] text-slate-400 dark:text-slate-500">
              {t('proxies.group.empty')}
            </div>
          )}
          {sortedNodes.map(node => {
            const isSelected = group.now === node.name;
            const ms = node.latency;
            const style = getLatencyStyle(ms);
            const nodeType = node.detail?.type || 'Unknown';
            const isMissingDetail = !node.detail;

            return (
              <button
                key={node.key}
                disabled={!isSelector}
                onClick={() => onSelectNode(groupName, node.name)}
                className={cn(
                  'relative flex flex-col px-3 py-2 rounded-2xl text-left transition-all border outline-none',
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-500/60 dark:border-indigo-500/50 shadow-sm opacity-100 ring-1 ring-indigo-500/20'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 hover:border-indigo-200 dark:hover:border-indigo-800/50 opacity-90',
                  !isSelector && 'cursor-default opacity-80',
                  isSelector && 'active:scale-[0.97]',
                )}
              >
                <div className="flex items-center space-x-1.5 mb-1.5 w-full">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.bg)} />
                  <div className={cn('text-[12px] font-semibold truncate flex-1 leading-tight', isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300')}>
                    {node.name}
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-500 shrink-0" strokeWidth={3} />}
                </div>
                <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 border-dashed transition-colors">
                  <span className={cn('text-[10px] font-mono font-medium tracking-wide uppercase truncate pr-1', isMissingDetail ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500')}>
                    {nodeType}
                  </span>
                  <div
                    className={cn('text-[10px] font-mono font-bold bg-slate-100/80 dark:bg-slate-800 px-1.5 py-0.5 rounded transition-all cursor-pointer shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95', style.text)}
                    onClick={e => onTestGroup(e, groupName, [node.name])}
                    title={t('proxies.test_latency')}
                  >
                    {ms ? `${ms} ms` : (testingNodes[node.name] ? '...' : '-')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

ProxyGroupCard.displayName = 'ProxyGroupCard';
