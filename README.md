# YouTube Transcript API

A TypeScript library for fetching YouTube video transcripts. No browser required, no API keys needed.

## Features

- Fetch transcripts from any YouTube video
- Support for multiple languages
- Auto-generated and manually created subtitles
- Translation support
- Multiple output formats (JSON, SRT, WebVTT, plain text)
- Proxy support for bypassing IP blocks
- Full TypeScript support with type definitions

## Installation

```bash
npm install youtube-transcript-api
```

## Quick Start

```typescript
import { YouTubeTranscriptApi } from 'youtube-transcript-api';

const api = new YouTubeTranscriptApi();

// Get transcript
const transcript = await api.fetch('dQw4w9WgXcQ');

for (const snippet of transcript) {
  console.log(`[${snippet.start}s] ${snippet.text}`);
}
```

## API Reference

### YouTubeTranscriptApi

Main class for fetching transcripts.

#### Constructor

```typescript
const api = new YouTubeTranscriptApi(options?: {
  proxyConfig?: ProxyConfig;
});
```

#### Methods

##### `fetch(videoId, options?)`

Fetch a transcript for a video.

```typescript
const transcript = await api.fetch('VIDEO_ID', {
  languages: ['en', 'de'],      // Language priority (default: ['en'])
  preserveFormatting: false     // Keep HTML formatting (default: false)
});
```

##### `list(videoId)`

Get all available transcripts for a video.

```typescript
const transcriptList = await api.list('VIDEO_ID');

for (const transcript of transcriptList) {
  console.log(transcript.language, transcript.languageCode, transcript.isGenerated);
}

// Find specific transcript
const transcript = transcriptList.findTranscript(['de', 'en']);
const manual = transcriptList.findManuallyCreatedTranscript(['en']);
const generated = transcriptList.findGeneratedTranscript(['en']);
```

##### `getInfo(videoId)`

Get information about available subtitles.

```typescript
const info = await api.getInfo('VIDEO_ID');

console.log(info.hasSubtitles);  // true
console.log(info.languages);     // [{ code: 'en', name: 'English', isGenerated: false }, ...]
```

##### `getSubtitles(videoId, lang?)`

Get subtitles with timestamps.

```typescript
const subtitles = await api.getSubtitles('VIDEO_ID', 'en');

// Returns: [{ text: 'Hello', start: 0, duration: 1.5 }, ...]
```

##### `getText(videoId, lang?)`

Get plain text without timestamps.

```typescript
const text = await api.getText('VIDEO_ID', 'en');

// Returns: "Hello\nWorld\n..."
```

### Translation

Transcripts can be translated to other languages:

```typescript
const transcriptList = await api.list('VIDEO_ID');
const transcript = transcriptList.findTranscript(['en']);

if (transcript.isTranslatable) {
  const translated = await transcript.translate('de').fetch();
}
```

### Formatters

Format transcripts in different formats:

```typescript
import {
  JSONFormatter,
  TextFormatter,
  SRTFormatter,
  WebVTTFormatter
} from 'youtube-transcript-api';

const transcript = await api.fetch('VIDEO_ID');

// JSON
const json = new JSONFormatter().formatTranscript(transcript);

// Plain text
const text = new TextFormatter().formatTranscript(transcript);

// SRT subtitles
const srt = new SRTFormatter().formatTranscript(transcript);

// WebVTT subtitles
const webvtt = new WebVTTFormatter().formatTranscript(transcript);
```

Or use the formatter loader:

```typescript
import { loadFormatter } from 'youtube-transcript-api';

const formatter = loadFormatter('srt'); // 'json' | 'text' | 'srt' | 'webvtt' | 'pretty'
const output = formatter.formatTranscript(transcript);
```

### Proxy Support

If YouTube blocks your IP, you can use proxies:

#### Generic Proxy

```typescript
import { YouTubeTranscriptApi, GenericProxyConfig } from 'youtube-transcript-api';

const api = new YouTubeTranscriptApi({
  proxyConfig: new GenericProxyConfig({
    httpUrl: 'http://user:pass@proxy.example.com:8080',
    httpsUrl: 'https://user:pass@proxy.example.com:8080'
  })
});
```

#### Webshare Rotating Proxies

For reliable IP rotation, use [Webshare](https://www.webshare.io/) residential proxies:

```typescript
import { YouTubeTranscriptApi, WebshareProxyConfig } from 'youtube-transcript-api';

const api = new YouTubeTranscriptApi({
  proxyConfig: new WebshareProxyConfig({
    proxyUsername: 'your-username',
    proxyPassword: 'your-password',
    filterIpLocations: ['us', 'de'],  // Optional: filter by country
    retriesWhenBlocked: 10            // Retry on blocked IPs
  })
});
```

### Environment Proxy

The library automatically uses `HTTP_PROXY` / `HTTPS_PROXY` environment variables if set.

## Error Handling

```typescript
import {
  YouTubeTranscriptApi,
  TranscriptsDisabled,
  NoTranscriptFound,
  VideoUnavailable,
  IpBlocked
} from 'youtube-transcript-api';

try {
  const transcript = await api.fetch('VIDEO_ID');
} catch (error) {
  if (error instanceof TranscriptsDisabled) {
    console.log('Subtitles are disabled for this video');
  } else if (error instanceof NoTranscriptFound) {
    console.log('No transcript in requested language');
  } else if (error instanceof VideoUnavailable) {
    console.log('Video does not exist');
  } else if (error instanceof IpBlocked) {
    console.log('Your IP is blocked by YouTube');
  }
}
```

### Error Types

| Error | Description |
|-------|-------------|
| `TranscriptsDisabled` | Subtitles are disabled for this video |
| `NoTranscriptFound` | No transcript found for requested languages |
| `VideoUnavailable` | Video does not exist or was deleted |
| `VideoUnplayable` | Video cannot be played (private, etc.) |
| `AgeRestricted` | Video requires authentication |
| `InvalidVideoId` | Invalid video ID format |
| `IpBlocked` | Your IP is blocked by YouTube |
| `RequestBlocked` | Request was blocked (rate limiting) |

## FetchedTranscript Object

```typescript
interface FetchedTranscript {
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
  snippets: TranscriptSnippet[];

  // Methods
  get(index: number): TranscriptSnippet;
  toRawData(): RawTranscriptSnippet[];
  [Symbol.iterator](): Iterator<TranscriptSnippet>;
}

interface TranscriptSnippet {
  text: string;
  start: number;    // Start time in seconds
  duration: number; // Duration in seconds
}
```

## Requirements

- Node.js >= 18.0.0

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## License

MIT
