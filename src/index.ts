// Main API
export { YouTubeTranscriptApi } from './api';
export type { YouTubeTranscriptApiOptions } from './api';

// Transcript classes
export { FetchedTranscript, Transcript, TranscriptList } from './transcripts';

// Proxies
export { GenericProxyConfig, WebshareProxyConfig } from './proxies';
export type { ProxyConfig, GenericProxyConfigOptions, WebshareProxyConfigOptions } from './proxies';

// Formatters
export {
  Formatter,
  JSONFormatter,
  TextFormatter,
  SRTFormatter,
  WebVTTFormatter,
  PrettyPrintFormatter,
  FormatterLoader,
  loadFormatter,
  UnknownFormatterType,
} from './formatters';
export type { FormatterType } from './formatters';

// Errors
export {
  YouTubeTranscriptApiError,
  CookieError,
  CookiePathInvalid,
  CookieInvalid,
  CouldNotRetrieveTranscript,
  YouTubeDataUnparsable,
  YouTubeRequestFailed,
  VideoUnplayable,
  VideoUnavailable,
  InvalidVideoId,
  RequestBlocked,
  IpBlocked,
  TranscriptsDisabled,
  AgeRestricted,
  NotTranslatable,
  TranslationLanguageNotAvailable,
  FailedToCreateConsentCookie,
  NoTranscriptFound,
  PoTokenRequired,
  InvalidProxyConfig,
} from './errors';

// Types
export type {
  TranscriptSnippet,
  TranslationLanguage,
  RawTranscriptSnippet,
  FetchedTranscriptData,
} from './types';
