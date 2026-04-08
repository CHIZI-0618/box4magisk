import { useState, type ReactNode } from 'react';
import { BookOpen, ChevronRight, ExternalLink, FolderCog, FolderGit, Info, ListFilter, Mail, Network, Route, TriangleAlert, X } from 'lucide-react';
import { InputRow, SectionTitle, SelectRow, SwitchRow } from '@/components/ui';
import { notify, openExternalUrl } from '@/lib/bridge';
import { ensureFieldVisible } from '@/lib/focus';
import type { BoxConfig, BoxStatus } from '@/types/box';

const IPV6_MODE_OPTIONS = [
  { l: '关闭代理', v: '0' },
  { l: '启用代理', v: '1' },
  { l: '强制关闭 IPv6', v: '-1' },
];

const MAC_PROXY_MODE_OPTIONS = [
  { l: '黑名单', v: 'blacklist' },
  { l: '白名单', v: 'whitelist' },
];

const CORE_MAINTAINER = 'CHIZI-0618';
const FRONTEND_MAINTAINER = 'chrysoljq';
const CORE_MAINTAINER_URL = 'https://github.com/CHIZI-0618';
const FRONTEND_MAINTAINER_URL = 'https://github.com/chrysoljq';
const PROJECT_REPO = 'https://github.com/CHIZI-0618/box4magisk';
const ISSUE_TRACKER = 'https://github.com/CHIZI-0618/box4magisk/issues';
const UI_FEEDBACK_REPO = 'https://github.com/chrysoljq/box4magisk';
const WIKI_URL = 'https://github.com/CHIZI-0618/box4magisk/blob/main/README_zh.md';

type AdvancedPanelKey = 'routing' | 'interfaces' | 'ip-lists' | 'cn-source' | 'network' | 'about' | null;

interface SettingsPageProps {
  status: BoxStatus;
  config: BoxConfig;
  handleToggle: (key: string, value: boolean) => void;
  handleChange: <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => void;
}

interface SecondaryEntryRowProps {
  icon: ReactNode;
  title: string;
  sub?: string;
  border?: boolean;
  onClick: () => void;
}

interface FloatingPanelProps {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

interface StackInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface StackTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sub?: string;
}

interface AboutLinkRowProps {
  href: string;
  icon: ReactNode;
  title: string;
  sub: string;
}

interface AboutInfoRowProps {
  label: string;
  value: string;
}

interface MaintainerButtonProps {
  label: string;
  value: string;
  href: string;
}

function countEntries(value?: string) {
  if (!value) return 0;
  return value
    .split(/\r?\n|\s+/)
    .map(entry => entry.trim())
    .filter(Boolean).length;
}

function formatListForEditor(value?: string) {
  if (!value) return '';
  return value
    .split(/\s+/)
    .map(entry => entry.trim())
    .filter(Boolean)
    .join('\n');
}

function normalizeListForStorage(value: string) {
  return value
    .split(/\r?\n|\s+/)
    .map(entry => entry.trim())
    .filter(Boolean)
    .join(' ');
}

function SecondaryEntryRow({ icon, title, sub, border = true, onClick }: SecondaryEntryRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${border ? 'border-b border-slate-100 dark:border-slate-800/50' : ''}`}
    >
      <div className="flex min-w-0 items-center space-x-3">
        <div className="text-slate-400 dark:text-slate-500 transition-colors">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">{title}</div>
          {sub && <div className="mt-0.5 text-[11px] leading-tight text-slate-400 dark:text-slate-500 transition-colors">{sub}</div>}
        </div>
      </div>
      <div className="ml-3 flex min-w-0 items-center space-x-2">
        <ChevronRight size={16} className="shrink-0 text-slate-300 dark:text-slate-600" />
      </div>
    </button>
  );
}

function FloatingPanel({ title, description, onClose, children }: FloatingPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-dvh max-w-md flex-col bg-white dark:bg-slate-950"
        onClick={event => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="pr-4">
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[55vh]">{children}</div>
      </div>
    </div>
  );
}

function StackInput({ label, value, onChange, placeholder }: StackInputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={event => ensureFieldVisible(event.currentTarget)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900"
      />
    </label>
  );
}

function StackTextarea({ label, value, onChange, placeholder, sub }: StackTextareaProps) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
        {sub && <span className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</span>}
      </div>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={event => ensureFieldVisible(event.currentTarget)}
        placeholder={placeholder}
        className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900"
      />
    </label>
  );
}

function AboutLinkRow({ href, icon, title, sub }: AboutLinkRowProps) {
  return (
    <button
      type="button"
      onClick={() => {
        void openExternalUrl(href).catch((error: unknown) => {
          notify(`打开失败: ${error instanceof Error ? error.message : String(error)}`);
        });
      }}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-400 dark:text-slate-500">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</div>
          <div className="mt-0.5 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{sub}</div>
        </div>
      </div>
      <ExternalLink size={16} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
    </button>
  );
}

function AboutInfoRow({ label, value }: AboutInfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</div>
      <div className="max-w-[60%] break-all text-right text-xs font-mono text-slate-500 dark:text-slate-400">{value}</div>
    </div>
  );
}

function MaintainerButton({ label, value, href }: MaintainerButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        void openExternalUrl(href).catch((error: unknown) => {
          notify(`打开失败: ${error instanceof Error ? error.message : String(error)}`);
        });
      }}
      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {label} {value}
    </button>
  );
}

export function SettingsPage({ status, config, handleToggle, handleChange }: SettingsPageProps) {
  const [activePanel, setActivePanel] = useState<AdvancedPanelKey>(null);

  const handleNumberInput = <K extends keyof BoxConfig>(key: K, value: string) => {
    handleChange(key, (value === '' ? '' : Number(value)) as BoxConfig[K]);
  };

  return (
    <div className="px-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div>
        <SectionTitle title="Mihomo 面板入口" />
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between p-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">控制地址</span>
            <span className="text-sm font-mono text-slate-500 dark:text-slate-400 transition-colors">127.0.0.1:{config?.clash_api_port || 9090}</span>
          </div>
          <div className="flex items-center justify-between p-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">Secret 密钥</span>
            <span className="text-sm font-mono text-slate-500 dark:text-slate-400 transition-colors">{config?.clash_api_secret || '未设置'}</span>
          </div>

          <div className="pt-2">
            <a
              href={`https://yacd.metacubex.one/#/setup?hostname=127.0.0.1&port=${config?.clash_api_port || 9090}&secret=${config?.clash_api_secret || ''}&https=false`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-50 py-3 text-sm font-bold text-indigo-600 shadow-sm transition-all hover:bg-indigo-100 active:scale-95 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
            >
              <ExternalLink size={16} />
              <span>打开 YACD 面板</span>
            </a>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle title="协议细节" />
        <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <SwitchRow label="代理 TCP" checked={config?.PROXY_TCP === 1} onChange={(value: boolean) => handleToggle('PROXY_TCP', value)} border={true} />
          <SwitchRow label="代理 UDP" checked={config?.PROXY_UDP === 1} onChange={(value: boolean) => handleToggle('PROXY_UDP', value)} border={true} />
          <SelectRow label="IPv6 模式" value={String(config?.PROXY_IPV6 ?? 0)} options={IPV6_MODE_OPTIONS} onChange={(value: string) => handleChange('PROXY_IPV6', parseInt(value, 10))} border={false} />
        </div>
      </div>

      <div>
        <SectionTitle title="底层过滤与权限" />
        <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <SelectRow label="DNS劫持模式" value={config?.DNS_HIJACK_ENABLE?.toString() || '0'} options={[{ l: '禁用', v: '0' }, { l: 'TPROXY', v: '1' }, { l: 'REDIRECT', v: '2' }]} onChange={(value: string) => handleChange('DNS_HIJACK_ENABLE', parseInt(value, 10))} border={true} />
          <SwitchRow label="绕过大陆 IP" sub="系统级直连，需内核支持 ipset" checked={config?.BYPASS_CN_IP === 1} onChange={(value: boolean) => handleToggle('BYPASS_CN_IP', value)} border={true} />
          <SwitchRow label="性能模式" sub="减少重复匹配，兼容性差可关闭" checked={config?.PERFORMANCE_MODE === 1} onChange={(value: boolean) => handleToggle('PERFORMANCE_MODE', value)} border={true} />
          <SwitchRow label="强制 Mark 绕过" sub="带标记流量直接放行，减少回环" checked={config?.FORCE_MARK_BYPASS === 1} onChange={(value: boolean) => handleToggle('FORCE_MARK_BYPASS', value)} border={true} />
          <SwitchRow label="启用 MAC 过滤" sub="需配合热点代理使用" checked={config?.MAC_FILTER_ENABLE === 1} onChange={(value: boolean) => handleToggle('MAC_FILTER_ENABLE', value)} border={false} />
          {config?.MAC_FILTER_ENABLE === 1 && (
            <div className="animate-in fade-in zoom-in-95 px-3 pb-3 pt-0">
              <div className="mb-3">
                <SelectRow label="MAC 过滤模式" value={config?.MAC_PROXY_MODE || 'blacklist'} options={MAC_PROXY_MODE_OPTIONS} onChange={(value: string) => handleChange('MAC_PROXY_MODE', value as BoxConfig['MAC_PROXY_MODE'])} />
              </div>
              <textarea
                value={config?.PROXY_MACS_LIST || ''}
                onChange={event => handleChange('PROXY_MACS_LIST', event.target.value)}
                onFocus={event => ensureFieldVisible(event.currentTarget)}
                className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:border-indigo-500"
                placeholder={config?.MAC_PROXY_MODE === 'whitelist' ? '允许代理的 MAC，每行一个\nAA:BB:CC:DD:EE:FF' : '绕过代理的 MAC，每行一个\nAA:BB:CC:DD:EE:FF'}
              />
              <textarea
                value={config?.BYPASS_MACS_LIST || ''}
                onChange={event => handleChange('BYPASS_MACS_LIST', event.target.value)}
                onFocus={event => ensureFieldVisible(event.currentTarget)}
                className="mt-3 h-20 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:border-indigo-500"
                placeholder={config?.MAC_PROXY_MODE === 'whitelist' ? '绕过代理的 MAC，每行一个\n11:22:33:44:55:66' : '允许代理的 MAC，每行一个\n11:22:33:44:55:66'}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionTitle title="高级路由入口" />
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <SecondaryEntryRow
            icon={<Network size={18} />}
            title="端口与网络接口名"
            sub="配置代理端口、控制端口和常用网络接口"
            onClick={() => setActivePanel('network')}
          />
          <SecondaryEntryRow
            icon={<Route size={18} />}
            title="路由标记与热点子网"
            sub="配置路由标记、策略路由和热点网段"
            onClick={() => setActivePanel('routing')}
          />
          <SecondaryEntryRow
            icon={<Network size={18} />}
            title="附加接口规则"
            sub="补充额外的代理接口和绕过接口"
            onClick={() => setActivePanel('interfaces')}
          />
          <SecondaryEntryRow
            icon={<ListFilter size={18} />}
            title="自定义 IP 列表"
            sub="维护 IPv4 / IPv6 的代理与绕过列表"
            onClick={() => setActivePanel('ip-lists')}
          />
          <SecondaryEntryRow
            icon={<FolderCog size={18} />}
            title="CN IP 数据源"
            sub="设置大陆 IP 数据文件和更新地址"
            onClick={() => setActivePanel('cn-source')}
          />
          <SecondaryEntryRow
            icon={<Info size={18} />}
            title="关于与支持"
            sub="查看版本信息、项目地址和联系开发者方式"
            border={false}
            onClick={() => setActivePanel('about')}
          />
        </div>
      </div>

      {activePanel === 'routing' && (
        <FloatingPanel title="路由标记与热点子网" description="用于配置核心流量标记、策略路由编号，以及热点网络的 IPv4 和 IPv6 网段。" onClose={() => setActivePanel(null)}>
          <div className="space-y-4">
            <StackInput label="核心路由标记" value={config?.ROUTING_MARK || ''} onChange={value => handleChange('ROUTING_MARK', value)} placeholder="0x2333/0xffff" />
            <div className="grid gap-4 md:grid-cols-2">
              <StackInput label="IPv4 标记值" value={String(config?.MARK_VALUE ?? '')} onChange={value => handleNumberInput('MARK_VALUE', value)} placeholder="25" />
              <StackInput label="IPv6 标记值" value={String(config?.MARK_VALUE6 ?? '')} onChange={value => handleNumberInput('MARK_VALUE6', value)} placeholder="25" />
            </div>
            <StackInput label="路由表编号" value={String(config?.TABLE_ID ?? '')} onChange={value => handleNumberInput('TABLE_ID', value)} placeholder="100" />
            <div className="grid gap-4 md:grid-cols-2">
              <StackInput label="热点 IPv4 网段" value={config?.HOTSPOT_SUBNET_IPV4 || ''} onChange={value => handleChange('HOTSPOT_SUBNET_IPV4', value)} placeholder="192.168.43.0/24" />
              <StackInput label="热点 IPv6 网段" value={config?.HOTSPOT_SUBNET_IPV6 || ''} onChange={value => handleChange('HOTSPOT_SUBNET_IPV6', value)} placeholder="fd00::/64" />
            </div>
          </div>
        </FloatingPanel>
      )}

      {activePanel === 'interfaces' && (
        <FloatingPanel title="附加接口规则" description="用于补充默认接口名之外的设备接口。多个接口可按空格或换行分隔，适用于 rmnet、ccmni、rndis 等额外场景。" onClose={() => setActivePanel(null)}>
          <div className="space-y-4">
            <StackTextarea
              label="额外代理接口"
              value={config?.OTHER_PROXY_INTERFACES || ''}
              onChange={value => handleChange('OTHER_PROXY_INTERFACES', value)}
              placeholder={'每行一个或用空格分隔\nrmnet_data1\nccmni1'}
              sub={`${countEntries(config?.OTHER_PROXY_INTERFACES)} 项`}
            />
            <StackTextarea
              label="额外绕过接口"
              value={config?.OTHER_BYPASS_INTERFACES || ''}
              onChange={value => handleChange('OTHER_BYPASS_INTERFACES', value)}
              placeholder={'每行一个或用空格分隔\nrndis0'}
              sub={`${countEntries(config?.OTHER_BYPASS_INTERFACES)} 项`}
            />
          </div>
        </FloatingPanel>
      )}

      {activePanel === 'ip-lists' && (
        <FloatingPanel title="自定义 IP 列表" description="用于维护强制绕过和强制代理的 IPv4 / IPv6 规则。建议一行一个 CIDR、IP 或网段。" onClose={() => setActivePanel(null)}>
          <div className="space-y-4">
            <StackTextarea
              label="IPv4 绕过列表"
              value={formatListForEditor(config?.BYPASS_IPv4_LIST)}
              onChange={value => handleChange('BYPASS_IPv4_LIST', normalizeListForStorage(value))}
              placeholder={'192.168.0.0/16\n10.0.0.0/8'}
              sub={`${countEntries(config?.BYPASS_IPv4_LIST)} 条`}
            />
            <StackTextarea
              label="IPv6 绕过列表"
              value={formatListForEditor(config?.BYPASS_IPv6_LIST)}
              onChange={value => handleChange('BYPASS_IPv6_LIST', normalizeListForStorage(value))}
              placeholder={'fc00::/7\nfe80::/10'}
              sub={`${countEntries(config?.BYPASS_IPv6_LIST)} 条`}
            />
            <StackTextarea
              label="IPv4 强制代理列表"
              value={formatListForEditor(config?.PROXY_IPv4_LIST)}
              onChange={value => handleChange('PROXY_IPv4_LIST', normalizeListForStorage(value))}
              placeholder={'1.1.1.1\n8.8.8.0/24'}
              sub={`${countEntries(config?.PROXY_IPv4_LIST)} 条`}
            />
            <StackTextarea
              label="IPv6 强制代理列表"
              value={formatListForEditor(config?.PROXY_IPv6_LIST)}
              onChange={value => handleChange('PROXY_IPv6_LIST', normalizeListForStorage(value))}
              placeholder={'2001:4860:4860::8888'}
              sub={`${countEntries(config?.PROXY_IPv6_LIST)} 条`}
            />
          </div>
        </FloatingPanel>
      )}

      {activePanel === 'cn-source' && (
        <FloatingPanel title="CN IP 数据源" description="用于设置大陆 IP 数据文件名和更新地址，方便切换镜像源或使用自定义数据。" onClose={() => setActivePanel(null)}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <StackInput label="IPv4 数据文件名" value={config?.CN_IP_FILE || ''} onChange={value => handleChange('CN_IP_FILE', value)} placeholder="cn_ip.txt" />
              <StackInput label="IPv6 数据文件名" value={config?.CN_IPV6_FILE || ''} onChange={value => handleChange('CN_IPV6_FILE', value)} placeholder="cn_ipv6.txt" />
            </div>
            <StackInput label="IPv4 更新地址" value={config?.CN_IP_URL || ''} onChange={value => handleChange('CN_IP_URL', value)} placeholder="https://..." />
            <StackInput label="IPv6 更新地址" value={config?.CN_IPV6_URL || ''} onChange={value => handleChange('CN_IPV6_URL', value)} placeholder="https://..." />
          </div>
        </FloatingPanel>
      )}

      {activePanel === 'network' && (
        <FloatingPanel title="端口与网络接口名" description="用于调整透明代理监听端口、面板控制端口，以及常见网络接口名称。" onClose={() => setActivePanel(null)}>
          <div className="space-y-4">
            <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">端口</div>
              <InputRow label="TCP 代理端口" value={config?.PROXY_TCP_PORT || ''} onChange={(value: string) => handleChange('PROXY_TCP_PORT', value)} />
              <InputRow label="UDP 代理端口" value={config?.PROXY_UDP_PORT || ''} onChange={(value: string) => handleChange('PROXY_UDP_PORT', value)} />
              <InputRow label="DNS 监听端口" value={config?.DNS_PORT || ''} onChange={(value: string) => handleChange('DNS_PORT', value)} />
              <InputRow label="API 控制端口" value={String(config?.clash_api_port || '')} onChange={(value: string) => handleChange('clash_api_port', value)} />
              <InputRow label="API 控制密钥" value={config?.clash_api_secret || ''} onChange={(value: string) => handleChange('clash_api_secret', value)} />
            </div>
            <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">接口名</div>
              <InputRow label="Mobile 接口名" value={config?.MOBILE_INTERFACE || ''} onChange={(value: string) => handleChange('MOBILE_INTERFACE', value)} />
              <InputRow label="WiFi 接口名" value={config?.WIFI_INTERFACE || ''} onChange={(value: string) => handleChange('WIFI_INTERFACE', value)} />
              <InputRow label="热点接口名" value={config?.HOTSPOT_INTERFACE || ''} onChange={(value: string) => handleChange('HOTSPOT_INTERFACE', value)} />
              <InputRow label="USB 接口名" value={config?.USB_INTERFACE || ''} onChange={(value: string) => handleChange('USB_INTERFACE', value)} />
            </div>
          </div>
        </FloatingPanel>
      )}

      {activePanel === 'about' && (
        <FloatingPanel title="关于与支持" description="" onClose={() => setActivePanel(null)}>
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">box4magisk</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use sing-box, clash, v2ray, xray tunnel proxy on Android devices.</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <MaintainerButton label="核心维护" value={CORE_MAINTAINER} href={CORE_MAINTAINER_URL} />
                <MaintainerButton label="前端维护" value={FRONTEND_MAINTAINER} href={FRONTEND_MAINTAINER_URL} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">支持与反馈</div>
              <AboutLinkRow href={PROJECT_REPO} icon={<FolderGit size={18} />} title="项目主页" sub="GitHub 仓库与更新说明" />
              <AboutLinkRow href={WIKI_URL} icon={<BookOpen size={18} />} title="中文文档" sub="README_zh 与使用说明" />
              <AboutLinkRow href={ISSUE_TRACKER} icon={<TriangleAlert size={18} />} title="问题反馈" sub="提交 Bug、功能建议和兼容性反馈" />
              <AboutLinkRow href={UI_FEEDBACK_REPO} icon={<Mail size={18} />} title="UI 反馈入口" sub="WebUI 相关问题和交流反馈" />
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">当前信息</div>
              <AboutInfoRow label="核心维护" value={CORE_MAINTAINER} />
              <AboutInfoRow label="当前核心" value={status.bin_name || config.bin_name || '未知'} />
              <AboutInfoRow label="运行状态" value={status.running ? '运行中' : '未运行'} />
              <AboutInfoRow label="主配置文件" value={status.box_config_file || '/data/adb/box/scripts/box.config'} />
              <AboutInfoRow label="TPROXY 配置" value={status.tproxy_config_file || '/data/adb/box/scripts/tproxy.conf'} />
            </div>
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}
