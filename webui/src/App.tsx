import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Save, Home, Layers, Settings, Smartphone, Moon, Sun, Server } from 'lucide-react';
import { boxBridge, discoverPackages, notify } from '@/lib/bridge';
import { NavItem } from '@/components/ui';
import { TabHome } from '@/tabs/TabHome';
import { TabProxies } from '@/tabs/TabProxies';
import { TabApps } from '@/tabs/TabApps';
import { TabAdvanced } from '@/tabs/TabAdvanced';
import '@/index.css';

const THEME_STORAGE_KEY = 'box4:webui:theme';

function readStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function normalizeStatus(rawStatus: any) {
  const autoStartValue = rawStatus?.autostart_enabled;
  return {
    ...rawStatus,
    autoStart: autoStartValue === true || autoStartValue === 1 || autoStartValue === '1' || autoStartValue === 'true',
  };
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [status, setStatus] = useState<any>({ running: false, pid: '', bin_name: 'sing-box', clash_api_port: '9090' });
  const [originalConfig, setOriginalConfig] = useState<any>({});
  const [config, setConfig] = useState<any>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [appList, setAppList] = useState<any[]>([]);

  // 主题状态：system | light | dark
  const [theme, setTheme] = useState(readStoredTheme);
  const [systemIsDark, setSystemIsDark] = useState(false);

  // 监听系统级暗色模式变化
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = theme === 'system' ? systemIsDark : theme === 'dark';

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(originalConfig) !== JSON.stringify(config);
  }, [originalConfig, config]);

  const toggleKeys = useMemo(() => new Set([
    'PROXY_MOBILE',
    'PROXY_WIFI',
    'PROXY_HOTSPOT',
    'PROXY_USB',
    'PROXY_TCP',
    'PROXY_UDP',
    'PROXY_IPV6',
    'APP_PROXY_ENABLE',
    'BYPASS_CN_IP',
    'BLOCK_QUIC',
    'MAC_FILTER_ENABLE',
  ]), []);

  const numericKeys = useMemo(() => new Set([
    'DNS_HIJACK_ENABLE',
    'PROXY_TCP_PORT',
    'PROXY_UDP_PORT',
    'DNS_PORT',
    'clash_api_port',
  ]), []);

  useEffect(() => {
    const init = async () => {
      const [statusResult, configResult] = await Promise.allSettled([
        boxBridge.status(),
        boxBridge.getConfig(),
      ]);

      if (statusResult.status === 'fulfilled') {
        setStatus(normalizeStatus(statusResult.value));
      }

      if (configResult.status === 'fulfilled') {
        setConfig(configResult.value);
        setOriginalConfig(configResult.value);
      }

      setTimeout(() => {
        setAppList(discoverPackages());
      }, 50);

      if (statusResult.status === 'rejected' && configResult.status === 'rejected') {
        notify(`初始化失败: ${statusResult.reason?.message || configResult.reason?.message || '无法获取状态和配置'}`);
      } else if (statusResult.status === 'rejected') {
        notify(`状态读取失败: ${statusResult.reason?.message || '未知错误'}`);
      } else if (configResult.status === 'rejected') {
        notify(`配置读取失败: ${configResult.reason?.message || '未知错误'}`);
      }

      setLoading(false);
    };
    init();
  }, []);

  const waitForStatus = async (expectedRunning: boolean, attempts = 12, delayMs = 500) => {
    let latestStatus = normalizeStatus(await boxBridge.status());
    for (let i = 0; i < attempts; i++) {
      if (Boolean(latestStatus?.running) === expectedRunning) {
        return latestStatus;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
      latestStatus = normalizeStatus(await boxBridge.status());
    }
    return latestStatus;
  };

  const handleServiceAction = async (action: string) => {
    setActionLoading(action);
    // 给浏览器一点时间渲染 loading 状态，避免桥接调用阻塞 UI
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      if (action === 'start' || action === 'stop' || action === 'restart') {
        await boxBridge.service(action as any);
      }
      const st = action === 'start'
        ? await waitForStatus(true)
        : action === 'restart'
          ? await waitForStatus(true)
          : action === 'stop'
            ? await waitForStatus(false)
            : await boxBridge.status();
      setStatus(st);
      notify(action === 'stop' ? "服务已停止" : "服务已启动");
    } catch (e: any) {
      notify("操作失败: " + e.message);
    }
    setActionLoading(null);
  };

  const handleToggle = (key: string, val: boolean) => {
    setConfig((prev: any) => ({ ...prev, [key]: val ? 1 : 0 }));
  };

  const handleChange = (key: string, val: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSaveAndApply = async () => {
    setActionLoading('save');
    try {
      let isAppsChanged = false;
      const keysChanged = [];
      const newConfig = { ...config };

      for (const key of Object.keys(newConfig)) {
        if (newConfig[key] !== originalConfig[key]) {
          if (['APP_PROXY_ENABLE', 'APP_PROXY_MODE', 'PROXY_APPS_LIST', 'BYPASS_APPS_LIST'].includes(key)) {
            isAppsChanged = true;
          } else {
            keysChanged.push(key);
          }
        }
      }

      for (const key of keysChanged) {
        if (toggleKeys.has(key)) {
          await boxBridge.toggle(key, newConfig[key] as 0 | 1);
        } else if (numericKeys.has(key)) {
          await boxBridge.setNumber(key, newConfig[key]);
        } else {
          await boxBridge.setConfig(key, String(newConfig[key]));
        }
      }

      if (isAppsChanged) {
        const modeStr = newConfig.APP_PROXY_ENABLE === 1 ? newConfig.APP_PROXY_MODE : 'disable';
        const listValue = newConfig.APP_PROXY_MODE === 'whitelist' ? newConfig.PROXY_APPS_LIST : newConfig.BYPASS_APPS_LIST;
        await boxBridge.setApps(modeStr, listValue);
      }

      // Restart service to apply changes
      await boxBridge.service('restart');

      const st = await waitForStatus(true);
      setStatus(st);
      setOriginalConfig(newConfig);
      notify("已保存并生效");
    } catch (e: any) {
      notify("保存失败: " + e.message);
    }
    setActionLoading(null);
  };

  const handleToggleAutoStart = async (v: boolean) => {
    try {
      await boxBridge.manualMode(v ? "disable" : "enable");
      setStatus((prev: any) => ({ ...prev, autoStart: v }));
    } catch (e: any) {
      notify("设置失败: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="animate-spin text-indigo-500"><RefreshCw size={28} /></div>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto min-h-screen shadow-2xl relative overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'dark bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Top Navigation */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${status.running ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500'}`} />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Box 控制台</h1>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center transition-colors">
              {status.running ? `PID: ${status.pid}` : 'STOPPED'}
            </div>
          </div>
          <button onClick={cycleTheme} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="切换主题">
            {theme === 'system' ? <Smartphone size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pb-24 pt-2 overflow-y-auto h-[calc(100vh-53px)] scrollbar-hide">
        {activeTab === 'home' && <TabHome status={status} config={config} handleServiceAction={handleServiceAction} actionLoading={actionLoading} handleChange={handleChange} handleToggle={handleToggle} handleToggleAutoStart={handleToggleAutoStart} />}
        {activeTab === 'proxies' && <TabProxies status={status} />}
        {activeTab === 'apps' && <TabApps config={config} handleToggle={handleToggle} handleChange={handleChange} appList={appList} />}
        {activeTab === 'advanced' && <TabAdvanced config={config} handleToggle={handleToggle} handleChange={handleChange} />}
      </main>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="absolute bottom-20 right-6 z-40 animate-in slide-in-from-bottom-4 zoom-in duration-300">
          <button
            onClick={handleSaveAndApply}
            disabled={actionLoading === 'save'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3.5 rounded-full shadow-[0_4px_16px_rgba(79,70,229,0.4)] flex items-center space-x-2 font-bold active:scale-95 transition-all"
          >
            {actionLoading === 'save' ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
            <span>{actionLoading === 'save' ? '应用中...' : '保存'}</span>
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2 pb-safe flex justify-between items-center z-30 transition-colors">
        <NavItem icon={<Home size={24} />} label="首页" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<Server size={24} />} label="代理" active={activeTab === 'proxies'} onClick={() => setActiveTab('proxies')} />
        <NavItem icon={<Layers size={24} />} label="分流" active={activeTab === 'apps'} onClick={() => setActiveTab('apps')} />
        <NavItem icon={<Settings size={24} />} label="高级" active={activeTab === 'advanced'} onClick={() => setActiveTab('advanced')} />
      </nav>
    </div>
  );
}
