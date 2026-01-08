import type { ProxyConfig } from './proxies';

export interface HttpClientOptions {
  proxyConfig?: ProxyConfig;
  headers?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

// Dynamic import for proxy agent (only when needed)
let HttpsProxyAgent: any = null;

async function getProxyAgent(proxyUrl: string): Promise<any> {
  if (!HttpsProxyAgent) {
    const module = await import('https-proxy-agent');
    HttpsProxyAgent = module.HttpsProxyAgent;
  }
  return new HttpsProxyAgent(proxyUrl);
}

/**
 * HTTP client wrapper with proxy and cookie support.
 */
export class HttpClient {
  private readonly proxyConfig?: ProxyConfig;
  private readonly defaultHeaders: Record<string, string>;
  private readonly cookies: Map<string, { value: string; domain: string }> = new Map();
  private agent?: any;
  private proxyUrl?: string;

  constructor(options: HttpClientOptions = {}) {
    this.proxyConfig = options.proxyConfig;
    this.defaultHeaders = {
      'Accept-Language': 'en-US',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options.headers,
    };

    if (this.proxyConfig?.preventKeepingConnectionsAlive) {
      this.defaultHeaders['Connection'] = 'close';
    }

    // Get proxy URL for later use
    this.proxyUrl = this.getProxyUrl();
  }

  private getProxyUrl(): string | undefined {
    // First check if custom proxy config is provided
    if (this.proxyConfig) {
      const proxyDict = this.proxyConfig.toProxyDict();
      return proxyDict.https;
    }
    // Fall back to environment variables
    const env = typeof process !== 'undefined' ? process.env : {};
    return env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy;
  }

  private async getAgent(): Promise<any> {
    if (this.proxyUrl && !this.agent) {
      this.agent = await getProxyAgent(this.proxyUrl);
    }
    return this.agent;
  }

  setCookie(name: string, value: string, domain: string): void {
    this.cookies.set(name, { value, domain });
  }

  private getCookieHeader(): string | undefined {
    if (this.cookies.size === 0) return undefined;

    const cookiePairs: string[] = [];
    for (const [name, { value }] of this.cookies) {
      cookiePairs.push(`${name}=${value}`);
    }
    return cookiePairs.join('; ');
  }

  private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...this.defaultHeaders, ...additionalHeaders };
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    return headers;
  }

  async get(url: string, options?: { headers?: Record<string, string> }): Promise<HttpResponse> {
    const agent = await this.getAgent();

    // Use node-fetch for proxy support, native fetch otherwise
    if (agent) {
      const nodeFetch = (await import('node-fetch')).default;
      const response = await nodeFetch(url, {
        method: 'GET',
        headers: this.getHeaders(options?.headers),
        agent,
      });
      return {
        status: response.status,
        statusText: response.statusText,
        text: () => response.text(),
        json: <T>() => response.json() as Promise<T>,
      };
    }

    // Use native fetch when no proxy
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(options?.headers),
    });

    return {
      status: response.status,
      statusText: response.statusText,
      text: () => response.text(),
      json: <T>() => response.json() as Promise<T>,
    };
  }

  async post(
    url: string,
    body: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<HttpResponse> {
    const agent = await this.getAgent();

    // Use node-fetch for proxy support, native fetch otherwise
    if (agent) {
      const nodeFetch = (await import('node-fetch')).default;
      const response = await nodeFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(options?.headers),
        },
        body: JSON.stringify(body),
        agent,
      });
      return {
        status: response.status,
        statusText: response.statusText,
        text: () => response.text(),
        json: <T>() => response.json() as Promise<T>,
      };
    }

    // Use native fetch when no proxy
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(options?.headers),
      },
      body: JSON.stringify(body),
    });

    return {
      status: response.status,
      statusText: response.statusText,
      text: () => response.text(),
      json: <T>() => response.json() as Promise<T>,
    };
  }

  get retriesWhenBlocked(): number {
    return this.proxyConfig?.retriesWhenBlocked ?? 0;
  }

  getProxyConfig(): ProxyConfig | undefined {
    return this.proxyConfig;
  }
}
