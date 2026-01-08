import { describe, it, expect } from 'vitest';
import { GenericProxyConfig, WebshareProxyConfig } from '../proxies';
import { InvalidProxyConfig } from '../errors';

describe('GenericProxyConfig', () => {
  it('should create with both http and https URLs', () => {
    const config = new GenericProxyConfig({
      httpUrl: 'http://proxy:8080',
      httpsUrl: 'https://proxy:8443',
    });

    const dict = config.toProxyDict();
    expect(dict.http).toBe('http://proxy:8080');
    expect(dict.https).toBe('https://proxy:8443');
  });

  it('should use http URL for both when only http provided', () => {
    const config = new GenericProxyConfig({
      httpUrl: 'http://proxy:8080',
    });

    const dict = config.toProxyDict();
    expect(dict.http).toBe('http://proxy:8080');
    expect(dict.https).toBe('http://proxy:8080');
  });

  it('should use https URL for both when only https provided', () => {
    const config = new GenericProxyConfig({
      httpsUrl: 'https://proxy:8443',
    });

    const dict = config.toProxyDict();
    expect(dict.http).toBe('https://proxy:8443');
    expect(dict.https).toBe('https://proxy:8443');
  });

  it('should throw when no URLs provided', () => {
    expect(() => new GenericProxyConfig({})).toThrow(InvalidProxyConfig);
  });

  it('should have correct default properties', () => {
    const config = new GenericProxyConfig({ httpUrl: 'http://proxy' });

    expect(config.type).toBe('generic');
    expect(config.preventKeepingConnectionsAlive).toBe(false);
    expect(config.retriesWhenBlocked).toBe(0);
  });
});

describe('WebshareProxyConfig', () => {
  it('should create with username and password', () => {
    const config = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
    });

    expect(config.proxyUsername).toBe('user');
    expect(config.proxyPassword).toBe('pass');
  });

  it('should build correct URL', () => {
    const config = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
    });

    expect(config.url).toContain('user');
    expect(config.url).toContain('pass');
    expect(config.url).toContain('p.webshare.io');
    expect(config.url).toContain('-rotate');
  });

  it('should include location filters in URL', () => {
    const config = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
      filterIpLocations: ['us', 'de'],
    });

    expect(config.url).toContain('-US');
    expect(config.url).toContain('-DE');
  });

  it('should use custom domain and port', () => {
    const config = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
      domainName: 'custom.proxy.io',
      proxyPort: 8080,
    });

    expect(config.url).toContain('custom.proxy.io');
    expect(config.url).toContain(':8080');
  });

  it('should have correct default properties', () => {
    const config = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
    });

    expect(config.type).toBe('webshare');
    expect(config.preventKeepingConnectionsAlive).toBe(true);
    expect(config.retriesWhenBlocked).toBe(10);
  });

  it('should allow custom retries', () => {
    const config = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
      retriesWhenBlocked: 5,
    });

    expect(config.retriesWhenBlocked).toBe(5);
  });

  it('should return same URL for http and https', () => {
    const config = new WebshareProxyConfig({
      proxyUsername: 'user',
      proxyPassword: 'pass',
    });

    expect(config.httpUrl).toBe(config.httpsUrl);
    expect(config.httpUrl).toBe(config.url);
  });
});
