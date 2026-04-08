import { exec, getPackagesInfo, listPackages, toast } from "kernelsu";
import type { AppInfo } from '@/types/box';

const BRIDGE_RELATIVE_PATH = "/data/adb/box/scripts/box.webui";

function shellQuote(value: string) {
  return `'${value.split("'").join(`'\\''`)}'`;
}

function extractJson(stdout: string, stderr: string) {
  const source = [stdout, stderr].filter(Boolean).join("\n").trim();
  const lines = source.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const start = line.indexOf("{");
    const end = line.lastIndexOf("}");
    if (start === -1 || Math.max(start, end) === -1 || end <= start) continue;
    const candidate = line.slice(start, end + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch { }
  }
  throw new Error(source || "box.webui returned no JSON payload");
}

async function runApi<T = any>(args: string[]): Promise<T> {
  if (typeof exec !== "function") {
    throw new Error("KernelSU bridge unavailable");
  }
  const command = `${shellQuote(BRIDGE_RELATIVE_PATH)} ${args.map(shellQuote).join(" ")}`;
  const result = await exec(command);
  const payload = JSON.parse(extractJson(String(result.stdout ?? ""), String(result.stderr ?? ""))) as any;
  if (!payload.ok) {
    throw new Error(payload.error || `${payload.command} failed`);
  }
  return payload.data as T;
}

export const boxBridge = {
  status: () => runApi(["status"]),
  getConfig: () => runApi(["get-config"]),
  capabilities: () => runApi(["capabilities"]),
  setNumber: (key: string, value: number | string) => runApi(["set-number", key, String(value)]),
  toggle: (key: string, value: 0 | 1) => runApi(["toggle", key, String(value)]),
  setConfig: (key: string, value: string) => runApi(["set-config", key, value]),
  service: (action: "start" | "stop" | "restart" | "status") => runApi(["service", action]),
  tproxy: (action: "start" | "stop" | "restart" | "status") => runApi(["tproxy", action]),
  manualMode: (action: "status" | "enable" | "disable") => runApi(["manual-mode", action]),
  checkLog: (lines: number = 80) => runApi(["check-log", String(lines)]),
  apps: () => runApi(["apps"]),
  setApps: (mode: "whitelist" | "blacklist" | "disable", value = "") => runApi(["set-apps", mode, value]),
  mihomoPanel: () => runApi(["mihomo-panel-url"]),
  // mihomoSubscriptions: () => runApi(["mihomo-subscriptions"]),
  // addMihomoSubscription: (name: string, url: string) => runApi(["mihomo-subscription-add", name, url]),
  // updateMihomoSubscription: (currentName: string, nextName: string, url: string) =>
  //   runApi(["mihomo-subscription-update", currentName, nextName, url]),
  // removeMihomoSubscription: (name: string) => runApi(["mihomo-subscription-remove", name]),
};

export async function openExternalUrl(url: string) {
  if (typeof exec !== 'function') {
    throw new Error('KernelSU bridge unavailable');
  }
  const command = `am start -a android.intent.action.VIEW -d ${shellQuote(url)}`;
  const result = await exec(command);
  const stderr = String(result.stderr ?? '').trim();
  if (stderr && !/Starting: Intent/i.test(stderr)) {
    throw new Error(stderr);
  }
}

export function discoverPackages(): AppInfo[] {
  try {
    const pkgs = listPackages?.("all");
    if (!Array.isArray(pkgs)) return [];
    const validPkgs = pkgs.filter(v => typeof v === 'string' && v.trim().length > 0);
    const rows = getPackagesInfo?.(validPkgs) as Array<Partial<AppInfo> & { packageName?: string }>;
    if (!Array.isArray(rows)) return [];

    return rows.filter((entry): entry is Partial<AppInfo> & { packageName: string } => typeof entry === 'object' && entry !== null && typeof entry.packageName === 'string')
      .map(entry => ({
        packageName: entry.packageName,
        appLabel: (entry.appLabel?.trim() || entry.packageName),
        isSystem: Boolean(entry.isSystem),
      }))
      .sort((a, b) => {
        if (a.isSystem !== b.isSystem) return Number(a.isSystem) - Number(b.isSystem);
        return a.appLabel.localeCompare(b.appLabel, "zh-CN");
      });
  } catch {
    return [];
  }
}

export function notify(msg: string) {
  try { toast?.(msg); } catch { /* ignore */ }
}
