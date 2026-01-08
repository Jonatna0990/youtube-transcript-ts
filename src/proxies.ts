import { InvalidProxyConfig } from './errors';
import type { ProxyConfigDict } from './types';

/**
 * Base interface for all proxy configurations.
 */
export interface ProxyConfig {
  /** Type identifier for the proxy config */
  type: 'generic' | 'webshare';
  /** Convert to proxy URLs dictionary */
  toProxyDict(): ProxyConfigDict;
  /** Whether to prevent keeping TCP connections alive */
  preventKeepingConnectionsAlive: boolean;
  /** Number of retries when blocked */
  retriesWhenBlocked: number;
}

export interface GenericProxyConfigOptions {
  httpUrl?: string;
  httpsUrl?: string;
}

/**
 * Generic proxy configuration for HTTP/HTTPS proxies.
 *
 * If only an HTTP or HTTPS proxy is provided, it will be used for both types.
 */
export class GenericProxyConfig implements ProxyConfig {
  public readonly type = 'generic' as const;
  public readonly httpUrl?: string;
  public readonly httpsUrl?: string;

  constructor(options: GenericProxyConfigOptions) {
    const { httpUrl, httpsUrl } = options;

    if (!httpUrl && !httpsUrl) {
      throw new InvalidProxyConfig(
        'GenericProxyConfig requires you to define at least one of the two: http or https'
      );
    }

    this.httpUrl = httpUrl;
    this.httpsUrl = httpsUrl;
  }

  toProxyDict(): ProxyConfigDict {
    return {
      http: this.httpUrl || this.httpsUrl!,
      https: this.httpsUrl || this.httpUrl!,
    };
  }

  get preventKeepingConnectionsAlive(): boolean {
    return false;
  }

  get retriesWhenBlocked(): number {
    return 0;
  }
}

export interface WebshareProxyConfigOptions {
  proxyUsername: string;
  proxyPassword: string;
  filterIpLocations?: string[];
  retriesWhenBlocked?: number;
  domainName?: string;
  proxyPort?: number;
}

/**
 * Webshare proxy configuration for rotating residential proxies.
 *
 * Webshare is a provider offering rotating residential proxies, which is the
 * most reliable way to work around being blocked by YouTube.
 *
 * @see https://www.webshare.io/?referral_code=w0xno53eb50g
 */
export class WebshareProxyConfig implements ProxyConfig {
  public readonly type = 'webshare' as const;

  private static readonly DEFAULT_DOMAIN_NAME = 'p.webshare.io';
  private static readonly DEFAULT_PORT = 80;

  public readonly proxyUsername: string;
  public readonly proxyPassword: string;
  public readonly domainName: string;
  public readonly proxyPort: number;
  private readonly _filterIpLocations: string[];
  private readonly _retriesWhenBlocked: number;

  constructor(options: WebshareProxyConfigOptions) {
    this.proxyUsername = options.proxyUsername;
    this.proxyPassword = options.proxyPassword;
    this.domainName = options.domainName ?? WebshareProxyConfig.DEFAULT_DOMAIN_NAME;
    this.proxyPort = options.proxyPort ?? WebshareProxyConfig.DEFAULT_PORT;
    this._filterIpLocations = options.filterIpLocations ?? [];
    this._retriesWhenBlocked = options.retriesWhenBlocked ?? 10;
  }

  get url(): string {
    const locationCodes = this._filterIpLocations
      .map((code) => `-${code.toUpperCase()}`)
      .join('');

    return (
      `http://${this.proxyUsername}${locationCodes}-rotate:${this.proxyPassword}` +
      `@${this.domainName}:${this.proxyPort}/`
    );
  }

  get httpUrl(): string {
    return this.url;
  }

  get httpsUrl(): string {
    return this.url;
  }

  toProxyDict(): ProxyConfigDict {
    return {
      http: this.url,
      https: this.url,
    };
  }

  get preventKeepingConnectionsAlive(): boolean {
    return true;
  }

  get retriesWhenBlocked(): number {
    return this._retriesWhenBlocked;
  }
}
