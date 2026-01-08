/**
 * Example usage of youtube-transcript-api
 *
 * Run: npx tsx example.ts [VIDEO_ID]
 */

import { YouTubeTranscriptApi, SRTFormatter, TextFormatter } from './src';

const VIDEO_ID = process.argv[2] || 'dQw4w9WgXcQ';

async function main() {
  const api = new YouTubeTranscriptApi();

  console.log(`\n=== YouTube Transcript API Example ===\n`);
  console.log(`Video ID: ${VIDEO_ID}\n`);

  // 1. Get info about available subtitles
  console.log('1. getInfo() - Available subtitles:');
  console.log('-'.repeat(40));
  const info = await api.getInfo(VIDEO_ID);
  console.log(`   Has subtitles: ${info.hasSubtitles}`);
  for (const lang of info.languages) {
    const icon = lang.isGenerated ? '🤖' : '✍️';
    console.log(`   ${icon} ${lang.name} (${lang.code})`);
  }

  // 2. Get subtitles with timestamps
  console.log('\n2. getSubtitles() - With timestamps:');
  console.log('-'.repeat(40));
  const subtitles = await api.getSubtitles(VIDEO_ID);
  console.log(`   Total: ${subtitles.length} snippets`);
  console.log('   First 3:');
  subtitles.slice(0, 3).forEach((s) => {
    console.log(`   [${s.start.toFixed(2)}s] ${s.text}`);
  });

  // 3. Get plain text
  console.log('\n3. getText() - Plain text:');
  console.log('-'.repeat(40));
  const text = await api.getText(VIDEO_ID);
  console.log(`   ${text.slice(0, 200).replace(/\n/g, ' ')}...`);

  // 4. Format as SRT
  console.log('\n4. SRT format (first entry):');
  console.log('-'.repeat(40));
  const transcript = await api.fetch(VIDEO_ID);
  const srt = new SRTFormatter().formatTranscript(transcript);
  console.log(srt.split('\n\n')[0]);

  console.log('\n=== Done ===\n');
}

main().catch(console.error);
