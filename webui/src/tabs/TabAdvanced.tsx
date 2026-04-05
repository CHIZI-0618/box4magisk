
import { ExternalLink } from 'lucide-react';
import { SectionTitle, SwitchRow, SelectRow, InputRow } from '@/components/ui';

export function TabAdvanced({ config, handleToggle, handleChange }: any) {
  return (
    <div className="px-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div>
        <SectionTitle title="Mihomo 面板入口" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors space-y-3">
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
              className="w-full flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm"
            >
              <ExternalLink size={16} />
              <span>打开 YACD 面板</span>
            </a>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle title="协议细节" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SwitchRow label="代理 TCP" checked={config?.PROXY_TCP === 1} onChange={(v: boolean) => handleToggle('PROXY_TCP', v)} border={true} />
          <SwitchRow label="代理 UDP" checked={config?.PROXY_UDP === 1} onChange={(v: boolean) => handleToggle('PROXY_UDP', v)} border={true} />
          <SwitchRow label="代理 IPv6" sub="需内核支持 IP6_NF_NAT" checked={config?.PROXY_IPV6 === 1} onChange={(v: boolean) => handleToggle('PROXY_IPV6', v)} border={false} />
        </div>
      </div>

      <div>
        <SectionTitle title="底层过滤与权限" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SelectRow label="DNS劫持模式" value={config?.DNS_HIJACK_ENABLE?.toString() || '0'} options={[{ l: '禁用', v: '0' }, { l: 'TPROXY', v: '1' }, { l: 'REDIRECT', v: '2' }]} onChange={(v: string) => handleChange('DNS_HIJACK_ENABLE', parseInt(v))} border={true} />
          <SwitchRow label="绕过大陆 IP" sub="系统级直连，需内核支持 ipset" checked={config?.BYPASS_CN_IP === 1} onChange={(v: boolean) => handleToggle('BYPASS_CN_IP', v)} border={true} />
          <SwitchRow label="启用 MAC 过滤" sub="需配合热点代理使用" checked={config?.MAC_FILTER_ENABLE === 1} onChange={(v: boolean) => handleToggle('MAC_FILTER_ENABLE', v)} border={false} />
          {config?.MAC_FILTER_ENABLE === 1 && (
            <div className="px-3 pb-3 pt-0 animate-in fade-in zoom-in-95">
              <textarea
                value={config?.PROXY_MACS_LIST || ''}
                onChange={(e) => handleChange('PROXY_MACS_LIST', e.target.value)}
                className="w-full h-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-mono outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
                placeholder="在此输入 MAC，每行一个&#10;AA:BB:CC:DD:EE:FF"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionTitle title="端口与网络接口名" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 transition-colors">
          <InputRow label="TCP 代理端口" value={config?.PROXY_TCP_PORT || ''} onChange={(v: string) => handleChange('PROXY_TCP_PORT', v)} />
          <InputRow label="UDP 代理端口" value={config?.PROXY_UDP_PORT || ''} onChange={(v: string) => handleChange('PROXY_UDP_PORT', v)} />
          <InputRow label="DNS 监听端口" value={config?.DNS_PORT || ''} onChange={(v: string) => handleChange('DNS_PORT', v)} />
          <div className="h-px bg-slate-100 dark:bg-slate-800/50 my-2 transition-colors" />
          <InputRow label="API 控制端口" value={config?.clash_api_port || ''} onChange={(v: string) => handleChange('clash_api_port', v)} />
          <InputRow label="API 控制密钥" value={config?.clash_api_secret || ''} onChange={(v: string) => handleChange('clash_api_secret', v)} />
          <div className="h-px bg-slate-100 dark:bg-slate-800/50 my-2 transition-colors" />
          <InputRow label="Mobile 接口名" value={config?.MOBILE_INTERFACE || ''} onChange={(v: string) => handleChange('MOBILE_INTERFACE', v)} />
          <InputRow label="WiFi 接口名" value={config?.WIFI_INTERFACE || ''} onChange={(v: string) => handleChange('WIFI_INTERFACE', v)} />
          <InputRow label="热点接口名" value={config?.HOTSPOT_INTERFACE || ''} onChange={(v: string) => handleChange('HOTSPOT_INTERFACE', v)} />
          <InputRow label="USB 接口名" value={config?.USB_INTERFACE || ''} onChange={(v: string) => handleChange('USB_INTERFACE', v)} />
        </div>
      </div>

    </div>
  );
}
