import { useState } from 'react';
import { RefreshCw, Save, Home, Layers, Settings, Smartphone, Moon, Sun, Server } from 'lucide-react';
import { NavItem } from '@/components/ui';
import { useBoxController } from '@/hooks/useBoxController';
import { useTheme } from '@/hooks/useTheme';
import { TabHome } from '@/tabs/TabHome';
import { TabProxies } from '@/tabs/TabProxies';
import { TabApps } from '@/tabs/TabApps';
import { TabAdvanced } from '@/tabs/TabAdvanced';
import '@/index.css';
import { t, useLocale } from '@/i18n';

export default function App() {
  useLocale();
  const [activeTab, setActiveTab] = useState('home');
  const { theme, isDark, cycleTheme } = useTheme();
  const {
    loading,
    status,
    config,
    appList,
    actionLoading,
    hasChanges,
    handleServiceAction,
    handleToggle,
    handleChange,
    handleSaveAndApply,
    handleToggleAutoStart,
  } = useBoxController();

  if (loading) {
    return (
      <div className={`flex min-h-dvh items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="animate-spin text-indigo-500"><RefreshCw size={28} /></div>
      </div>
    );
  }

  return (
    <div className={`mx-auto h-dvh max-w-md overflow-hidden font-sans shadow-2xl transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'} relative`}>
      {/* Top Navigation */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${status.running ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500'}`} />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">{t('app.title')}</h1>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center transition-colors">
              {status.running ? `PID: ${status.pid}` : t('app.status.stopped')}
            </div>
          </div>
          <button onClick={cycleTheme} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title={t('app.theme.toggle')} aria-label={t('app.theme.toggle')}>
            {theme === 'system' ? <Smartphone size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="h-[calc(100dvh-53px)] overflow-y-auto pb-32 pt-2 scrollbar-hide">
        {activeTab === 'home' && <TabHome status={status} config={config} handleServiceAction={handleServiceAction} actionLoading={actionLoading} handleChange={handleChange} handleToggle={handleToggle} handleToggleAutoStart={handleToggleAutoStart} />}
        {activeTab === 'proxies' && <TabProxies status={status} />}
        {activeTab === 'apps' && <TabApps config={config} handleToggle={handleToggle} handleChange={handleChange} appList={appList} />}
        {activeTab === 'advanced' && <TabAdvanced status={status} config={config} handleToggle={handleToggle} handleChange={handleChange} />}
      </main>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="absolute bottom-16 right-6 z-40 animate-in slide-in-from-bottom-4 zoom-in duration-300">
          <button
            onClick={handleSaveAndApply}
            disabled={actionLoading === 'save'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3.5 rounded-full shadow-[0_4px_16px_rgba(79,70,229,0.4)] flex items-center space-x-2 font-bold active:scale-95 transition-all"
          >
            {actionLoading === 'save' ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
            <span>{actionLoading === 'save' ? t('app.save.applying') : t('app.save')}</span>
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2 pb-safe flex justify-between items-center z-30 transition-colors">
        <NavItem icon={<Home size={24} />} label={t('tabs.home')} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<Server size={24} />} label={t('tabs.proxies')} active={activeTab === 'proxies'} onClick={() => setActiveTab('proxies')} />
        <NavItem icon={<Layers size={24} />} label={t('tabs.apps')} active={activeTab === 'apps'} onClick={() => setActiveTab('apps')} />
        <NavItem icon={<Settings size={24} />} label={t('tabs.advanced')} active={activeTab === 'advanced'} onClick={() => setActiveTab('advanced')} />
      </nav>
    </div>
  );
}
