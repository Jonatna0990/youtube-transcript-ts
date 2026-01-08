import { formatWatchUrl } from './settings';
import type { ProxyConfig } from './proxies';

const GITHUB_REFERRAL =
  '\n\nIf you are sure that the described cause is not responsible for this error ' +
  'and that a transcript should be retrievable, please create an issue at ' +
  'https://github.com/user/youtube-transcript-api-ts/issues. ' +
  'Please add which version of youtube-transcript-api you are using ' +
  'and provide the information needed to replicate the error. ' +
  'Also make sure that there are no open issues which already describe your problem!';

/**
 * Base exception for all YouTube Transcript API errors.
 */
export class YouTubeTranscriptApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YouTubeTranscriptApiError';
  }
}

/**
 * Base class for cookie-related errors.
 */
export class CookieError extends YouTubeTranscriptApiError {
  constructor(message: string) {
    super(message);
    this.name = 'CookieError';
  }
}

/**
 * Raised when the cookie path is invalid.
 */
export class CookiePathInvalid extends CookieError {
  constructor(cookiePath: string) {
    super(`Can't load the provided cookie file: ${cookiePath}`);
    this.name = 'CookiePathInvalid';
  }
}

/**
 * Raised when the cookies are invalid or expired.
 */
export class CookieInvalid extends CookieError {
  constructor(cookiePath: string) {
    super(`The cookies provided are not valid (may have expired): ${cookiePath}`);
    this.name = 'CookieInvalid';
  }
}

/**
 * Base class for errors when a transcript could not be retrieved.
 */
export class CouldNotRetrieveTranscript extends YouTubeTranscriptApiError {
  public readonly videoId: string;
  protected static CAUSE_MESSAGE = '';

  constructor(videoId: string) {
    super('');
    this.videoId = videoId;
    this.name = 'CouldNotRetrieveTranscript';
    this.message = this.buildErrorMessage();
  }

  protected get causeMessage(): string {
    return (this.constructor as typeof CouldNotRetrieveTranscript).CAUSE_MESSAGE;
  }

  protected buildErrorMessage(): string {
    const videoUrl = formatWatchUrl(this.videoId);
    let errorMessage = `\nCould not retrieve a transcript for the video ${videoUrl}!`;

    const causeMsg = this.causeMessage;
    if (causeMsg) {
      errorMessage += `\nThis is most likely caused by:\n\n${causeMsg}${GITHUB_REFERRAL}`;
    }

    return errorMessage;
  }
}

/**
 * Raised when YouTube data cannot be parsed.
 */
export class YouTubeDataUnparsable extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'The data required to fetch the transcript is not parsable. This should ' +
    'not happen, please open an issue (make sure to include the video ID)!';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'YouTubeDataUnparsable';
  }
}

/**
 * Raised when a request to YouTube fails.
 */
export class YouTubeRequestFailed extends CouldNotRetrieveTranscript {
  public readonly reason: string;

  constructor(videoId: string, error: Error) {
    super(videoId);
    this.reason = error.message;
    this.name = 'YouTubeRequestFailed';
    this.message = this.buildErrorMessage();
  }

  protected override get causeMessage(): string {
    return `Request to YouTube failed: ${this.reason}`;
  }
}

/**
 * Raised when a video is unplayable.
 */
export class VideoUnplayable extends CouldNotRetrieveTranscript {
  public readonly reason: string | null;
  public readonly subReasons: string[];

  constructor(videoId: string, reason: string | null, subReasons: string[]) {
    super(videoId);
    this.reason = reason;
    this.subReasons = subReasons;
    this.name = 'VideoUnplayable';
    this.message = this.buildErrorMessage();
  }

  protected override get causeMessage(): string {
    let reasonText = this.reason ?? 'No reason specified!';
    if (this.subReasons.length > 0) {
      const subReasonsText = this.subReasons.map((r) => ` - ${r}`).join('\n');
      reasonText += `\n\nAdditional Details:\n${subReasonsText}`;
    }
    return `The video is unplayable for the following reason: ${reasonText}`;
  }
}

/**
 * Raised when a video is unavailable.
 */
export class VideoUnavailable extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE = 'The video is no longer available';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'VideoUnavailable';
  }
}

/**
 * Raised when an invalid video ID is provided.
 */
export class InvalidVideoId extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'You provided an invalid video id. Make sure you are using the video id and NOT the url!\n\n' +
    'Do NOT run: `YouTubeTranscriptApi.fetch("https://www.youtube.com/watch?v=1234")`\n' +
    'Instead run: `YouTubeTranscriptApi.fetch("1234")`';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'InvalidVideoId';
  }
}

/**
 * Raised when requests are blocked by YouTube.
 */
export class RequestBlocked extends CouldNotRetrieveTranscript {
  protected static BASE_CAUSE_MESSAGE =
    'YouTube is blocking requests from your IP. This usually is due to one of the ' +
    'following reasons:\n' +
    '- You have done too many requests and your IP has been blocked by YouTube\n' +
    '- You are doing requests from an IP belonging to a cloud provider (like AWS, ' +
    'Google Cloud Platform, Azure, etc.). Unfortunately, most IPs from cloud ' +
    'providers are blocked by YouTube.\n\n';

  protected static override CAUSE_MESSAGE =
    RequestBlocked.BASE_CAUSE_MESSAGE +
    'There are two things you can do to work around this:\n' +
    '1. Use proxies to hide your IP address, as explained in the "Working around ' +
    'IP bans" section of the README ' +
    '(https://github.com/user/youtube-transcript-api-ts' +
    '?tab=readme-ov-file' +
    '#working-around-ip-bans-requestblocked-or-ipblocked-exception).\n' +
    '2. (NOT RECOMMENDED) If you authenticate your requests using cookies, you ' +
    'will be able to continue doing requests for a while. However, YouTube will ' +
    'eventually permanently ban the account that you have used to authenticate ' +
    'with! So only do this if you don\'t mind your account being banned!';

  protected static WITH_GENERIC_PROXY_CAUSE_MESSAGE =
    'YouTube is blocking your requests, despite you using proxies. Keep in mind ' +
    'that a proxy is just a way to hide your real IP behind the IP of that proxy, ' +
    "but there is no guarantee that the IP of that proxy won't be blocked as " +
    'well.\n\n' +
    'The only truly reliable way to prevent IP blocks is rotating through a large ' +
    'pool of residential IPs, by using a provider like Webshare ' +
    '(https://www.webshare.io/?referral_code=w0xno53eb50g), which provides you ' +
    'with a pool of >30M residential IPs (make sure to purchase ' +
    '"Residential" proxies, NOT "Proxy Server" or "Static Residential"!).\n\n' +
    'You will find more information on how to easily integrate Webshare here: ' +
    'https://github.com/user/youtube-transcript-api-ts' +
    '?tab=readme-ov-file#using-webshare';

  protected static WITH_WEBSHARE_PROXY_CAUSE_MESSAGE =
    'YouTube is blocking your requests, despite you using Webshare proxies. ' +
    'Please make sure that you have purchased "Residential" proxies and ' +
    'NOT "Proxy Server" or "Static Residential", as those won\'t work as ' +
    'reliably! The free tier also uses "Proxy Server" and will NOT work!\n\n' +
    'The only reliable option is using "Residential" proxies (not "Static ' +
    'Residential"), as this allows you to rotate through a pool of over 30M IPs, ' +
    "which means you will always find an IP that hasn't been blocked by YouTube " +
    'yet!\n\n' +
    'You can support the development of this open source project by making your ' +
    'Webshare purchases through this affiliate link: ' +
    'https://www.webshare.io/?referral_code=w0xno53eb50g \n\n' +
    'Thank you for your support! <3';

  protected _proxyConfig: ProxyConfig | null = null;

  constructor(videoId: string) {
    super(videoId);
    this.name = 'RequestBlocked';
  }

  withProxyConfig(proxyConfig: ProxyConfig | null): this {
    this._proxyConfig = proxyConfig;
    this.message = this.buildErrorMessage();
    return this;
  }

  protected override get causeMessage(): string {
    if (this._proxyConfig?.type === 'webshare') {
      return RequestBlocked.WITH_WEBSHARE_PROXY_CAUSE_MESSAGE;
    }
    if (this._proxyConfig?.type === 'generic') {
      return RequestBlocked.WITH_GENERIC_PROXY_CAUSE_MESSAGE;
    }
    return (this.constructor as typeof RequestBlocked).CAUSE_MESSAGE;
  }
}

/**
 * Raised when IP is blocked (reCAPTCHA detected).
 */
export class IpBlocked extends RequestBlocked {
  protected static override CAUSE_MESSAGE =
    RequestBlocked.BASE_CAUSE_MESSAGE +
    'Ways to work around this are explained in the "Working around IP ' +
    'bans" section of the README (https://github.com/user/youtube-transcript-api-ts' +
    '?tab=readme-ov-file' +
    '#working-around-ip-bans-requestblocked-or-ipblocked-exception).\n';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'IpBlocked';
  }
}

/**
 * Raised when transcripts are disabled for a video.
 */
export class TranscriptsDisabled extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE = 'Subtitles are disabled for this video';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'TranscriptsDisabled';
  }
}

/**
 * Raised when a video is age-restricted.
 */
export class AgeRestricted extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'This video is age-restricted. Therefore, you are unable to retrieve ' +
    'transcripts for it without authenticating yourself.\n\n' +
    'Cookie Authentication is currently not supported for age-restricted videos.';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'AgeRestricted';
  }
}

/**
 * Raised when a transcript is not translatable.
 */
export class NotTranslatable extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE = 'The requested language is not translatable';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'NotTranslatable';
  }
}

/**
 * Raised when the requested translation language is not available.
 */
export class TranslationLanguageNotAvailable extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE = 'The requested translation language is not available';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'TranslationLanguageNotAvailable';
  }
}

/**
 * Raised when consent cookie creation fails.
 */
export class FailedToCreateConsentCookie extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE = 'Failed to automatically give consent to saving cookies';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'FailedToCreateConsentCookie';
  }
}

/**
 * Raised when no transcript is found for the requested languages.
 */
export class NoTranscriptFound extends CouldNotRetrieveTranscript {
  public readonly requestedLanguageCodes: string[];
  public readonly transcriptData: string;

  constructor(videoId: string, requestedLanguageCodes: string[], transcriptData: string) {
    super(videoId);
    this.requestedLanguageCodes = requestedLanguageCodes;
    this.transcriptData = transcriptData;
    this.name = 'NoTranscriptFound';
    // Rebuild message after setting properties
    this.message = this.buildErrorMessage();
  }

  protected override get causeMessage(): string {
    // Guard against undefined during super() call
    const codes = this.requestedLanguageCodes?.join(', ') ?? '';
    const data = this.transcriptData ?? '';
    return (
      `No transcripts were found for any of the requested language codes: ${codes}\n\n` +
      data
    );
  }
}

/**
 * Raised when a PO Token is required to retrieve the video.
 */
export class PoTokenRequired extends CouldNotRetrieveTranscript {
  protected static override CAUSE_MESSAGE =
    'The requested video cannot be retrieved without a PO Token. If this happens, ' +
    'please open a GitHub issue!';

  constructor(videoId: string) {
    super(videoId);
    this.name = 'PoTokenRequired';
  }
}

/**
 * Raised when proxy configuration is invalid.
 */
export class InvalidProxyConfig extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProxyConfig';
  }
}
