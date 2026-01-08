import { describe, it, expect } from 'vitest';
import {
  YouTubeTranscriptApiError,
  CouldNotRetrieveTranscript,
  VideoUnavailable,
  TranscriptsDisabled,
  NoTranscriptFound,
  InvalidVideoId,
  IpBlocked,
  RequestBlocked,
  AgeRestricted,
  NotTranslatable,
  InvalidProxyConfig,
} from '../errors';

describe('YouTubeTranscriptApiError', () => {
  it('should create base error', () => {
    const error = new YouTubeTranscriptApiError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('YouTubeTranscriptApiError');
  });
});

describe('CouldNotRetrieveTranscript', () => {
  it('should include video URL in message', () => {
    const error = new VideoUnavailable('abc123');
    expect(error.message).toContain('https://www.youtube.com/watch?v=abc123');
  });

  it('should store video ID', () => {
    const error = new VideoUnavailable('abc123');
    expect(error.videoId).toBe('abc123');
  });
});

describe('VideoUnavailable', () => {
  it('should have correct cause message', () => {
    const error = new VideoUnavailable('test');
    expect(error.message).toContain('no longer available');
  });
});

describe('TranscriptsDisabled', () => {
  it('should have correct cause message', () => {
    const error = new TranscriptsDisabled('test');
    expect(error.message).toContain('disabled');
  });
});

describe('InvalidVideoId', () => {
  it('should suggest using video ID instead of URL', () => {
    const error = new InvalidVideoId('https://youtube.com/watch?v=test');
    expect(error.message).toContain('NOT the url');
  });
});

describe('NoTranscriptFound', () => {
  it('should include requested languages', () => {
    const error = new NoTranscriptFound('test', ['de', 'fr'], 'Available: en');
    expect(error.message).toContain('de');
    expect(error.message).toContain('fr');
  });

  it('should include transcript data', () => {
    const error = new NoTranscriptFound('test', ['de'], 'Available transcripts: en, es');
    expect(error.message).toContain('Available transcripts');
  });
});

describe('IpBlocked', () => {
  it('should mention IP blocking', () => {
    const error = new IpBlocked('test');
    expect(error.message).toContain('blocking');
  });
});

describe('RequestBlocked', () => {
  it('should have different messages based on proxy config', () => {
    const error = new RequestBlocked('test');

    // Without proxy
    expect(error.message).toContain('proxies');

    // With generic proxy
    error.withProxyConfig({
      type: 'generic',
      toProxyDict: () => ({ http: '', https: '' }),
      preventKeepingConnectionsAlive: false,
      retriesWhenBlocked: 0,
    });
    expect(error.message).toContain('proxy');

    // With webshare proxy
    error.withProxyConfig({
      type: 'webshare',
      toProxyDict: () => ({ http: '', https: '' }),
      preventKeepingConnectionsAlive: true,
      retriesWhenBlocked: 10,
    });
    expect(error.message).toContain('Webshare');
  });
});

describe('AgeRestricted', () => {
  it('should mention age restriction', () => {
    const error = new AgeRestricted('test');
    expect(error.message).toContain('age-restricted');
  });
});

describe('NotTranslatable', () => {
  it('should mention translation', () => {
    const error = new NotTranslatable('test');
    expect(error.message).toContain('translatable');
  });
});

describe('InvalidProxyConfig', () => {
  it('should create with custom message', () => {
    const error = new InvalidProxyConfig('Missing URL');
    expect(error.message).toBe('Missing URL');
    expect(error.name).toBe('InvalidProxyConfig');
  });
});
