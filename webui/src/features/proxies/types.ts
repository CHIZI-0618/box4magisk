import type { Proxy, ProxyProvider } from '@/lib/clash';

export interface TabProxiesProps {
  status: {
    running: boolean;
    clash_api_port: string;
    clash_api_secret: string;
  };
}

export type NodeSortType = 'default' | 'latency' | 'name';
export type ProxyViewType = 'proxies' | 'providers';

export type ProxyPrefs = {
  viewType: ProxyViewType;
  expanded: Record<string, boolean>;
  expandedProviders: Record<string, boolean>;
  groupSorts: Record<string, NodeSortType>;
};

export type ProxyMap = Record<string, Proxy>;
export type ProviderMap = Record<string, ProxyProvider>;

export const MODE_OPTIONS = [
  { id: 'direct', label: '直连' },
  { id: 'rule', label: '规则' },
  { id: 'global', label: '全局' },
] as const;

export type ProxyMode = (typeof MODE_OPTIONS)[number]['id'];
