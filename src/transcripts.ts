import { XMLParser } from 'fast-xml-parser';
import { decode as htmlDecode } from 'he';

import { HttpClient, type HttpResponse } from './http-client';
import { formatWatchUrl, formatInnertubeUrl, INNERTUBE_CONTEXT } from './settings';
import {
  VideoUnavailable,
  YouTubeRequestFailed,
  NoTranscriptFound,
  TranscriptsDisabled,
  NotTranslatable,
  TranslationLanguageNotAvailable,
  FailedToCreateConsentCookie,
  InvalidVideoId,
  IpBlocked,
  RequestBlocked,
  AgeRestricted,
  VideoUnplayable,
  YouTubeDataUnparsable,
  PoTokenRequired,
} from './errors';
import type {
  TranscriptSnippet,
  TranslationLanguage,
  CaptionsJson,
  InnertubeResponse,
  RawTranscriptSnippet,
} from './types';

// Playability status constants
const PlayabilityStatus = {
  OK: 'OK',
  ERROR: 'ERROR',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
} as const;

const PlayabilityFailedReason = {
  BOT_DETECTED: "Sign in to confirm you're not a bot",
  AGE_RESTRICTED: 'This video may be inappropriate for some users.',
  VIDEO_UNAVAILABLE: 'This video is unavailable',
} as const;

/**
 * Raises HTTP errors based on response status.
 */
async function raiseHttpErrors(response: HttpResponse, videoId: string): Promise<HttpResponse> {
  if (response.status === 429) {
    throw new IpBlocked(videoId);
  }
  if (response.status >= 400) {
    throw new YouTubeRequestFailed(videoId, new Error(`HTTP ${response.status}: ${response.statusText}`));
  }
  return response;
}

/**
 * Represents a fetched transcript with all snippets and metadata.
 */
export class FetchedTranscript implements Iterable<TranscriptSnippet> {
  public readonly snippets: TranscriptSnippet[];
  public readonly videoId: string;
  public readonly language: string;
  public readonly languageCode: string;
  public readonly isGenerated: boolean;

  constructor(
    snippets: TranscriptSnippet[],
    videoId: string,
    language: string,
    languageCode: string,
    isGenerated: boolean
  ) {
    this.snippets = snippets;
    this.videoId = videoId;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
  }

  [Symbol.iterator](): Iterator<TranscriptSnippet> {
    return this.snippets[Symbol.iterator]();
  }

  get(index: number): TranscriptSnippet {
    return this.snippets[index];
  }

  get length(): number {
    return this.snippets.length;
  }

  /**
   * Convert to raw data format (array of plain objects).
   */
  toRawData(): RawTranscriptSnippet[] {
    return this.snippets.map((snippet) => ({
      text: snippet.text,
      start: snippet.start,
      duration: snippet.duration,
    }));
  }
}

/**
 * Represents a single transcript that can be fetched or translated.
 */
export class Transcript {
  private readonly httpClient: HttpClient;
  public readonly videoId: string;
  private readonly _url: string;
  public readonly language: string;
  public readonly languageCode: string;
  public readonly isGenerated: boolean;
  public readonly translationLanguages: TranslationLanguage[];
  private readonly translationLanguagesDict: Map<string, string>;

  constructor(
    httpClient: HttpClient,
    videoId: string,
    url: string,
    language: string,
    languageCode: string,
    isGenerated: boolean,
    translationLanguages: TranslationLanguage[]
  ) {
    this.httpClient = httpClient;
    this.videoId = videoId;
    this._url = url;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
    this.translationLanguages = translationLanguages;
    this.translationLanguagesDict = new Map(
      translationLanguages.map((tl) => [tl.languageCode, tl.language])
    );
  }

  /**
   * Fetch the actual transcript data.
   *
   * @param preserveFormatting - Whether to keep select HTML text formatting
   */
  async fetch(preserveFormatting = false): Promise<FetchedTranscript> {
    if (this._url.includes('&exp=xpe')) {
      throw new PoTokenRequired(this.videoId);
    }

    const response = await this.httpClient.get(this._url);
    await raiseHttpErrors(response, this.videoId);

    const rawData = await response.text();
    const parser = new TranscriptParser(preserveFormatting);
    const snippets = parser.parse(rawData);

    return new FetchedTranscript(
      snippets,
      this.videoId,
      this.language,
      this.languageCode,
      this.isGenerated
    );
  }

  /**
   * Whether this transcript can be translated.
   */
  get isTranslatable(): boolean {
    return this.translationLanguages.length > 0;
  }

  /**
   * Translate this transcript to another language.
   *
   * @param languageCode - The language code to translate to
   */
  translate(languageCode: string): Transcript {
    if (!this.isTranslatable) {
      throw new NotTranslatable(this.videoId);
    }

    if (!this.translationLanguagesDict.has(languageCode)) {
      throw new TranslationLanguageNotAvailable(this.videoId);
    }

    return new Transcript(
      this.httpClient,
      this.videoId,
      `${this._url}&tlang=${languageCode}`,
      this.translationLanguagesDict.get(languageCode)!,
      languageCode,
      true,
      []
    );
  }

  toString(): string {
    const translationDesc = this.isTranslatable ? '[TRANSLATABLE]' : '';
    return `${this.languageCode} ("${this.language}")${translationDesc}`;
  }
}

/**
 * Represents a list of available transcripts for a video.
 */
export class TranscriptList implements Iterable<Transcript> {
  public readonly videoId: string;
  private readonly manuallyCreatedTranscripts: Map<string, Transcript>;
  private readonly generatedTranscripts: Map<string, Transcript>;
  private readonly _translationLanguages: TranslationLanguage[];

  constructor(
    videoId: string,
    manuallyCreatedTranscripts: Map<string, Transcript>,
    generatedTranscripts: Map<string, Transcript>,
    translationLanguages: TranslationLanguage[]
  ) {
    this.videoId = videoId;
    this.manuallyCreatedTranscripts = manuallyCreatedTranscripts;
    this.generatedTranscripts = generatedTranscripts;
    this._translationLanguages = translationLanguages;
  }

  /**
   * Factory method to build a TranscriptList from captions JSON.
   */
  static build(
    httpClient: HttpClient,
    videoId: string,
    captionsJson: CaptionsJson
  ): TranscriptList {
    const translationLanguages: TranslationLanguage[] = (captionsJson.translationLanguages ?? [])
      .map((tl) => ({
        language: tl.languageName.runs[0].text,
        languageCode: tl.languageCode,
      }));

    const manuallyCreatedTranscripts = new Map<string, Transcript>();
    const generatedTranscripts = new Map<string, Transcript>();

    for (const caption of captionsJson.captionTracks) {
      const isGenerated = caption.kind === 'asr';
      const transcriptMap = isGenerated ? generatedTranscripts : manuallyCreatedTranscripts;

      const transcript = new Transcript(
        httpClient,
        videoId,
        caption.baseUrl.replace('&fmt=srv3', ''),
        caption.name.runs[0].text,
        caption.languageCode,
        isGenerated,
        caption.isTranslatable ? translationLanguages : []
      );

      transcriptMap.set(caption.languageCode, transcript);
    }

    return new TranscriptList(
      videoId,
      manuallyCreatedTranscripts,
      generatedTranscripts,
      translationLanguages
    );
  }

  [Symbol.iterator](): Iterator<Transcript> {
    const all = [
      ...this.manuallyCreatedTranscripts.values(),
      ...this.generatedTranscripts.values(),
    ];
    return all[Symbol.iterator]();
  }

  /**
   * Find a transcript for the given language codes.
   * Manually created transcripts are returned first.
   *
   * @param languageCodes - List of language codes in descending priority
   */
  findTranscript(languageCodes: string[]): Transcript {
    return this._findTranscript(languageCodes, [
      this.manuallyCreatedTranscripts,
      this.generatedTranscripts,
    ]);
  }

  /**
   * Find an automatically generated transcript.
   *
   * @param languageCodes - List of language codes in descending priority
   */
  findGeneratedTranscript(languageCodes: string[]): Transcript {
    return this._findTranscript(languageCodes, [this.generatedTranscripts]);
  }

  /**
   * Find a manually created transcript.
   *
   * @param languageCodes - List of language codes in descending priority
   */
  findManuallyCreatedTranscript(languageCodes: string[]): Transcript {
    return this._findTranscript(languageCodes, [this.manuallyCreatedTranscripts]);
  }

  private _findTranscript(
    languageCodes: string[],
    transcriptDicts: Map<string, Transcript>[]
  ): Transcript {
    for (const languageCode of languageCodes) {
      for (const transcriptDict of transcriptDicts) {
        const transcript = transcriptDict.get(languageCode);
        if (transcript) {
          return transcript;
        }
      }
    }

    throw new NoTranscriptFound(this.videoId, languageCodes, this.toString());
  }

  private getLanguageDescription(transcriptStrings: string[]): string {
    const description = transcriptStrings.map((t) => ` - ${t}`).join('\n');
    return description || 'None';
  }

  toString(): string {
    const manualDescriptions = [...this.manuallyCreatedTranscripts.values()].map((t) =>
      t.toString()
    );
    const generatedDescriptions = [...this.generatedTranscripts.values()].map((t) => t.toString());
    const translationDescriptions = this._translationLanguages.map(
      (tl) => `${tl.languageCode} ("${tl.language}")`
    );

    return (
      `For this video (${this.videoId}) transcripts are available in the following languages:\n\n` +
      `(MANUALLY CREATED)\n${this.getLanguageDescription(manualDescriptions)}\n\n` +
      `(GENERATED)\n${this.getLanguageDescription(generatedDescriptions)}\n\n` +
      `(TRANSLATION LANGUAGES)\n${this.getLanguageDescription(translationDescriptions)}`
    );
  }
}

/**
 * Fetches transcript lists from YouTube.
 */
export class TranscriptListFetcher {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Fetch the transcript list for a video.
   *
   * @param videoId - The YouTube video ID
   */
  async fetch(videoId: string): Promise<TranscriptList> {
    const captionsJson = await this.fetchCaptionsJson(videoId);
    return TranscriptList.build(this.httpClient, videoId, captionsJson);
  }

  private async fetchCaptionsJson(videoId: string, tryNumber = 0): Promise<CaptionsJson> {
    try {
      const html = await this.fetchVideoHtml(videoId);
      const apiKey = this.extractInnertubeApiKey(html, videoId);
      const innertubeData = await this.fetchInnertubeData(videoId, apiKey);
      return this.extractCaptionsJson(innertubeData, videoId);
    } catch (error) {
      if (error instanceof RequestBlocked) {
        const retries = this.httpClient.retriesWhenBlocked;
        if (tryNumber + 1 < retries) {
          return this.fetchCaptionsJson(videoId, tryNumber + 1);
        }
        throw error.withProxyConfig(this.httpClient.getProxyConfig() ?? null);
      }
      throw error;
    }
  }

  private extractInnertubeApiKey(html: string, videoId: string): string {
    const pattern = /"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/;
    const match = html.match(pattern);

    if (match && match[1]) {
      return match[1];
    }

    if (html.includes('class="g-recaptcha"')) {
      throw new IpBlocked(videoId);
    }

    throw new YouTubeDataUnparsable(videoId);
  }

  private extractCaptionsJson(innertubeData: InnertubeResponse, videoId: string): CaptionsJson {
    this.assertPlayability(innertubeData.playabilityStatus, videoId);

    const captionsJson = innertubeData.captions?.playerCaptionsTracklistRenderer;

    if (!captionsJson || !captionsJson.captionTracks) {
      throw new TranscriptsDisabled(videoId);
    }

    return captionsJson;
  }

  private assertPlayability(
    playabilityStatus: InnertubeResponse['playabilityStatus'],
    videoId: string
  ): void {
    const status = playabilityStatus?.status;

    if (status !== PlayabilityStatus.OK && status !== undefined) {
      const reason = playabilityStatus?.reason;

      if (status === PlayabilityStatus.LOGIN_REQUIRED) {
        if (reason === PlayabilityFailedReason.BOT_DETECTED) {
          throw new RequestBlocked(videoId);
        }
        if (reason === PlayabilityFailedReason.AGE_RESTRICTED) {
          throw new AgeRestricted(videoId);
        }
      }

      if (status === PlayabilityStatus.ERROR && reason === PlayabilityFailedReason.VIDEO_UNAVAILABLE) {
        if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
          throw new InvalidVideoId(videoId);
        }
        throw new VideoUnavailable(videoId);
      }

      const subreasons =
        playabilityStatus?.errorScreen?.playerErrorMessageRenderer?.subreason?.runs ?? [];
      const subReasonTexts = subreasons
        .map((run) => run.text ?? '')
        .filter((text) => text.length > 0);

      throw new VideoUnplayable(videoId, reason ?? null, subReasonTexts);
    }
  }

  private async createConsentCookie(html: string, videoId: string): Promise<void> {
    const match = html.match(/name="v" value="(.*?)"/);
    if (!match) {
      throw new FailedToCreateConsentCookie(videoId);
    }
    this.httpClient.setCookie('CONSENT', `YES+${match[1]}`, '.youtube.com');
  }

  private async fetchVideoHtml(videoId: string): Promise<string> {
    let html = await this.fetchHtml(videoId);

    if (html.includes('action="https://consent.youtube.com/s"')) {
      await this.createConsentCookie(html, videoId);
      html = await this.fetchHtml(videoId);

      if (html.includes('action="https://consent.youtube.com/s"')) {
        throw new FailedToCreateConsentCookie(videoId);
      }
    }

    return html;
  }

  private async fetchHtml(videoId: string): Promise<string> {
    const url = formatWatchUrl(videoId);
    const response = await this.httpClient.get(url);
    await raiseHttpErrors(response, videoId);
    const text = await response.text();
    return htmlDecode(text);
  }

  private async fetchInnertubeData(videoId: string, apiKey: string): Promise<InnertubeResponse> {
    const url = formatInnertubeUrl(apiKey);
    const response = await this.httpClient.post(url, {
      context: INNERTUBE_CONTEXT,
      videoId,
    });
    await raiseHttpErrors(response, videoId);
    return response.json<InnertubeResponse>();
  }
}

/**
 * Parses XML transcript data into snippets.
 */
class TranscriptParser {
  private static readonly FORMATTING_TAGS = [
    'strong',
    'em',
    'b',
    'i',
    'mark',
    'small',
    'del',
    'ins',
    'sub',
    'sup',
  ];

  private readonly htmlRegex: RegExp;

  constructor(preserveFormatting = false) {
    this.htmlRegex = this.getHtmlRegex(preserveFormatting);
  }

  private getHtmlRegex(preserveFormatting: boolean): RegExp {
    if (preserveFormatting) {
      const formatsRegex = TranscriptParser.FORMATTING_TAGS.join('|');
      return new RegExp(`<\\/?(?!\\/?(?:${formatsRegex})\\b).*?\\b>`, 'gi');
    }
    return /<[^>]*>/gi;
  }

  parse(rawData: string): TranscriptSnippet[] {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(rawData);
    const textElements = parsed.transcript?.text;

    if (!textElements) {
      return [];
    }

    // Handle both single element and array
    const elements = Array.isArray(textElements) ? textElements : [textElements];

    return elements
      .filter((el: unknown) => {
        // Filter out elements without text content
        if (typeof el === 'string') return true;
        if (typeof el === 'object' && el !== null) {
          const obj = el as Record<string, unknown>;
          return obj['#text'] !== undefined;
        }
        return false;
      })
      .map((el: unknown) => {
        let text: string;
        let start: number;
        let duration: number;

        if (typeof el === 'string') {
          text = el;
          start = 0;
          duration = 0;
        } else {
          const obj = el as Record<string, unknown>;
          text = String(obj['#text'] ?? '');
          start = parseFloat(String(obj['@_start'] ?? '0'));
          duration = parseFloat(String(obj['@_dur'] ?? '0'));
        }

        // Remove HTML tags and decode HTML entities
        const cleanText = htmlDecode(text.replace(this.htmlRegex, ''));

        return {
          text: cleanText,
          start,
          duration,
        };
      });
  }
}
