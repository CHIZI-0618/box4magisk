import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Square, Play, Smartphone, Wifi, Radio, Usb, MemoryStick } from 'lucide-react';
import { SectionTitle, SwitchRow, SelectRow } from '@/components/ui';
import { ClashClient, type ClashMemory } from '@/lib/clash';
import { useProxyData } from '@/features/proxies/hooks/useProxyData';
import { MODE_OPTIONS } from '@/features/proxies/types';
import type { BoxConfig, BoxStatus, CoreInfo } from '@/types/box';
import { t } from '@/i18n';

const BIN_NAME_OPTIONS = ['sing-box', 'clash', 'mihomo', 'xray', 'v2ray', 'hysteria'];

const formatProxyMode = (value: unknown) => {
  switch (String(value ?? '0')) {
    case '1':
      return 'TPROXY';
    case '2':
      return 'REDIRECT';
    default:
      return 'AUTO';
  }
};

const formatMemory = (memory: ClashMemory | null) => {
  if (!memory) return '--';
  const candidates = [
    typeof memory.inuse === 'number' ? memory.inuse : null,
    ...Object.values(memory).filter((value): value is number => typeof value === 'number'),
  ].filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);

  if (candidates.length === 0) return '--';

  const bytes = candidates[0];
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes)} B`;
};

interface DashboardPageProps {
  status: BoxStatus;
  config: BoxConfig;
  coreInfo: CoreInfo | null;
  handleServiceAction: (action: string) => void;
  actionLoading: string | null;
  handleChange: <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => void;
  handleToggle: (key: string, value: boolean) => void;
  handleToggleAutoStart: (value: boolean) => void;
}

export function DashboardPage({ status, config, coreInfo, handleServiceAction, actionLoading, handleChange, handleToggle, handleToggleAutoStart }: DashboardPageProps) {
  const { currentMode, handleChangeMode } = useProxyData(status);
  const [memory, setMemory] = useState<ClashMemory | null>(null);

  const proxyModeOptions = [
    { l: t('dashboard.proxy_mode.auto'), v: '0' },
    { l: 'TPROXY', v: '1' },
    { l: 'REDIRECT', v: '2' },
  ];

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

    void loadMemory();
    const timer = window.setInterval(loadMemory, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status?.running, client]);

  return (
    <div className="px-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {coreInfo && (
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-700/40">
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-2">{t('dashboard.core_versions')}</div>
          <div className="space-y-1.5 text-sm text-amber-900 dark:text-amber-100">
            {Object.entries(coreInfo.cores).map(([coreName, details]) => (
              <div key={coreName} className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  {coreName}
                  {coreInfo.selected === coreName ? ` · ${t('dashboard.selected_core')}` : ''}
                </span>
                <span className="text-xs md:text-sm text-right">
                  {details.installed} / {details.latest}
                  {details.update_required ? ` · ${t('dashboard.update_required')}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mt-2 transition-colors">
        <div className="flex justify-between items-center mb-5">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t('dashboard.core_mode')}</span>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 capitalize">{config?.bin_name || t('dashboard.unknown')}</span>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-md uppercase transition-colors">{formatProxyMode(config?.PROXY_MODE)}</span>
            </div>
          </div>
          <div className="min-w-[88px] rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-3 py-2 shadow-sm">
            <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
              <MemoryStick size={14} />
              <span>{t('dashboard.memory')}</span>
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
            {actionLoading === 'start' || actionLoading === 'stop'
              ? <RefreshCw size={18} className="animate-spin" />
              : status?.running
                ? <><Square size={16} className="mr-2" /> {t('dashboard.stop_box')}</>
                : <><Play size={16} className="mr-2" /> {t('dashboard.start_box')}</>}
          </button>
          <button
            onClick={() => handleServiceAction('restart')}
            disabled={!status?.running || actionLoading !== null}
            className="py-3.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
          >
            {actionLoading === 'restart'
              ? <RefreshCw size={16} className="animate-spin" />
              : <><RefreshCw size={16} className="mr-2" /> {t('dashboard.restart_box')}</>}
          </button>
        </div>
      </div>

      <div>
        <SectionTitle title={t('dashboard.global_routing')} />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SelectRow
            label={t('dashboard.outbound_mode')}
            value={currentMode.toLowerCase()}
            options={MODE_OPTIONS.map(m => ({ l: m.label, v: m.id }))}
            onChange={(value: string) => handleChangeMode(value as any)}
            border={true}
          />
          <SelectRow label={t('dashboard.proxy_mode')} value={String(config?.PROXY_MODE ?? 0)} options={proxyModeOptions} onChange={(value: string) => handleChange('PROXY_MODE', parseInt(value, 10))} border={true} />
          <SelectRow label={t('dashboard.proxy_core')} value={config?.bin_name || 'sing-box'} options={BIN_NAME_OPTIONS} onChange={(value: string) => handleChange('bin_name', value)} border={true} />
          <SwitchRow label={t('dashboard.autostart')} sub={t('dashboard.autostart.sub')} checked={status?.autoStart === true} onChange={handleToggleAutoStart} border={true} />
          <SwitchRow label={t('dashboard.block_quic')} sub={t('dashboard.block_quic.sub')} checked={config?.BLOCK_QUIC === 1} onChange={(value: boolean) => handleToggle('BLOCK_QUIC', value)} border={false} />
        </div>
      </div>

      <div>
        <SectionTitle title={t('dashboard.network_interfaces')} />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SwitchRow label={t('dashboard.mobile_data')} icon={<Smartphone size={18} />} checked={config?.PROXY_MOBILE === 1} onChange={(value: boolean) => handleToggle('PROXY_MOBILE', value)} border={true} />
          <SwitchRow label={t('dashboard.wifi')} icon={<Wifi size={18} />} checked={config?.PROXY_WIFI === 1} onChange={(value: boolean) => handleToggle('PROXY_WIFI', value)} border={true} />
          <SwitchRow label={t('dashboard.hotspot')} icon={<Radio size={18} />} checked={config?.PROXY_HOTSPOT === 1} onChange={(value: boolean) => handleToggle('PROXY_HOTSPOT', value)} border={true} />
          <SwitchRow label={t('dashboard.usb_tethering')} icon={<Usb size={18} />} checked={config?.PROXY_USB === 1} onChange={(value: boolean) => handleToggle('PROXY_USB', value)} border={false} />
        </div>
      </div>
    </div>
  );
}
