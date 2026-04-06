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

type ClashRequestOptions = Omit<RequestInit, 'body' | 'signal'> & {
  body?: any;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class ClashClient {
  private baseUrl: string;
  private secret: string;

  constructor(port: string, secret: string) {
    this.baseUrl = `http://127.0.0.1:${port}`;
    this.secret = secret;
  }

  private createAbortSignal(signal?: AbortSignal, timeoutMs = 10000): AbortSignal | undefined {
    if (typeof AbortController === 'undefined') {
      return signal;
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const abortWithReason = (reason?: any) => {
      if (!controller.signal.aborted) {
        controller.abort(reason);
      }
    };

    if (signal) {
      if (signal.aborted) {
        abortWithReason(signal.reason);
      } else {
        signal.addEventListener('abort', () => abortWithReason(signal.reason), { once: true });
      }
    }

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        abortWithReason(new Error('Clash API request timeout'));
      }, timeoutMs);
      controller.signal.addEventListener('abort', () => {
        if (timeoutId) clearTimeout(timeoutId);
      }, { once: true });
    }

    return controller.signal;
  }

  private async request<T = any>(path: string, options: ClashRequestOptions = {}): Promise<T> {
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

    const signal = this.createAbortSignal(options.signal, options.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers, body, signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const reason = signal?.reason;
        if (reason instanceof Error && reason.message) {
          throw reason;
        }
        throw new Error('Clash API request aborted');
      }
      throw error;
    }

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Clash API error: ${error || response.status}`);
    }

    if (response.status === 204) return null as any;
    return response.json();
  }

  async getConfig(options?: ClashRequestOptions): Promise<ClashConfig> {
    return this.request<ClashConfig>('/configs', options);
  }

  async getMemory(options?: ClashRequestOptions): Promise<ClashMemory> {
    const url = `${this.baseUrl}/memory`;
    const headers = new Headers(options?.headers || {});
    if (this.secret) {
      headers.set('Authorization', `Bearer ${this.secret}`);
    }

    const signal = this.createAbortSignal(options?.signal, options?.timeoutMs ?? 3000);
    const response = await fetch(url, { ...options, headers, signal });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Clash API error: ${error || response.status}`);
    }

    if (!response.body) {
      throw new Error('Clash API error: memory stream unavailable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let latest: ClashMemory | null = null;
    const startedAt = Date.now();
    const collectWindowMs = 350;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            latest = JSON.parse(trimmed) as ClashMemory;
          } catch {
            // ignore invalid chunks and keep reading
          }
        }

        if (latest && Date.now() - startedAt >= collectWindowMs) {
          return latest;
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // ignore reader cancellation errors
      }
    }

    const tail = buffer.trim();
    if (tail) {
      try {
        return JSON.parse(tail) as ClashMemory;
      } catch {
        // ignore trailing invalid payload
      }
    }

    throw new Error('Clash API error: invalid memory payload');
  }

  async updateConfig(config: Partial<ClashConfig>, options?: ClashRequestOptions): Promise<void> {
    await this.request('/configs', { ...options, method: 'PATCH', body: config });
  }

  async getProxies(options?: ClashRequestOptions): Promise<Record<string, Proxy>> {
    const data = await this.request<{ proxies: Record<string, Proxy> }>('/proxies', options);
    return data.proxies;
  }

  async selectProxy(groupName: string, proxyName: string, options?: ClashRequestOptions): Promise<void> {
    await this.request(`/proxies/${encodeURIComponent(groupName)}`, {
      ...options,
      method: 'PUT',
      body: { name: proxyName },
    });
  }

  async getProviders(options?: ClashRequestOptions): Promise<Record<string, ProxyProvider>> {
    const data = await this.request<{ providers: Record<string, ProxyProvider> }>('/providers/proxies', options);
    return data.providers;
  }

  async updateProvider(name: string, options?: ClashRequestOptions): Promise<void> {
    await this.request(`/providers/proxies/${encodeURIComponent(name)}`, { ...options, method: 'PUT' });
  }

  async healthCheckProvider(name: string, options?: ClashRequestOptions): Promise<void> {
    await this.request(`/providers/proxies/${encodeURIComponent(name)}/healthcheck`, options);
  }

  async testLatency(name: string, url = 'http://www.gstatic.com/generate_204', timeout = 5000, options?: ClashRequestOptions): Promise<number> {
    const data = await this.request<{ delay: number }>(
      `/proxies/${encodeURIComponent(name)}/delay?url=${encodeURIComponent(url)}&timeout=${timeout}`,
      options
    );
    return data.delay;
  }
}
