import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Zap, ChevronDown, Activity,
  RefreshCw, Server, Database,
  Clock, ServerOff, ArrowUpDown,
  SortAsc, ZapOff
} from 'lucide-react';
import { ClashClient, type Proxy, type ProxyProvider } from '@/lib/clash';
import { notify } from '@/lib/bridge';

// ==========================================
// Types & Constants
// ==========================================
interface TabProxiesProps {
  status: {
    running: boolean;
    clash_api_port: string;
    clash_api_secret: string;
  };
}

type NodeSortType = 'default' | 'latency' | 'name';
type ProxyViewType = 'proxies' | 'providers';

type ProxyPrefs = {
  viewType: ProxyViewType;
  expanded: Record<string, boolean>;
  expandedProviders: Record<string, boolean>;
  groupSorts: Record<string, NodeSortType>;
};

const PROXIES_PREFS_STORAGE_KEY = 'box4:webui:proxies:prefs';

const defaultProxyPrefs: ProxyPrefs = {
  viewType: 'proxies',
  expanded: { GLOBAL: false },
  expandedProviders: {},
  groupSorts: {},
};

// ==========================================
// Utilities & Hooks
// ==========================================

// 轻量级 className 合并工具
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// 检查组件是否挂载的 Hook，防止卸载后更新状态
function useIsMounted() {
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  return isMounted;
}

function readProxyPrefs(): ProxyPrefs {
  if (typeof window === 'undefined') return defaultProxyPrefs;
  try {
    const raw = window.localStorage.getItem(PROXIES_PREFS_STORAGE_KEY);
    if (!raw) return defaultProxyPrefs;
    const parsed = JSON.parse(raw) as Partial<ProxyPrefs>;
    return {
      viewType: parsed.viewType === 'providers' ? 'providers' : 'proxies',
      expanded: parsed.expanded && typeof parsed.expanded === 'object' ? parsed.expanded : defaultProxyPrefs.expanded,
      expandedProviders: parsed.expandedProviders && typeof parsed.expandedProviders === 'object' ? parsed.expandedProviders : defaultProxyPrefs.expandedProviders,
      groupSorts: parsed.groupSorts && typeof parsed.groupSorts === 'object' ? parsed.groupSorts : defaultProxyPrefs.groupSorts,
    };
  } catch {
    return defaultProxyPrefs;
  }
}

const getLatencyStyle = (ms: number) => {
  if (!ms || ms === 0) return { text: 'text-slate-400 dark:text-slate-500', bg: 'bg-slate-300 dark:bg-slate-700', border: 'border-slate-300 dark:border-slate-700' };
  if (ms < 200) return { text: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
  if (ms < 800) return { text: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500/30' };
  if (ms < 1500) return { text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500/30' };
  return { text: 'text-rose-500', bg: 'bg-rose-500', border: 'border-rose-500/30' };
};

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatRelativeTime = (time: number | string) => {
  if (!time || time.toString().startsWith('0001-01-01')) return '从未更新';
  
  let dateText = time.toString();
  if (typeof time === 'string' && time.includes('.')) {
    const parts = time.split('.');
    if (parts[1] && parts[1].length > 3) {
      const match = parts[1].match(/^(\d{3})\d+(.*)$/);
      if (match) {
        dateText = parts[0] + '.' + match[1] + match[2];
      }
    }
  }

  const date = typeof time === 'number' ? new Date(time * 1000) : new Date(dateText);
  if (isNaN(date.getTime())) return '时间错误';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < -60) {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }

  if (diffInSeconds < 60) return '刚刚';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} 天前`;
  
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

const formatDate = (timestamp: number) => {
  if (!timestamp) return '长期有效';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// ==========================================
// Sub Components
// ==========================================

// 节点路由链展示组件
const NodeRoutingChain = React.memo(({ now, proxies }: { now?: string, proxies: Record<string, Proxy> }) => {
  if (!now) return <span>-</span>;
  const chain = [now];
  let curr = proxies[now];
  let depth = 0;
  // depth < 5 防止节点成环导致死循环
  while (curr && curr.now && depth < 5) {
    chain.push(curr.now);
    curr = proxies[curr.now];
    depth++;
  }
  return (
    <>
      {chain.map((c, i) => (
        <React.Fragment key={`${c}:${i}`}>
          {i > 0 && <span className="text-slate-300 dark:text-slate-600 px-0.5 text-[10px]">➔</span>}
          <span className={cn("truncate", i === chain.length - 1 && "font-bold text-slate-800 dark:text-slate-200")}>{c}</span>
        </React.Fragment>
      ))}
    </>
  );
});
NodeRoutingChain.displayName = 'NodeRoutingChain';

// 延迟状态进度条
const LatencyBar = React.memo(({ nodes }: { nodes: { latency: number }[] }) => {
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

// 代理组卡片组件
interface ProxyGroupCardProps {
  groupName: string;
  group: Proxy;
  proxies: Record<string, Proxy>;
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

const ProxyGroupCard = React.memo((props: ProxyGroupCardProps) => {
  const { groupName, group, proxies, latencies, testingOwners, testingNodes, isExpanded, sortType, onToggleExpand, onToggleSort, onTestGroup, onSelectNode } = props;
  
  const isSelector = group.type === 'Selector';
  const isTesting = Boolean(testingOwners[`group:${groupName}`]);
  const nowMs = latencies[group.now || ""] || 0;
  const nowStyle = getLatencyStyle(nowMs);

  // 缓存提取与排序逻辑
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
      {/* 卡片头部 */}
      <div className="flex items-center justify-between cursor-pointer group-card" onClick={() => onToggleExpand(groupName)}>
        <div className="flex items-center space-x-2">
          <h3 className="font-bold text-[17px] text-slate-900 dark:text-slate-100">{groupName}</h3>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">
            {group.type}
          </span>
        </div>
        <div className="flex items-center space-x-1 text-slate-400">
          <button 
            onClick={(e) => onToggleSort(e, groupName)}
            className={cn("p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center space-x-1", sortType !== 'default' && "text-indigo-500")}
            title={`当前排序: ${sortType}`}
          >
            {sortType === 'name' ? <SortAsc size={18} /> : (sortType === 'latency' ? <Clock size={18} /> : <ArrowUpDown size={18} />)}
          </button>
          <button 
            onClick={(e) => onTestGroup(e, groupName, group.all || [])}
            disabled={isTesting}
            className={cn("p-1.5 rounded-lg transition-colors", isTesting ? "animate-pulse text-indigo-500" : "hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/80")}
          >
            <Zap size={18} />
          </button>
          <ChevronDown size={20} className={cn("ml-1 transition-transform duration-300", isExpanded && "rotate-180")} />
        </div>
      </div>

      {/* 收起时的预览视图 */}
      {!isExpanded && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between text-[13px]">
            <div className="flex items-center text-slate-600 dark:text-slate-300 pr-4 overflow-hidden">
              <span className="text-slate-400 dark:text-slate-500 mr-2 shrink-0">◉</span>
              <span className="truncate font-medium flex items-center space-x-1">
                <NodeRoutingChain now={group.now} proxies={proxies} />
              </span>
            </div>
            <span className={cn("font-mono font-bold shrink-0", nowStyle.text)}>
              {nowMs ? `${nowMs} ms` : '-'}
            </span>
          </div>
          <LatencyBar nodes={sortedNodes} />
        </div>
      )}

      {/* 展开时的节点列表 */}
      {isExpanded && (
        <div className="mt-5 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {missingNodeDetails > 0 && (
            <div className="col-span-2 px-3 py-2 rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-[11px] text-amber-700 dark:text-amber-300">
              当前组有 {missingNodeDetails} 个节点存在，但未匹配到详情。
            </div>
          )}
          {sortedNodes.length === 0 && (
            <div className="col-span-2 px-3 py-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-[12px] text-slate-400 dark:text-slate-500">
              当前代理组没有可显示的节点
            </div>
          )}
          {sortedNodes.map((node) => {
            const nodeName = node.name;
            const isSelected = group.now === nodeName;
            const ms = node.latency;
            const style = getLatencyStyle(ms);
            const nodeType = node.detail?.type || 'Unknown';
            const isMissingDetail = !node.detail;

            return (
              <button
                key={node.key}
                disabled={!isSelector}
                onClick={() => onSelectNode(groupName, nodeName)}
                className={cn(
                  "relative flex flex-col px-3 py-2 rounded-2xl text-left transition-all border outline-none",
                  isSelected 
                    ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-500/60 dark:border-indigo-500/50 shadow-sm opacity-100 ring-1 ring-indigo-500/20" 
                    : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 hover:border-indigo-200 dark:hover:border-indigo-800/50 opacity-90",
                  !isSelector && "cursor-default opacity-80",
                  isSelector && "active:scale-[0.97]"
                )}
              >
                <div className="flex items-center space-x-1.5 mb-1.5 w-full">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.bg)} />
                  <div className={cn("text-[12px] font-semibold truncate flex-1 leading-tight", isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300")}>
                    {nodeName}
                  </div>
                </div>

                <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 border-dashed transition-colors">
                  <span className={cn("text-[10px] font-mono font-medium tracking-wide uppercase truncate pr-1", isMissingDetail ? "text-amber-500 dark:text-amber-400" : "text-slate-400 dark:text-slate-500")}>
                    {nodeType}
                  </span>
                  <div 
                    className={cn("text-[10px] font-mono font-bold bg-slate-100/80 dark:bg-slate-800 px-1.5 py-0.5 rounded transition-all cursor-pointer shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95", style.text)}
                    onClick={(e) => onTestGroup(e, groupName, [nodeName])}
                    title="点击测速"
                  >
                    {ms ? `${ms} ms` : (testingNodes[nodeName] ? '...' : '-')}
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


// 代理集合卡片组件
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

const ProxyProviderCard = React.memo((props: ProxyProviderCardProps) => {
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
            <span className="font-semibold flex items-center"><Server size={12} className="mr-1" /> {provider.proxies?.length || 0} 节点</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 text-slate-400">
          <button 
            onClick={(e) => onTest(e, name)}
            disabled={isTesting}
            className={cn("p-2 rounded-xl transition-all", isTesting ? "text-indigo-500 animate-pulse" : "hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800")}
          >
            <Zap size={18} />
          </button>
          <button 
            onClick={(e) => onUpdate(e, name)}
            disabled={isUpdating}
            className={cn("p-2 rounded-xl transition-all", isUpdating ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500" : "hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800")}
          >
            <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
          </button>
          <ChevronDown size={20} className={cn("ml-1 transition-transform duration-300", isExpanded && "rotate-180")} />
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
                <span>到期: {formatDate(sub.Expire)}</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{width: `${percent}%`}}></div>
            </div>
          </div>
        );
      })()}

      {isExpanded && provider.proxies && (
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/50 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
          {provider.proxies.map((node, idx) => {
            const ms = latencies[node.name] || 0;
            const style = getLatencyStyle(ms);
            const isNodeTesting = Boolean(testingNodes[node.name]) && ms === 0;
            return (
              <div key={idx} className="flex flex-col px-3 py-2 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 transition-all hover:border-indigo-200 dark:hover:border-indigo-800/50 opacity-90">
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.bg)} />
                  <div className="text-[12px] font-semibold truncate text-slate-700 dark:text-slate-300 flex-1 leading-tight">{node.name}</div>
                </div>
                
                <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 border-dashed">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium tracking-wide uppercase truncate pr-1">
                    {node.type || 'Unknown'}
                  </span>
                  <div 
                    className={cn("text-[10px] font-mono font-bold bg-slate-100/80 dark:bg-slate-800 px-1.5 py-0.5 rounded transition-all cursor-pointer shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95", style.text)}
                    onClick={(e) => onTestNode(e, name, [node.name])}
                    title="点击测速"
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


// ==========================================
// Main Component
// ==========================================

export function TabProxies({ status }: TabProxiesProps) {
  const isMounted = useIsMounted();
  const initialPrefs = useMemo(() => readProxyPrefs(), []);
  
  const [proxies, setProxies] = useState<Record<string, Proxy> | null>(null);
  const [providers, setProviders] = useState<Record<string, ProxyProvider> | null>(null);
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // 顶部核心状态
  const [currentMode, setCurrentMode] = useState<string>('rule');
  const [viewType, setViewType] = useState<ProxyViewType>(initialPrefs.viewType);

  // 排序与展开状态
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialPrefs.expanded);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>(initialPrefs.expandedProviders);
  const [groupSorts, setGroupSorts] = useState<Record<string, NodeSortType>>(initialPrefs.groupSorts);
  
  const [testingOwners, setTestingOwners] = useState<Record<string, number>>({});
  const [testingNodes, setTestingNodes] = useState<Record<string, number>>({});
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);

  const client = useMemo(() => {
    return new ClashClient(status.clash_api_port, status.clash_api_secret);
  }, [status.clash_api_port, status.clash_api_secret]);

  // 状态变更时延迟写入 LocalStorage (防抖)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PROXIES_PREFS_STORAGE_KEY, JSON.stringify({
          viewType, expanded, expandedProviders, groupSorts,
        }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [viewType, expanded, expandedProviders, groupSorts]);

  const markTestingStart = useCallback((ownerKey: string, nodes: string[] = []) => {
    setTestingOwners(prev => ({ ...prev, [ownerKey]: (prev[ownerKey] || 0) + 1 }));
    if (nodes.length === 0) return;
    setTestingNodes(prev => {
      const next = { ...prev };
      nodes.forEach(node => {
        if (!node) return;
        next[node] = (next[node] || 0) + 1;
      });
      return next;
    });
  }, []);

  const markTestingEnd = useCallback((ownerKey: string, nodes: string[] = []) => {
    setTestingOwners(prev => {
      const current = prev[ownerKey] || 0;
      if (current <= 1) {
        const { [ownerKey]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ownerKey]: current - 1 };
    });

    if (nodes.length === 0) return;
    setTestingNodes(prev => {
      const next = { ...prev };
      nodes.forEach(node => {
        if (!node) return;
        const current = next[node] || 0;
        if (current <= 1) delete next[node];
        else next[node] = current - 1;
      });
      return next;
    });
  }, []);

  const fetchInitialData = useCallback(async (signal?: AbortSignal) => {
    if (!status.running) return;
    setLoading(true);
    setApiError(false);
    try {
      const [pData, pvData, config] = await Promise.all([
        client.getProxies({ signal }),
        client.getProviders({ signal }),
        client.getConfig({ signal })
      ]);

      if (!pData || signal?.aborted || !isMounted.current) return;
      
      setProxies(pData);
      setProviders(pvData);
      setCurrentMode(config.mode);

      const initialLatencies: Record<string, number> = {};
      Object.keys(pData).forEach(name => {
        const history = pData[name].history;
        if (history && history.length > 0) {
          initialLatencies[name] = history[history.length - 1].delay;
        }
      });
      setLatencies(initialLatencies);
    } catch (e: unknown) {
      if (signal?.aborted || !isMounted.current) return;
      console.error("Fetch Data Error:", e);
      setApiError(true);
    } finally {
      if (!signal?.aborted && isMounted.current) {
        setLoading(false);
      }
    }
  }, [status.running, client, isMounted]);

  useEffect(() => {
    const controller = new AbortController();
    fetchInitialData(controller.signal);
    return () => controller.abort();
  }, [fetchInitialData]);

  // ==========================================
  // Event Handlers
  // ==========================================

  const toggleExpand = useCallback((groupName: string) => {
    setExpanded(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  }, []);

  const toggleProviderExpand = useCallback((name: string) => {
    setExpandedProviders(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const toggleGroupSort = useCallback((e: React.MouseEvent, groupName: string) => {
    e.stopPropagation();
    const orders: NodeSortType[] = ['default', 'latency', 'name'];
    setGroupSorts(prev => {
      const current = prev[groupName] || 'default';
      const next = orders[(orders.indexOf(current) + 1) % orders.length];
      return { ...prev, [groupName]: next };
    });
  }, []);

  const handleSelectNode = useCallback(async (groupName: string, nodeName: string) => {
    if (proxies?.[groupName]?.now === nodeName) return;
    try {
      await client.selectProxy(groupName, nodeName);
      if (!isMounted.current) return;
      setProxies((prev) => prev ? ({
        ...prev,
        [groupName]: { ...prev[groupName], now: nodeName }
      }) : null);
    } catch (e: unknown) {
      if (isMounted.current) notify("切换失败: " + (e instanceof Error ? e.message : String(e)));
    }
  }, [client, isMounted, proxies]);

  const handleChangeMode = async (mode: 'rule' | 'global' | 'direct') => {
    if (currentMode === mode) return;
    const oldMode = currentMode;
    setCurrentMode(mode);
    try {
      await client.updateConfig({ mode });
    } catch (e: unknown) {
      if (isMounted.current) {
        setCurrentMode(oldMode);
        notify("模式切换失败: " + (e instanceof Error ? e.message : String(e)));
      }
    }
  };

  const handleUpdateProvider = useCallback(async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (updatingProvider) return;
    setUpdatingProvider(name);
    try {
      await client.updateProvider(name);
      const pvData = await client.getProviders();
      if (!isMounted.current) return;
      setProviders(pvData);
      notify(`已更新: ${name}`);
    } catch (e: unknown) {
      if (isMounted.current) notify("更新失败: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      if (isMounted.current) setUpdatingProvider(null);
    }
  }, [client, isMounted, updatingProvider]);

  const handleTestProvider = useCallback(async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const ownerKey = `provider:${name}`;
    if (testingOwners[ownerKey]) return;
    const providerNodes = providers?.[name]?.proxies?.map(proxy => proxy.name) || [];
    markTestingStart(ownerKey, providerNodes);
    try {
      await client.healthCheckProvider(name);
      const pvData = await client.getProviders();
      const pData = await client.getProxies();
      
      if (!isMounted.current) return;
      setProviders(pvData);
      setProxies(pData);

      setLatencies(prev => {
        const next = { ...prev };
        Object.keys(pData).forEach(n => {
          const history = pData[n].history;
          if (history && history.length > 0) {
            next[n] = history[history.length - 1].delay;
          }
        });
        return next;
      });
    } catch (e: unknown) {
      if (isMounted.current) notify("测速失败: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      if (isMounted.current) markTestingEnd(ownerKey, providerNodes);
    }
  }, [client, isMounted, markTestingEnd, markTestingStart, providers, testingOwners]);

  const handleTestGroup = useCallback(async (e: React.MouseEvent, groupName: string, nodes: string[]) => {
    e.stopPropagation();
    const ownerKey = `group:${groupName}`;
    if (testingOwners[ownerKey]) return;
    markTestingStart(ownerKey, nodes);
    try {
      // 允许静默失败，保留上次测速结果或置为 0
      const results = await Promise.all(
        nodes.map(node => client.testLatency(node).catch(() => 0))
      );
      if (!isMounted.current) return;
      setLatencies(prev => {
        const next = { ...prev };
        nodes.forEach((node, i) => next[node] = results[i]);
        return next;
      });
    } catch {
      if (isMounted.current) notify("测速出错");
    } finally {
      if (isMounted.current) markTestingEnd(ownerKey, nodes);
    }
  }, [client, isMounted, markTestingEnd, markTestingStart, testingOwners]);

  // ==========================================
  // Rendering
  // ==========================================

  if (!status.running) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 px-8 text-center pb-20 animate-in fade-in">
        <Server size={48} className="opacity-20 mb-4" />
        <p className="text-sm">服务未运行<br />请先启动核心</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center pb-20 animate-in fade-in">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
          <ServerOff size={40} className="text-rose-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">后端 API 连接失败</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          无法连接到核心代理面板接口。<br/>请检查代理核心是否已成功启动。
        </p>
        <button 
          onClick={() => { void fetchInitialData(); }}
          className="flex items-center space-x-2 bg-[#3b82f6] hover:bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-[0_4px_16px_rgba(59,130,246,0.3)] active:scale-95 transition-all"
        >
          <RefreshCw size={18} />
          <span>重新连接</span>
        </button>
      </div>
    );
  }

  if (loading || !proxies) {
    return (
      <div className="h-full flex flex-col items-center justify-center pb-20 animate-pulse text-slate-400">
        <Activity size={28} className="text-indigo-500 mb-4" />
        <span className="text-sm font-medium">获取代理信息中...</span>
      </div>
    );
  }

  const globalOrder = proxies['GLOBAL']?.all || [];
  const groupTypes = ['Selector', 'URLTest', 'Fallback', 'LoadBalance'];
  const proxyGroups = Object.keys(proxies)
    .filter(name => groupTypes.includes(proxies[name].type))
    .sort((a, b) => {
      let idxA = globalOrder.indexOf(a);
      let idxB = globalOrder.indexOf(b);
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });

  const providerList = Object.entries(providers || {})
    .filter(([, p]) => p.vehicleType !== 'Compatible');

  return (
    <div className="px-4 pb-6 pt-2 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 顶部：模式切换器 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex items-center justify-between">
        {[
          { id: 'direct', label: '直连' },
          { id: 'rule', label: '规则' },
          { id: 'global', label: '全局' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => handleChangeMode(m.id as 'rule' | 'global' | 'direct')}
            className={cn(
              "flex-1 py-3 rounded-xl transition-all text-sm",
              currentMode.toLowerCase() === m.id 
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 视图切换 */}
      <div className="flex bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl mb-4">
        <button 
          onClick={() => setViewType('proxies')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center space-x-2",
            viewType === 'proxies' ? "bg-[#3b82f6] text-white shadow-md" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <span>代理组</span>
          <span className={cn("px-1.5 py-0.5 rounded-md text-[10px]", viewType === 'proxies' ? "bg-white/20" : "bg-slate-300/50 dark:bg-slate-700")}>
            {proxyGroups.length}
          </span>
        </button>
        <button 
          onClick={() => setViewType('providers')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center space-x-2",
            viewType === 'providers' ? "bg-[#3b82f6] text-white shadow-md" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <span>代理集合</span>
          <span className={cn("px-1.5 py-0.5 rounded-md text-[10px]", viewType === 'providers' ? "bg-white/20" : "bg-slate-300/50 dark:bg-slate-700")}>
            {providerList.length}
          </span>
        </button>
      </div>

      {/* 渲染视图 */}
      {viewType === 'proxies' && proxyGroups.map((groupName) => (
        <ProxyGroupCard
          key={groupName}
          groupName={groupName}
          group={proxies[groupName]}
          proxies={proxies}
          latencies={latencies}
          testingOwners={testingOwners}
          testingNodes={testingNodes}
          isExpanded={expanded[groupName]}
          sortType={groupSorts[groupName] || 'default'}
          onToggleExpand={toggleExpand}
          onToggleSort={toggleGroupSort}
          onTestGroup={handleTestGroup}
          onSelectNode={handleSelectNode}
        />
      ))}

      {viewType === 'providers' && providerList.map(([name, provider]) => (
        <ProxyProviderCard
          key={name}
          name={name}
          provider={provider}
          latencies={latencies}
          testingOwners={testingOwners}
          testingNodes={testingNodes}
          isExpanded={expandedProviders[name]}
          isUpdating={updatingProvider === name}
          onToggleExpand={toggleProviderExpand}
          onUpdate={handleUpdateProvider}
          onTest={handleTestProvider}
          onTestNode={handleTestGroup} // 使用复用的测速逻辑
        />
      ))}

      {viewType === 'providers' && providerList.length === 0 && (
         <div className="flex flex-col items-center justify-center py-16 text-slate-400">
           <ZapOff size={40} className="opacity-20 mb-3" />
           <p className="text-sm">未发现活跃的外部代理集合</p>
         </div>
      )}
    </div>
  );
}