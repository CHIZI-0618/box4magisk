import { useEffect, useMemo, useState } from 'react';
import type { NodeSortType, ProxyPrefs, ProxyViewType } from '../types';
import { PROXIES_PREFS_STORAGE_KEY } from '../utils';

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

export function useProxyPrefs() {
  const initialPrefs = useMemo(() => readProxyPrefs(), []);
  const [viewType, setViewType] = useState<ProxyViewType>(initialPrefs.viewType);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialPrefs.expanded);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>(initialPrefs.expandedProviders);
  const [groupSorts, setGroupSorts] = useState<Record<string, NodeSortType>>(initialPrefs.groupSorts);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(PROXIES_PREFS_STORAGE_KEY, JSON.stringify({
        viewType,
        expanded,
        expandedProviders,
        groupSorts,
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [viewType, expanded, expandedProviders, groupSorts]);

  return {
    viewType,
    setViewType,
    expanded,
    setExpanded,
    expandedProviders,
    setExpandedProviders,
    groupSorts,
    setGroupSorts,
  };
}
