/**
 * Represents a single snippet/segment of a transcript.
 */
export interface TranscriptSnippet {
  /** The text content of the snippet */
  text: string;
  /** The timestamp at which this snippet appears on screen (in seconds) */
  start: number;
  /** Duration of how long the snippet stays on screen (in seconds) */
  duration: number;
}

/**
 * Represents a fetched transcript with all its metadata.
 */
export interface FetchedTranscriptData {
  snippets: TranscriptSnippet[];
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
}

/**
 * Represents a language available for translation.
 */
export interface TranslationLanguage {
  language: string;
  languageCode: string;
}

/**
 * Raw data format for transcript snippets (used for serialization).
 */
export interface RawTranscriptSnippet {
  text: string;
  start: number;
  duration: number;
}

/**
 * YouTube InnerTube API context.
 */
export interface InnertubeContext {
  client: {
    clientName: string;
    clientVersion: string;
  };
}

/**
 * Caption track data from YouTube API.
 */
export interface CaptionTrack {
  baseUrl: string;
  name: {
    runs: Array<{ text: string }>;
  };
  languageCode: string;
  kind?: string;
  isTranslatable?: boolean;
}

/**
 * Captions JSON structure from YouTube API.
 */
export interface CaptionsJson {
  captionTracks: CaptionTrack[];
  translationLanguages?: Array<{
    languageName: {
      runs: Array<{ text: string }>;
    };
    languageCode: string;
  }>;
}

/**
 * Playability status from YouTube API.
 */
export interface PlayabilityStatus {
  status: string;
  reason?: string;
  errorScreen?: {
    playerErrorMessageRenderer?: {
      subreason?: {
        runs?: Array<{ text?: string }>;
      };
    };
  };
}

/**
 * InnerTube API response structure.
 */
export interface InnertubeResponse {
  playabilityStatus?: PlayabilityStatus;
  captions?: {
    playerCaptionsTracklistRenderer?: CaptionsJson;
  };
}

/**
 * HTTP client interface for making requests.
 */
export interface HttpClient {
  get(url: string, options?: RequestOptions): Promise<HttpResponse>;
  post(url: string, body: unknown, options?: RequestOptions): Promise<HttpResponse>;
  setCookie(name: string, value: string, domain: string): void;
  getCookies(): Map<string, string>;
}

/**
 * Request options for HTTP client.
 */
export interface RequestOptions {
  headers?: Record<string, string>;
}

/**
 * HTTP response interface.
 */
export interface HttpResponse {
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

/**
 * Proxy configuration dictionary.
 */
export interface ProxyConfigDict {
  http: string;
  https: string;
}
