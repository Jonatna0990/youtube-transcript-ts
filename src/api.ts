import { HttpClient } from './http-client';
import { TranscriptListFetcher, FetchedTranscript, TranscriptList } from './transcripts';
import type { ProxyConfig } from './proxies';

export interface YouTubeTranscriptApiOptions {
  /**
   * Proxy configuration for all network requests.
   * Use this to work around IP blocks.
   */
  proxyConfig?: ProxyConfig;
}

/**
 * Main API class for fetching YouTube transcripts.
 *
 * @example
 * ```typescript
 * import { YouTubeTranscriptApi } from 'youtube-transcript-api';
 *
 * const api = new YouTubeTranscriptApi();
 *
 * // Quick fetch
 * const transcript = await api.fetch('video_id');
 *
 * // List available transcripts
 * const transcriptList = await api.list('video_id');
 * for (const t of transcriptList) {
 *   console.log(t.language, t.isGenerated);
 * }
 * ```
 */
export class YouTubeTranscriptApi {
  private readonly fetcher: TranscriptListFetcher;

  /**
   * Create a new YouTubeTranscriptApi instance.
   *
   * Note: This class is NOT thread-safe. Create a separate instance per thread
   * in multi-threaded environments.
   *
   * @param options - Configuration options
   */
  constructor(options: YouTubeTranscriptApiOptions = {}) {
    const httpClient = new HttpClient({
      proxyConfig: options.proxyConfig,
    });
    this.fetcher = new TranscriptListFetcher(httpClient);
  }

  /**
   * Fetch a transcript for a video.
   *
   * This is a shortcut for:
   * `api.list(videoId).findTranscript(languages).fetch(preserveFormatting)`
   *
   * @param videoId - The YouTube video ID (NOT the full URL!)
   * @param options - Fetch options
   * @returns The fetched transcript
   *
   * @example
   * ```typescript
   * const api = new YouTubeTranscriptApi();
   *
   * // Fetch English transcript
   * const transcript = await api.fetch('dQw4w9WgXcQ');
   *
   * // Fetch German, falling back to English
   * const transcript = await api.fetch('dQw4w9WgXcQ', {
   *   languages: ['de', 'en']
   * });
   *
   * // Keep HTML formatting
   * const transcript = await api.fetch('dQw4w9WgXcQ', {
   *   preserveFormatting: true
   * });
   * ```
   */
  async fetch(
    videoId: string,
    options: {
      /** Language codes in descending priority. Defaults to ['en'] */
      languages?: string[];
      /** Whether to keep select HTML text formatting */
      preserveFormatting?: boolean;
    } = {}
  ): Promise<FetchedTranscript> {
    const { languages = ['en'], preserveFormatting = false } = options;

    const transcriptList = await this.list(videoId);
    const transcript = transcriptList.findTranscript(languages);
    return transcript.fetch(preserveFormatting);
  }

  /**
   * Get the list of available transcripts for a video.
   *
   * @param videoId - The YouTube video ID (NOT the full URL!)
   * @returns A TranscriptList object for iterating and filtering transcripts
   *
   * @example
   * ```typescript
   * const api = new YouTubeTranscriptApi();
   * const transcriptList = await api.list('dQw4w9WgXcQ');
   *
   * // Iterate over all transcripts
   * for (const transcript of transcriptList) {
   *   console.log(transcript.language, transcript.languageCode, transcript.isGenerated);
   * }
   *
   * // Find specific transcript
   * const transcript = transcriptList.findTranscript(['de', 'en']);
   *
   * // Find only manually created
   * const manual = transcriptList.findManuallyCreatedTranscript(['en']);
   *
   * // Find only auto-generated
   * const generated = transcriptList.findGeneratedTranscript(['en']);
   *
   * // Fetch the transcript
   * const fetched = await transcript.fetch();
   *
   * // Translate and fetch
   * const translated = await transcript.translate('de').fetch();
   * ```
   */
  async list(videoId: string): Promise<TranscriptList> {
    return this.fetcher.fetch(videoId);
  }

  /**
   * 1. Get info about available subtitles for a video.
   *
   * @param videoId - The YouTube video ID
   * @returns Info about available subtitles
   *
   * @example
   * ```typescript
   * const info = await api.getInfo('dQw4w9WgXcQ');
   * console.log(info.hasSubtitles); // true
   * console.log(info.languages);   // ['en', 'de', 'ja', ...]
   * ```
   */
  async getInfo(videoId: string): Promise<{
    videoId: string;
    hasSubtitles: boolean;
    languages: Array<{
      code: string;
      name: string;
      isGenerated: boolean;
      isTranslatable: boolean;
    }>;
  }> {
    const transcriptList = await this.list(videoId);
    const languages: Array<{
      code: string;
      name: string;
      isGenerated: boolean;
      isTranslatable: boolean;
    }> = [];

    for (const t of transcriptList) {
      languages.push({
        code: t.languageCode,
        name: t.language,
        isGenerated: t.isGenerated,
        isTranslatable: t.isTranslatable,
      });
    }

    return {
      videoId,
      hasSubtitles: languages.length > 0,
      languages,
    };
  }

  /**
   * 2. Get subtitles with timestamps.
   *
   * @param videoId - The YouTube video ID
   * @param lang - Language code (default: 'en')
   * @returns Array of subtitles with text, start time, and duration
   *
   * @example
   * ```typescript
   * const subtitles = await api.getSubtitles('dQw4w9WgXcQ', 'en');
   * for (const sub of subtitles) {
   *   console.log(`[${sub.start}s] ${sub.text}`);
   * }
   * ```
   */
  async getSubtitles(
    videoId: string,
    lang = 'en'
  ): Promise<Array<{ text: string; start: number; duration: number }>> {
    const transcript = await this.fetch(videoId, { languages: [lang, 'en'] });
    return transcript.toRawData();
  }

  /**
   * 3. Get plain text of subtitles (no timestamps).
   *
   * @param videoId - The YouTube video ID
   * @param lang - Language code (default: 'en')
   * @returns Plain text of all subtitles joined
   *
   * @example
   * ```typescript
   * const text = await api.getText('dQw4w9WgXcQ', 'en');
   * console.log(text);
   * // "We're no strangers to love\nYou know the rules and so do I..."
   * ```
   */
  async getText(videoId: string, lang = 'en'): Promise<string> {
    const transcript = await this.fetch(videoId, { languages: [lang, 'en'] });
    return [...transcript].map((s) => s.text).join('\n');
  }
}
