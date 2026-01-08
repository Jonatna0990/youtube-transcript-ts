import type { InnertubeContext } from './types';

export const WATCH_URL = 'https://www.youtube.com/watch?v={video_id}';

export const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?key={api_key}';

export const INNERTUBE_CONTEXT: InnertubeContext = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '20.10.38',
  },
};

export const formatWatchUrl = (videoId: string): string => {
  return WATCH_URL.replace('{video_id}', videoId);
};

export const formatInnertubeUrl = (apiKey: string): string => {
  return INNERTUBE_API_URL.replace('{api_key}', apiKey);
};
