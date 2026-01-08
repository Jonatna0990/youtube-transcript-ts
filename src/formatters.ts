import type { FetchedTranscript } from './transcripts';
import type { TranscriptSnippet } from './types';

/**
 * Base class for transcript formatters.
 */
export abstract class Formatter {
  /**
   * Format a single transcript.
   */
  abstract formatTranscript(transcript: FetchedTranscript, options?: unknown): string;

  /**
   * Format multiple transcripts.
   */
  abstract formatTranscripts(transcripts: FetchedTranscript[], options?: unknown): string;
}

/**
 * Formats transcript as pretty-printed JSON.
 */
export class PrettyPrintFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options?: { indent?: number }): string {
    const indent = options?.indent ?? 2;
    return JSON.stringify(transcript.toRawData(), null, indent);
  }

  formatTranscripts(transcripts: FetchedTranscript[], options?: { indent?: number }): string {
    const indent = options?.indent ?? 2;
    return JSON.stringify(
      transcripts.map((t) => t.toRawData()),
      null,
      indent
    );
  }
}

/**
 * Formats transcript as JSON string.
 */
export class JSONFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript, options?: { indent?: number }): string {
    return JSON.stringify(transcript.toRawData(), null, options?.indent);
  }

  formatTranscripts(transcripts: FetchedTranscript[], options?: { indent?: number }): string {
    return JSON.stringify(
      transcripts.map((t) => t.toRawData()),
      null,
      options?.indent
    );
  }
}

/**
 * Formats transcript as plain text (no timestamps).
 */
export class TextFormatter extends Formatter {
  formatTranscript(transcript: FetchedTranscript): string {
    return [...transcript].map((snippet) => snippet.text).join('\n');
  }

  formatTranscripts(transcripts: FetchedTranscript[]): string {
    return transcripts.map((t) => this.formatTranscript(t)).join('\n\n\n');
  }
}

/**
 * Base class for timestamp-based formatters (SRT, WebVTT).
 */
abstract class TextBasedFormatter extends TextFormatter {
  protected abstract formatTimestamp(hours: number, mins: number, secs: number, ms: number): string;
  protected abstract formatTranscriptHeader(lines: string[]): string;
  protected abstract formatTranscriptHelper(
    index: number,
    timeText: string,
    snippet: TranscriptSnippet
  ): string;

  protected secondsToTimestamp(time: number): string {
    const hours = Math.floor(time / 3600);
    const remainder = time % 3600;
    const mins = Math.floor(remainder / 60);
    const secs = Math.floor(remainder % 60);
    const ms = Math.round((time - Math.floor(time)) * 1000);

    return this.formatTimestamp(hours, mins, secs, ms);
  }

  override formatTranscript(transcript: FetchedTranscript): string {
    const lines: string[] = [];
    const snippets = [...transcript];

    for (let i = 0; i < snippets.length; i++) {
      const snippet = snippets[i];
      const end = snippet.start + snippet.duration;

      // Check if next snippet starts before current ends
      const nextStart = i < snippets.length - 1 ? snippets[i + 1].start : end;
      const adjustedEnd = nextStart < end ? nextStart : end;

      const timeText = `${this.secondsToTimestamp(snippet.start)} --> ${this.secondsToTimestamp(adjustedEnd)}`;
      lines.push(this.formatTranscriptHelper(i, timeText, snippet));
    }

    return this.formatTranscriptHeader(lines);
  }
}

/**
 * Formats transcript as SRT (SubRip) subtitle format.
 *
 * @example
 * ```
 * 1
 * 00:00:00,000 --> 00:00:01,500
 * Hello world
 *
 * 2
 * 00:00:01,500 --> 00:00:03,000
 * How are you
 * ```
 */
export class SRTFormatter extends TextBasedFormatter {
  protected formatTimestamp(hours: number, mins: number, secs: number, ms: number): string {
    return (
      `${hours.toString().padStart(2, '0')}:` +
      `${mins.toString().padStart(2, '0')}:` +
      `${secs.toString().padStart(2, '0')},` +
      `${ms.toString().padStart(3, '0')}`
    );
  }

  protected formatTranscriptHeader(lines: string[]): string {
    return lines.join('\n\n') + '\n';
  }

  protected formatTranscriptHelper(
    index: number,
    timeText: string,
    snippet: TranscriptSnippet
  ): string {
    return `${index + 1}\n${timeText}\n${snippet.text}`;
  }
}

/**
 * Formats transcript as WebVTT subtitle format.
 *
 * @example
 * ```
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:01.500
 * Hello world
 *
 * 00:00:01.500 --> 00:00:03.000
 * How are you
 * ```
 */
export class WebVTTFormatter extends TextBasedFormatter {
  protected formatTimestamp(hours: number, mins: number, secs: number, ms: number): string {
    return (
      `${hours.toString().padStart(2, '0')}:` +
      `${mins.toString().padStart(2, '0')}:` +
      `${secs.toString().padStart(2, '0')}.` +
      `${ms.toString().padStart(3, '0')}`
    );
  }

  protected formatTranscriptHeader(lines: string[]): string {
    return 'WEBVTT\n\n' + lines.join('\n\n') + '\n';
  }

  protected formatTranscriptHelper(
    _index: number,
    timeText: string,
    snippet: TranscriptSnippet
  ): string {
    return `${timeText}\n${snippet.text}`;
  }
}

/**
 * Available formatter types.
 */
export type FormatterType = 'json' | 'pretty' | 'text' | 'webvtt' | 'srt';

/**
 * Error thrown when an unknown formatter type is requested.
 */
export class UnknownFormatterType extends Error {
  constructor(formatterType: string) {
    const supportedTypes = Object.keys(FORMATTER_TYPES).join(', ');
    super(
      `The format '${formatterType}' is not supported. ` +
        `Choose one of the following formats: ${supportedTypes}`
    );
    this.name = 'UnknownFormatterType';
  }
}

const FORMATTER_TYPES: Record<FormatterType, new () => Formatter> = {
  json: JSONFormatter,
  pretty: PrettyPrintFormatter,
  text: TextFormatter,
  webvtt: WebVTTFormatter,
  srt: SRTFormatter,
};

/**
 * Load a formatter by type.
 *
 * @param formatterType - The type of formatter to load
 * @returns The formatter instance
 *
 * @example
 * ```typescript
 * import { loadFormatter } from 'youtube-transcript-api/formatters';
 *
 * const formatter = loadFormatter('srt');
 * const srtText = formatter.formatTranscript(transcript);
 * ```
 */
export function loadFormatter(formatterType: FormatterType = 'pretty'): Formatter {
  const FormatterClass = FORMATTER_TYPES[formatterType];
  if (!FormatterClass) {
    throw new UnknownFormatterType(formatterType);
  }
  return new FormatterClass();
}

/**
 * Formatter loader class.
 */
export class FormatterLoader {
  static readonly TYPES = FORMATTER_TYPES;

  load(formatterType: FormatterType = 'pretty'): Formatter {
    return loadFormatter(formatterType);
  }
}
