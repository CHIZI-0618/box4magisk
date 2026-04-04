export interface ClashConfig {
  mode: 'rule' | 'global' | 'direct';
}

export interface Proxy {
  name: string;
  type: string;
  now?: string;
  all?: string[];
  history?: { time: string; delay: number }[];
  udp: boolean;
}

export interface ProxyProvider {
  name: string;
  type: string;
  vehicleType: string;
  updatedAt: string;
  proxies: { name: string; type: string }[];
  subscriptionInfo?: {
    Download: number;
    Upload: number;
    Total: number;
    Expire: number;
  };
}

export interface ClashMemory {
  inuse?: number;
  oslimit?: number;
  [key: string]: unknown;
}

export class ClashClient {
  private baseUrl: string;
  private secret: string;

  constructor(port: string, secret: string) {
    this.baseUrl = `http://127.0.0.1:${port}`;
    this.secret = secret;
  }

  private async request<T = any>(path: string, options: Omit<RequestInit, 'body'> & { body?: any } = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    if (this.secret) {
      headers.set('Authorization', `Bearer ${this.secret}`);
    }

    let body: any = options.body;
    if (body && typeof body === 'object' && !(body instanceof Blob) && !(body instanceof FormData)) {
      body = JSON.stringify(body);
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers, body });
    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Clash API error: ${error || response.status}`);
    }

    if (response.status === 204) return null as any;
    return response.json();
  }

  private async requestText(path: string, options: Omit<RequestInit, 'body'> & { body?: any } = {}): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    if (this.secret) {
      headers.set('Authorization', `Bearer ${this.secret}`);
    }

    let body: any = options.body;
    if (body && typeof body === 'object' && !(body instanceof Blob) && !(body instanceof FormData)) {
      body = JSON.stringify(body);
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers, body });
    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Clash API error: ${error || response.status}`);
    }

    return response.text();
  }

  async getConfig(): Promise<ClashConfig> {
    return this.request<ClashConfig>('/configs');
  }

  async getMemory(): Promise<ClashMemory> {
    const raw = await this.requestText('/memory');
    const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        return JSON.parse(lines[i]) as ClashMemory;
      } catch {
        // ignore invalid line and keep searching upward
      }
    }
    throw new Error('Clash API error: invalid memory payload');
  }

  async updateConfig(config: Partial<ClashConfig>): Promise<void> {
    await this.request('/configs', { method: 'PATCH', body: config });
  }

  async getProxies(): Promise<Record<string, Proxy>> {
    const data = await this.request<{ proxies: Record<string, Proxy> }>('/proxies');
    return data.proxies;
  }

  async selectProxy(groupName: string, proxyName: string): Promise<void> {
    await this.request(`/proxies/${encodeURIComponent(groupName)}`, {
      method: 'PUT',
      body: { name: proxyName },
    });
  }

  async getProviders(): Promise<Record<string, ProxyProvider>> {
    const data = await this.request<{ providers: Record<string, ProxyProvider> }>('/providers/proxies');
    return data.providers;
  }

  async updateProvider(name: string): Promise<void> {
    await this.request(`/providers/proxies/${encodeURIComponent(name)}`, { method: 'PUT' });
  }

  async healthCheckProvider(name: string): Promise<void> {
    await this.request(`/providers/proxies/${encodeURIComponent(name)}/healthcheck`);
  }

  async testLatency(name: string, url = 'http://www.gstatic.com/generate_204', timeout = 5000): Promise<number> {
    const data = await this.request<{ delay: number }>(
      `/proxies/${encodeURIComponent(name)}/delay?url=${encodeURIComponent(url)}&timeout=${timeout}`
    );
    return data.delay;
  }
}
