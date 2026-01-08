import { describe, it, expect } from 'vitest';
import {
  JSONFormatter,
  TextFormatter,
  SRTFormatter,
  WebVTTFormatter,
  PrettyPrintFormatter,
  loadFormatter,
  UnknownFormatterType,
} from '../formatters';
import { FetchedTranscript } from '../transcripts';

const createMockTranscript = () => {
  return new FetchedTranscript(
    [
      { text: 'Hello world', start: 0, duration: 1.5 },
      { text: 'How are you', start: 1.5, duration: 2 },
      { text: 'Goodbye', start: 3.5, duration: 1 },
    ],
    'test123',
    'English',
    'en',
    false
  );
};

describe('JSONFormatter', () => {
  const formatter = new JSONFormatter();
  const transcript = createMockTranscript();

  it('should format transcript as JSON', () => {
    const result = formatter.formatTranscript(transcript);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({ text: 'Hello world', start: 0, duration: 1.5 });
  });

  it('should format with indentation', () => {
    const result = formatter.formatTranscript(transcript, { indent: 2 });
    expect(result).toContain('\n');
    expect(result).toContain('  ');
  });

  it('should format multiple transcripts', () => {
    const result = formatter.formatTranscripts([transcript, transcript]);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toHaveLength(3);
  });
});

describe('TextFormatter', () => {
  const formatter = new TextFormatter();
  const transcript = createMockTranscript();

  it('should format transcript as plain text', () => {
    const result = formatter.formatTranscript(transcript);

    expect(result).toBe('Hello world\nHow are you\nGoodbye');
  });

  it('should format multiple transcripts with separators', () => {
    const result = formatter.formatTranscripts([transcript, transcript]);

    expect(result).toContain('\n\n\n');
  });
});

describe('SRTFormatter', () => {
  const formatter = new SRTFormatter();
  const transcript = createMockTranscript();

  it('should format transcript as SRT', () => {
    const result = formatter.formatTranscript(transcript);

    expect(result).toContain('1\n');
    expect(result).toContain('00:00:00,000 --> ');
    expect(result).toContain('Hello world');
  });

  it('should use comma for milliseconds (SRT format)', () => {
    const result = formatter.formatTranscript(transcript);

    expect(result).toMatch(/\d{2}:\d{2}:\d{2},\d{3}/);
  });

  it('should include sequence numbers', () => {
    const result = formatter.formatTranscript(transcript);

    expect(result).toContain('1\n');
    expect(result).toContain('2\n');
    expect(result).toContain('3\n');
  });
});

describe('WebVTTFormatter', () => {
  const formatter = new WebVTTFormatter();
  const transcript = createMockTranscript();

  it('should format transcript as WebVTT', () => {
    const result = formatter.formatTranscript(transcript);

    expect(result.startsWith('WEBVTT\n\n')).toBe(true);
    expect(result).toContain('Hello world');
  });

  it('should use dot for milliseconds (WebVTT format)', () => {
    const result = formatter.formatTranscript(transcript);

    expect(result).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
  });

  it('should not include sequence numbers', () => {
    const result = formatter.formatTranscript(transcript);
    const lines = result.split('\n');

    // WebVTT should not have "1", "2", "3" as standalone lines (unlike SRT)
    const hasSequenceNumber = lines.some((line) => /^[0-9]+$/.test(line.trim()));
    expect(hasSequenceNumber).toBe(false);
  });
});

describe('PrettyPrintFormatter', () => {
  const formatter = new PrettyPrintFormatter();
  const transcript = createMockTranscript();

  it('should format transcript as pretty JSON', () => {
    const result = formatter.formatTranscript(transcript);

    expect(result).toContain('\n');
    expect(JSON.parse(result)).toHaveLength(3);
  });
});

describe('loadFormatter', () => {
  it('should load JSON formatter', () => {
    const formatter = loadFormatter('json');
    expect(formatter).toBeInstanceOf(JSONFormatter);
  });

  it('should load text formatter', () => {
    const formatter = loadFormatter('text');
    expect(formatter).toBeInstanceOf(TextFormatter);
  });

  it('should load SRT formatter', () => {
    const formatter = loadFormatter('srt');
    expect(formatter).toBeInstanceOf(SRTFormatter);
  });

  it('should load WebVTT formatter', () => {
    const formatter = loadFormatter('webvtt');
    expect(formatter).toBeInstanceOf(WebVTTFormatter);
  });

  it('should load pretty formatter by default', () => {
    const formatter = loadFormatter();
    expect(formatter).toBeInstanceOf(PrettyPrintFormatter);
  });

  it('should throw for unknown formatter type', () => {
    expect(() => loadFormatter('unknown' as any)).toThrow(UnknownFormatterType);
  });
});
