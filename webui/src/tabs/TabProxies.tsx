import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Zap, ChevronDown, Check, Activity,
  RefreshCw,
  Server, Database, Clock, ServerOff,
  ArrowUpDown, SortAsc, ZapOff
} from 'lucide-react';
import { ClashClient, type Proxy, type ProxyProvider } from '@/lib/clash';
import { notify } from '@/lib/bridge';

interface TabProxiesProps {
  status: {
    running: boolean;
    clash_api_port: string;
    clash_api_secret: string;
  };
}

type NodeSortType = 'default' | 'latency' | 'name';

const PROXIES_PREFS_STORAGE_KEY = 'box4:webui:proxies:prefs';

type ProxyViewType = 'proxies' | 'providers';

type ProxyPrefs = {
  viewType: ProxyViewType;
  expanded: Record<string, boolean>;
  expandedProviders: Record<string, boolean>;
  groupSorts: Record<string, NodeSortType>;
};

const defaultProxyPrefs: ProxyPrefs = {
  viewType: 'proxies',
  expanded: { GLOBAL: false },
  expandedProviders: {},
  groupSorts: {},
};

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
  // 修正 9 位纳秒精度 ISO 字符串兼容性问题 (裁剪为 3 位毫秒)
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

  // 如果是未来的时间（如过期时间），显示具体日期
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

export function TabProxies({ status }: TabProxiesProps) {
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
  
  const [testingGroup, setTestingGroup] = useState<string | null>(null);
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  const client = useMemo(() => {
    return new ClashClient(status.clash_api_port, status.clash_api_secret);
  }, [status.clash_api_port, status.clash_api_secret]);

  const fetchInitialData = useCallback(async () => {
    if (!status.running) return;
    setLoading(true);
    setApiError(false);
    try {
      const [pData, pvData, config] = await Promise.all([
        client.getProxies(),
        client.getProviders(),
        client.getConfig()
      ]);

      if (!pData) throw new Error("Failed to fetch proxies data");
      
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
      console.error("Fetch Data Error:", e);
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, [status.running, client]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PROXIES_PREFS_STORAGE_KEY, JSON.stringify({
      viewType,
      expanded,
      expandedProviders,
      groupSorts,
    }));
  }, [viewType, expanded, expandedProviders, groupSorts]);

  const toggleExpand = (groupName: string) => {
    setExpanded(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const toggleProviderExpand = (name: string) => {
    setExpandedProviders(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleGroupSort = (e: React.MouseEvent, groupName: string) => {
    e.stopPropagation();
    const orders: NodeSortType[] = ['default', 'latency', 'name'];
    setGroupSorts(prev => {
      const current = prev[groupName] || 'default';
      const next = orders[(orders.indexOf(current) + 1) % orders.length];
      return { ...prev, [groupName]: next };
    });
  };

  const handleSelectNode = async (groupName: string, nodeName: string) => {
    if (proxies?.[groupName]?.now === nodeName) return;
    try {
      await client.selectProxy(groupName, nodeName);
      setProxies((prev) => prev ? ({
        ...prev,
        [groupName]: { ...prev[groupName], now: nodeName }
      }) : null);
    } catch (e: unknown) {
      notify("切换失败: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleChangeMode = async (mode: 'rule' | 'global' | 'direct') => {
    if (currentMode === mode) return;
    const oldMode = currentMode;
    setCurrentMode(mode);
    try {
      await client.updateConfig({ mode });
    } catch (e: unknown) {
      setCurrentMode(oldMode);
      notify("模式切换失败: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleUpdateProvider = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (updatingProvider) return;
    setUpdatingProvider(name);
    try {
      await client.updateProvider(name);
      const pvData = await client.getProviders();
      setProviders(pvData);
      notify(`已更新: ${name}`);
    } catch (e: unknown) {
      notify("更新失败: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUpdatingProvider(null);
    }
  };

  const handleTestProvider = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (testingGroup === name) return;
    setTestingGroup(name);
    try {
      await client.healthCheckProvider(name);
      const pvData = await client.getProviders();
      setProviders(pvData);
      
      const newLatencies = { ...latencies };
      const pData = await client.getProxies();
      Object.keys(pData).forEach(n => {
        const history = pData[n].history;
        if (history && history.length > 0) {
          newLatencies[n] = history[history.length - 1].delay;
        }
      });
      setProxies(pData);
      setLatencies(newLatencies);
    } catch (e: unknown) {
      notify("测速失败: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTestingGroup(null);
    }
  };

  const handleTestGroup = async (e: React.MouseEvent, groupName: string, nodes: string[]) => {
    e.stopPropagation();
    if (testingGroup === groupName) return;
    setTestingGroup(groupName);
    try {
      const results = await Promise.all(
        nodes.map(node => client.testLatency(node).catch(() => 0))
      );
      setLatencies(prev => {
        const next = { ...prev };
        nodes.forEach((node, i) => next[node] = results[i]);
        return next;
      });
    } catch {
      notify("测速出错");
    } finally {
      setTestingGroup(null);
    }
  };

  const handleTestAll = async () => {
    if (testingAll) return;
    setTestingAll(true);
    try {
      const allNodes = new Set<string>();
      Object.values(proxies || {}).forEach((g) => g.all?.forEach((n: string) => allNodes.add(n)));
      const nodeList = Array.from(allNodes);
      const results = await Promise.all(
        nodeList.map(node => client.testLatency(node).catch(() => 0))
      );
      setLatencies(prev => {
        const next = { ...prev };
        nodeList.forEach((node, i) => next[node] = results[i]);
        return next;
      });
    } catch {
      notify("全局测速出错");
    } finally {
      setTestingAll(false);
    }
  };

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
          onClick={fetchInitialData}
          className="flex items-center space-x-2 bg-[#3b82f6] hover:bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-[0_4px_16px_rgba(59,130,246,0.3)] active:scale-95 transition-all"
        >
          <RefreshCw size={18} />
          <span>重新连接</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center pb-20 animate-pulse text-slate-400">
        <Activity size={28} className="text-indigo-500 mb-4" />
        <span className="text-sm font-medium">获取代理信息中...</span>
      </div>
    );
  }

  // 1. 获取全局排序 (基于 GLOBAL 分组的顺序)
  const globalOrder = proxies?.['GLOBAL']?.all || [];
  
  // 2. 识别并排序代理组
  const groupTypes = ['Selector', 'URLTest', 'Fallback', 'LoadBalance'];
  const proxyGroups = Object.keys(proxies || {})
    .filter(name => groupTypes.includes(proxies![name].type))
    .sort((a, b) => {
      let idxA = globalOrder.indexOf(a);
      let idxB = globalOrder.indexOf(b);
      // 如果不在 GLOBAL.all 中，排在后面
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });

  // 3. 过滤代理集合 (只保留真实的订阅，隐藏 Compatible)
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
            className={`flex-1 py-3 rounded-xl transition-all text-sm ${
              currentMode.toLowerCase() === m.id 
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 视图切换 */}
      <div className="flex bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl mb-4">
        <button 
          onClick={() => setViewType('proxies')}
          className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center space-x-2 ${
            viewType === 'proxies' ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span>代理组</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${viewType === 'proxies' ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700'}`}>{proxyGroups.length}</span>
        </button>
        <button 
          onClick={() => setViewType('providers')}
          className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center space-x-2 ${
            viewType === 'providers' ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span>代理集合</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${viewType === 'providers' ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700'}`}>{providerList.length}</span>
        </button>
      </div>

      {/* ================= 视图：代理组 (Proxies) ================= */}
      {viewType === 'proxies' && proxyGroups.map((groupName) => {
        const group = proxies![groupName];
        const isSelector = group.type === 'Selector';
        const isExpanded = expanded[groupName];
        const isTesting = testingGroup === groupName;
        const sortType = groupSorts[groupName] || 'default';
        
        const nowMs = latencies[group.now || ""] || 0;
        const nowStyle = getLatencyStyle(nowMs);

        // 排序逻辑
        const sortedNodes = [...(group.all || [])].sort((a, b) => {
          if (sortType === 'latency') {
            const dA = latencies[a] || 999999;
            const dB = latencies[b] || 999999;
            return dA - dB;
          }
          if (sortType === 'name') return a.localeCompare(b);
          return 0; // default
        });
        
        return (
          <div key={groupName} className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors overflow-hidden">
            
            {/* 卡片头部 */}
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleExpand(groupName)}>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-[17px] text-slate-900 dark:text-slate-100">{groupName}</h3>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">
                  {group.type}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                {/* 排序图标 */}
                <button 
                  onClick={(e) => toggleGroupSort(e, groupName)}
                  className={`p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center space-x-1 ${sortType !== 'default' ? 'text-indigo-500' : ''}`}
                  title={`当前排序: ${sortType}`}
                >
                  {sortType === 'name' ? <SortAsc size={18} /> : (sortType === 'latency' ? <Clock size={18} /> : <ArrowUpDown size={18} />)}
                </button>

                <button 
                  onClick={(e) => handleTestGroup(e, groupName, group.all || [])}
                  disabled={isTesting}
                  className={`p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${isTesting ? 'animate-pulse text-indigo-500' : 'hover:text-indigo-500'}`}
                >
                  <Zap size={18} />
                </button>
                <ChevronDown size={20} className={`ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* 收起预览 */}
            {!isExpanded && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center text-slate-600 dark:text-slate-300 truncate pr-4">
                    <span className="text-slate-400 dark:text-slate-500 mr-2">◉</span>
                    <span className="truncate font-medium">{group.now}</span>
                  </div>
                  <span className={`font-mono font-bold shrink-0 ${nowStyle.text}`}>
                    {nowMs ? `${nowMs} ms` : '-'}
                  </span>
                </div>
                
                <div className="mt-3 w-full h-1 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden flex">
                  {(() => {
                    const nodes = group.all || [];
                    const total = nodes.length;
                    if (total === 0) return null;
                    
                    const counts = { fast: 0, normal: 0, slow: 0, fail: 0 };
                    nodes.forEach(n => {
                      const ms = latencies[n];
                      if (!ms || ms === 0) counts.fail++;
                      else if (ms < 200) counts.fast++;
                      else if (ms < 800) counts.normal++;
                      else counts.slow++;
                    });
                    
                    return (
                      <>
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(counts.fast / total) * 100}%` }} />
                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(counts.normal / total) * 100}%` }} />
                        <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${(counts.slow / total) * 100}%` }} />
                        <div className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-500" style={{ width: `${(counts.fail / total) * 100}%` }} />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 节点列表 */}
            {isExpanded && (
              <div className="mt-5 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {sortedNodes.map((nodeName) => {
                  const isSelected = group.now === nodeName;
                  const ms = latencies[nodeName] || 0;
                  const style = getLatencyStyle(ms);

                  return (
                    <button
                      key={nodeName}
                      disabled={!isSelector}
                      onClick={() => handleSelectNode(groupName, nodeName)}
                      className={`relative flex flex-col justify-center px-4 py-3 rounded-2xl text-left transition-all border
                        ${isSelected 
                          ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500 shadow-sm' 
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }
                        ${!isSelector && 'cursor-default opacity-80'}
                        ${isSelector && 'active:scale-[0.97]'}
                      `}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.bg}`} />
                        {isSelected && <Check size={14} className="text-indigo-500" strokeWidth={3} />}
                      </div>
                      
                      <div className={`text-[13px] font-semibold truncate w-full leading-tight ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {nodeName}
                      </div>
                      
                      <div className={`text-[11px] font-mono mt-0.5 font-medium ${style.text}`}>
                        {ms ? `${ms} ms` : (ms === 0 && testingGroup ? 'Testing...' : 'Timeout')}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

          </div>
        );
      })}

      {/* ================= 视图：代理集合 (Providers) ================= */}
      {viewType === 'providers' && providerList.map(([name, provider]) => {
        const isUpdating = updatingProvider === name;
        const isExpanded = expandedProviders[name];
        const isTesting = testingGroup === name;
        
        return (
          <div key={name} className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            
            {/* 眉栏 */}
            <div className="flex items-start justify-between cursor-pointer group" onClick={() => toggleProviderExpand(name)}>
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
                  onClick={(e) => handleTestProvider(e, name)}
                  disabled={isTesting}
                  className={`p-2 rounded-xl transition-all ${
                    isTesting ? 'text-indigo-500 animate-pulse' : 'hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Zap size={18} />
                </button>
                <button 
                  onClick={(e) => handleUpdateProvider(e, name)}
                  disabled={isUpdating}
                  className={`p-2 rounded-xl transition-all ${
                    isUpdating ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500' : 'hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
                </button>
                <ChevronDown size={20} className={`ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* 流量卡片 */}
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

            {/* 展开节点 */}
            {isExpanded && provider.proxies && (
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/50 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                {provider.proxies.map((node, idx) => {
                  const ms = latencies[node.name] || 0;
                  const style = getLatencyStyle(ms);
                  return (
                    <div key={idx} className="flex flex-col px-3.5 py-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 opacity-80">
                      <span className={`w-1.5 h-1.5 rounded-full mb-1 ${style.bg}`} />
                      <div className="text-[12px] font-semibold truncate text-slate-700 dark:text-slate-300">{node.name}</div>
                      <div className={`text-[10px] font-mono mt-1 ${style.text}`}>{ms ? `${ms} ms` : 'N/A'}</div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        );
      })}

      {viewType === 'providers' && providerList.length === 0 && (
         <div className="flex flex-col items-center justify-center py-16 text-slate-400">
           <ZapOff size={40} className="opacity-20 mb-3" />
           <p className="text-sm">未发现活跃的外部代理集合</p>
         </div>
      )}

      {/* FAB */}
      {(viewType === 'proxies' || viewType === 'providers') && (
        <div className="fixed bottom-[100px] right-6 z-40 animate-in slide-in-from-bottom-4 zoom-in duration-300">
          <button
            onClick={handleTestAll}
            disabled={testingAll}
            className="w-14 h-14 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-full shadow-[0_8px_25px_rgba(59,130,246,0.5)] flex items-center justify-center active:scale-95 transition-all focus:outline-none"
          >
            <Zap size={24} className={testingAll ? 'animate-pulse' : ''} />
          </button>
        </div>
      )}

    </div>
  );
}
