import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Square, Play, Smartphone, Wifi, Radio, Usb, MemoryStick } from 'lucide-react';
import { SectionTitle, SwitchRow, SelectRow } from '@/components/ui';
import { ClashClient, type ClashMemory } from '@/lib/clash';

const formatMemory = (memory: ClashMemory | null) => {
  if (!memory) return '--';
  const candidates = [
    typeof memory.inuse === 'number' ? memory.inuse : null,
    ...Object.values(memory).filter((value): value is number => typeof value === 'number'),
  ].filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);

  if (candidates.length === 0) return '--';

  const kb = candidates[0];
  if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.round(kb)} KB`;
};

export function TabHome({ status, config, handleServiceAction, actionLoading, handleChange, handleToggle }: any) {
  const [memory, setMemory] = useState<ClashMemory | null>(null);

  const client = useMemo(() => {
    return new ClashClient(String(status?.clash_api_port || config?.clash_api_port || 9090), String(status?.clash_api_secret || config?.clash_api_secret || ''));
  }, [status?.clash_api_port, status?.clash_api_secret, config?.clash_api_port, config?.clash_api_secret]);

  useEffect(() => {
    if (!status?.running) {
      setMemory(null);
      return;
    }

    let cancelled = false;

    const loadMemory = async () => {
      try {
        const data = await client.getMemory();
        if (!cancelled) {
          setMemory(data);
        }
      } catch {
        if (!cancelled) {
          setMemory(null);
        }
      }
    };

    loadMemory();
    const timer = window.setInterval(loadMemory, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status?.running, client]);

  return (
    <div className="px-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mt-2 transition-colors">
        <div className="flex justify-between items-center mb-5">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">当前核心 / 模式</span>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 capitalize">{config?.bin_name || '未知'}</span>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-md uppercase transition-colors">{config?.PROXY_MODE || 'auto'}</span>
            </div>
          </div>
          <div className="min-w-[88px] rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-3 py-2 shadow-sm">
            <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
              <MemoryStick size={14} />
              <span>内存</span>
            </div>
            <div className="mt-1 text-right text-sm font-bold tabular-nums">
              {status?.running ? formatMemory(memory) : '--'}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleServiceAction(status?.running ? 'stop' : 'start')}
            disabled={actionLoading !== null}
            className={`py-3.5 rounded-xl text-sm font-bold flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-80
              ${status?.running 
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20' 
                : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'}`}
          >
            {actionLoading === 'start' || actionLoading === 'stop' ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              status?.running ? <><Square size={16} className="mr-2" /> 停止服务</> : <><Play size={16} className="mr-2" /> 启动服务</>
            )}
          </button>
          <button
            onClick={() => handleServiceAction('restart')}
            disabled={!status?.running || actionLoading !== null}
            className="py-3.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
          >
            {actionLoading === 'restart' ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <><RefreshCw size={16} className="mr-2" /> 重启</>
            )}
          </button>
        </div>
      </div>

      <div>
        <SectionTitle title="全局路由规则" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SelectRow label="切换代理模式" value={config?.PROXY_MODE} options={['auto', 'TPROXY', 'REDIRECT', 'core']} onChange={(v: string) => handleChange('PROXY_MODE', v)} border={true} />
          <SelectRow label="切换代理核心" value={config?.bin_name} options={['sing-box', 'clash', 'mihomo', 'xray']} onChange={(v: string) => handleChange('bin_name', v)} border={true} />
          <SwitchRow label="绕过大陆 IP" sub="直连国内流量，需要内核支持 ipset" checked={config?.BYPASS_CN_IP === 1} onChange={(v: boolean) => handleToggle('BYPASS_CN_IP', v)} border={true} />
          <SwitchRow label="拦截 QUIC" sub="强制应用走 TCP 代理" checked={config?.BLOCK_QUIC === 1} onChange={(v: boolean) => handleToggle('BLOCK_QUIC', v)} border={false} />
        </div>
      </div>

      <div>
        <SectionTitle title="代理网络接口" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SwitchRow label="移动数据" icon={<Smartphone size={18} />} checked={config?.PROXY_MOBILE === 1} onChange={(v: boolean) => handleToggle('PROXY_MOBILE', v)} border={true} />
          <SwitchRow label="无线网络" icon={<Wifi size={18} />} checked={config?.PROXY_WIFI === 1} onChange={(v: boolean) => handleToggle('PROXY_WIFI', v)} border={true} />
          <SwitchRow label="移动热点" icon={<Radio size={18} />} checked={config?.PROXY_HOTSPOT === 1} onChange={(v: boolean) => handleToggle('PROXY_HOTSPOT', v)} border={true} />
          <SwitchRow label="USB共享" icon={<Usb size={18} />} checked={config?.PROXY_USB === 1} onChange={(v: boolean) => handleToggle('PROXY_USB', v)} border={false} />
        </div>
      </div>
    </div>
  );
}
