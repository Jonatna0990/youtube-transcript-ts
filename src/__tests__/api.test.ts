import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeTranscriptApi } from '../api';
import { FetchedTranscript, TranscriptList, Transcript } from '../transcripts';

// Mock the http-client module
vi.mock('../http-client', () => ({
  HttpClient: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
    setCookie: vi.fn(),
    retriesWhenBlocked: 0,
    getProxyConfig: vi.fn(),
  })),
}));

describe('YouTubeTranscriptApi', () => {
  let api: YouTubeTranscriptApi;

  beforeEach(() => {
    api = new YouTubeTranscriptApi();
  });

  describe('constructor', () => {
    it('should create an instance without options', () => {
      const api = new YouTubeTranscriptApi();
      expect(api).toBeInstanceOf(YouTubeTranscriptApi);
    });

    it('should create an instance with proxy config', () => {
      const api = new YouTubeTranscriptApi({
        proxyConfig: {
          type: 'generic',
          toProxyDict: () => ({ http: 'http://proxy', https: 'https://proxy' }),
          preventKeepingConnectionsAlive: false,
          retriesWhenBlocked: 0,
        },
      });
      expect(api).toBeInstanceOf(YouTubeTranscriptApi);
    });
  });
});

describe('FetchedTranscript', () => {
  const mockSnippets = [
    { text: 'Hello', start: 0, duration: 1 },
    { text: 'World', start: 1, duration: 1 },
    { text: 'Test', start: 2, duration: 1 },
  ];

  const transcript = new FetchedTranscript(
    mockSnippets,
    'test123',
    'English',
    'en',
    false
  );

  it('should store video metadata', () => {
    expect(transcript.videoId).toBe('test123');
    expect(transcript.language).toBe('English');
    expect(transcript.languageCode).toBe('en');
    expect(transcript.isGenerated).toBe(false);
  });

  it('should return correct length', () => {
    expect(transcript.length).toBe(3);
  });

  it('should be iterable', () => {
    const texts = [...transcript].map((s) => s.text);
    expect(texts).toEqual(['Hello', 'World', 'Test']);
  });

  it('should support index access via get()', () => {
    expect(transcript.get(0).text).toBe('Hello');
    expect(transcript.get(2).text).toBe('Test');
  });

  it('should convert to raw data', () => {
    const raw = transcript.toRawData();
    expect(raw).toEqual(mockSnippets);
  });
});
