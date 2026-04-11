import { useEffect, useMemo, useState } from 'react';
import { boxBridge, discoverPackages, notify } from '@/lib/bridge';
import { t } from '@/i18n';
import type { AppInfo, BoxConfig, BoxControllerState, BoxStatus, CoreInfo } from '@/types/box';

function normalizeStatus(rawStatus: Partial<BoxStatus> | null | undefined): BoxStatus {
  const autoStartValue = rawStatus?.autostart_enabled;
  return {
    running: false,
    pid: '',
    bin_name: 'sing-box',
    clash_api_port: '9090',
    clash_api_secret: '',
    ...rawStatus,
    autoStart: autoStartValue === true || autoStartValue === 1 || autoStartValue === '1' || autoStartValue === 'true',
  };
}

const TOGGLE_KEYS = new Set([
  'PROXY_MOBILE',
  'PROXY_WIFI',
  'PROXY_HOTSPOT',
  'PROXY_USB',
  'PROXY_TCP',
  'PROXY_UDP',
  'APP_PROXY_ENABLE',
  'BYPASS_CN_IP',
  'BLOCK_QUIC',
  'MAC_FILTER_ENABLE',
  'FORCE_MARK_BYPASS',
  'PERFORMANCE_MODE',
]);

const NUMERIC_KEYS = new Set([
  'PROXY_MODE',
  'PROXY_IPV6',
  'DNS_HIJACK_ENABLE',
  'PROXY_TCP_PORT',
  'PROXY_UDP_PORT',
  'DNS_PORT',
  'clash_api_port',
  'MARK_VALUE',
  'MARK_VALUE6',
  'TABLE_ID',
]);

export function useBoxController(): BoxControllerState {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BoxStatus>({ running: false, pid: '', bin_name: 'sing-box', clash_api_port: '9090', clash_api_secret: '' });
  const [originalConfig, setOriginalConfig] = useState<BoxConfig>({});
  const [config, setConfig] = useState<BoxConfig>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [appList, setAppList] = useState<AppInfo[]>([]);
  const [coreInfo, setCoreInfo] = useState<CoreInfo | null>(null);

  const hasChanges = useMemo(() => JSON.stringify(originalConfig) !== JSON.stringify(config), [originalConfig, config]);

  useEffect(() => {
    const init = async () => {
      const [statusResult, configResult, coreInfoResult] = await Promise.allSettled([
        boxBridge.status(),
        boxBridge.getConfig(),
        boxBridge.coreInfo(),
      ]);

      if (statusResult.status === 'fulfilled') {
        setStatus(normalizeStatus(statusResult.value));
      }

      if (configResult.status === 'fulfilled') {
        setConfig(configResult.value as BoxConfig);
        setOriginalConfig(configResult.value as BoxConfig);
      }
      if (coreInfoResult.status === 'fulfilled') {
        setCoreInfo(coreInfoResult.value as CoreInfo);
      }

      setTimeout(() => {
        setAppList(discoverPackages());
      }, 50);

      if (statusResult.status === 'rejected' && configResult.status === 'rejected') {
        notify(t('notify.init_failed', { error: statusResult.reason?.message || configResult.reason?.message || t('notify.unknown_status_config_error') }));
      } else if (statusResult.status === 'rejected') {
        notify(t('notify.status_read_failed', { error: statusResult.reason?.message || t('notify.unknown_error') }));
      } else if (configResult.status === 'rejected') {
        notify(t('notify.config_read_failed', { error: configResult.reason?.message || t('notify.unknown_error') }));
      }

      setLoading(false);
    };

    void init();
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
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      if (action === 'start' || action === 'stop' || action === 'restart') {
        await boxBridge.service(action as 'start' | 'stop' | 'restart');
      }
      const nextStatus = action === 'start'
        ? await waitForStatus(true)
        : action === 'restart'
          ? await waitForStatus(true)
          : action === 'stop'
            ? await waitForStatus(false)
            : await boxBridge.status();
      setStatus(nextStatus);
      notify(t(action === 'stop' ? 'notify.service_stopped' : 'notify.service_started'));
    } catch (e: unknown) {
      notify(t('notify.action_failed', { error: e instanceof Error ? e.message : String(e) }));
    }
    setActionLoading(null);
  };

  const handleToggle = (key: string, val: boolean) => {
    setConfig(prev => ({ ...prev, [key]: val ? 1 : 0 }));
  };

  const handleChange = <K extends keyof BoxConfig>(key: K, val: BoxConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  const handleSaveAndApply = async () => {
    setActionLoading('save');
    try {
      let isAppsChanged = false;
      const keysChanged: string[] = [];
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
        const value = newConfig[key];
        if (TOGGLE_KEYS.has(key)) {
          await boxBridge.toggle(key, value as 0 | 1);
        } else if (NUMERIC_KEYS.has(key)) {
          if (typeof value === 'string' || typeof value === 'number') {
            await boxBridge.setNumber(key, value);
          }
        } else {
          await boxBridge.setConfig(key, String(value ?? ''));
        }
      }

      if (isAppsChanged) {
        const modeStr = newConfig.APP_PROXY_ENABLE === 1 ? (newConfig.APP_PROXY_MODE || 'blacklist') : 'disable';
        const listValue = newConfig.APP_PROXY_MODE === 'whitelist' ? (newConfig.PROXY_APPS_LIST || '') : (newConfig.BYPASS_APPS_LIST || '');
        await boxBridge.setApps(modeStr, listValue);
      }

      await boxBridge.service('restart');

      const nextStatus = await waitForStatus(true);
      setStatus(nextStatus);
      setOriginalConfig(newConfig);
      notify(t('notify.saved_and_applied'));
    } catch (e: unknown) {
      notify(t('notify.save_failed', { error: e instanceof Error ? e.message : String(e) }));
    }
    setActionLoading(null);
  };

  const handleToggleAutoStart = async (value: boolean) => {
    try {
      await boxBridge.manualMode(value ? 'disable' : 'enable');
      setStatus(prev => ({ ...prev, autoStart: value }));
    } catch (e: unknown) {
      notify(t('notify.set_failed', { error: e instanceof Error ? e.message : String(e) }));
    }
  };

  return {
    loading,
    status,
    config,
    appList,
    actionLoading,
    coreInfo,
    hasChanges,
    handleServiceAction,
    handleToggle,
    handleChange,
    handleSaveAndApply,
    handleToggleAutoStart,
  };
}
