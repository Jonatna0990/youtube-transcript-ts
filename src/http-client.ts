import nodeFetch, { type RequestInit } from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
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

/**
 * HTTP client wrapper with proxy and cookie support.
 */
export class HttpClient {
  private readonly proxyConfig?: ProxyConfig;
  private readonly defaultHeaders: Record<string, string>;
  private readonly cookies: Map<string, { value: string; domain: string }> = new Map();
  private readonly agent?: HttpsProxyAgent<string>;

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

    // Set up proxy agent
    const proxyUrl = this.getProxyUrl();
    if (proxyUrl) {
      this.agent = new HttpsProxyAgent(proxyUrl);
    }
  }

  private getProxyUrl(): string | undefined {
    // First check if custom proxy config is provided
    if (this.proxyConfig) {
      const proxyDict = this.proxyConfig.toProxyDict();
      return proxyDict.https;
    }
    // Fall back to environment variables
    return process.env.HTTPS_PROXY || process.env.https_proxy ||
           process.env.HTTP_PROXY || process.env.http_proxy;
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
    const requestOptions: RequestInit = {
      method: 'GET',
      headers: this.getHeaders(options?.headers),
      agent: this.agent,
    };

    const response = await nodeFetch(url, requestOptions);

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
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(options?.headers),
      },
      body: JSON.stringify(body),
      agent: this.agent,
    };

    const response = await nodeFetch(url, requestOptions);

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
