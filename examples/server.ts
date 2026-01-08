/**
 * Simple Express server for Chrome extension
 *
 * Run: npx tsx examples/server.ts
 */

import express from 'express';
import { YouTubeTranscriptApi } from '../src';

const app = express();
const api = new YouTubeTranscriptApi();

// CORS for Chrome extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Get transcript info
app.get('/api/info/:videoId', async (req, res) => {
  try {
    const info = await api.getInfo(req.params.videoId);
    res.json(info);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get subtitles with timestamps
app.get('/api/subtitles/:videoId', async (req, res) => {
  try {
    const lang = (req.query.lang as string) || 'en';
    const subtitles = await api.getSubtitles(req.params.videoId, lang);
    res.json(subtitles);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get plain text
app.get('/api/text/:videoId', async (req, res) => {
  try {
    const lang = (req.query.lang as string) || 'en';
    const text = await api.getText(req.params.videoId, lang);
    res.json({ text });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  GET /api/info/:videoId');
  console.log('  GET /api/subtitles/:videoId?lang=en');
  console.log('  GET /api/text/:videoId?lang=en');
});
