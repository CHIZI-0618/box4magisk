import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClashClient } from '@/lib/clash';
import { notify } from '@/lib/bridge';
import type { ProviderMap, ProxyMap } from '../types';

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

export function useProxyData(status: { running: boolean; clash_api_port: string; clash_api_secret: string }) {
  const isMounted = useIsMounted();
  const [proxies, setProxies] = useState<ProxyMap | null>(null);
  const [providers, setProviders] = useState<ProviderMap | null>(null);
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [currentMode, setCurrentMode] = useState<string>('rule');
  const [testingOwners, setTestingOwners] = useState<Record<string, number>>({});
  const [testingNodes, setTestingNodes] = useState<Record<string, number>>({});
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);

  const client = useMemo(() => new ClashClient(status.clash_api_port, status.clash_api_secret), [status.clash_api_port, status.clash_api_secret]);

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
      const [proxyData, providerData, config] = await Promise.all([
        client.getProxies({ signal }),
        client.getProviders({ signal }),
        client.getConfig({ signal }),
      ]);

      if (!proxyData || signal?.aborted || !isMounted.current) return;

      setProxies(proxyData);
      setProviders(providerData);
      setCurrentMode(config.mode);

      const initialLatencies: Record<string, number> = {};
      Object.keys(proxyData).forEach(name => {
        const history = proxyData[name].history;
        if (history && history.length > 0) {
          initialLatencies[name] = history[history.length - 1].delay;
        }
      });
      setLatencies(initialLatencies);
    } catch (e) {
      if (signal?.aborted || !isMounted.current) return;
      console.error('Fetch Data Error:', e);
      setApiError(true);
    } finally {
      if (!signal?.aborted && isMounted.current) {
        setLoading(false);
      }
    }
  }, [client, isMounted, status.running]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchInitialData(controller.signal);
    return () => controller.abort();
  }, [fetchInitialData]);

  const handleSelectNode = useCallback(async (groupName: string, nodeName: string) => {
    if (proxies?.[groupName]?.now === nodeName) return;
    try {
      await client.selectProxy(groupName, nodeName);
      if (!isMounted.current) return;
      setProxies(prev => prev ? ({
        ...prev,
        [groupName]: { ...prev[groupName], now: nodeName },
      }) : null);
    } catch (e: unknown) {
      if (isMounted.current) notify(`切换失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [client, isMounted, proxies]);

  const handleChangeMode = useCallback(async (mode: 'rule' | 'global' | 'direct') => {
    if (currentMode === mode) return;
    const oldMode = currentMode;
    setCurrentMode(mode);
    try {
      await client.updateConfig({ mode });
    } catch (e: unknown) {
      if (isMounted.current) {
        setCurrentMode(oldMode);
        notify(`模式切换失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }, [client, currentMode, isMounted]);

  const handleUpdateProvider = useCallback(async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (updatingProvider) return;
    setUpdatingProvider(name);
    try {
      await client.updateProvider(name);
      const providerData = await client.getProviders();
      if (!isMounted.current) return;
      setProviders(providerData);
      notify(`已更新: ${name}`);
    } catch (e: unknown) {
      if (isMounted.current) notify(`更新失败: ${e instanceof Error ? e.message : String(e)}`);
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
      const providerData = await client.getProviders();
      const proxyData = await client.getProxies();

      if (!isMounted.current) return;
      setProviders(providerData);
      setProxies(proxyData);
      setLatencies(prev => {
        const next = { ...prev };
        Object.keys(proxyData).forEach(nodeName => {
          const history = proxyData[nodeName].history;
          if (history && history.length > 0) {
            next[nodeName] = history[history.length - 1].delay;
          }
        });
        return next;
      });
    } catch (e: unknown) {
      if (isMounted.current) notify(`测速失败: ${e instanceof Error ? e.message : String(e)}`);
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
      const results = await Promise.all(nodes.map(node => client.testLatency(node).catch(() => 0)));
      if (!isMounted.current) return;
      setLatencies(prev => {
        const next = { ...prev };
        nodes.forEach((node, index) => {
          next[node] = results[index];
        });
        return next;
      });
    } catch {
      if (isMounted.current) notify('测速出错');
    } finally {
      if (isMounted.current) markTestingEnd(ownerKey, nodes);
    }
  }, [client, isMounted, markTestingEnd, markTestingStart, testingOwners]);

  return {
    proxies,
    providers,
    latencies,
    loading,
    apiError,
    currentMode,
    testingOwners,
    testingNodes,
    updatingProvider,
    fetchInitialData,
    handleSelectNode,
    handleChangeMode,
    handleUpdateProvider,
    handleTestProvider,
    handleTestGroup,
  };
}
