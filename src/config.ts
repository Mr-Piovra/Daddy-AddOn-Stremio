import dotenv from 'dotenv';
dotenv.config();

export interface MirrorConfig {
  id: string;
  name: string;
  baseUrl: string;
  playerPaths: string[];
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '7033', 10),
  HOST: process.env.HOST || '0.0.0.0',
  ADDON_URL: process.env.ADDON_URL || `http://localhost:${process.env.PORT || '7033'}`,
  DEBUG: process.env.DEBUG === 'true' || process.env.DEBUG === '1',
  
  // Cache TTLs in milliseconds
  STREAM_CACHE_TTL_MS: parseInt(process.env.STREAM_CACHE_TTL_MS || '300000', 10), // 5 minutes
  SCHEDULE_CACHE_TTL_MS: parseInt(process.env.SCHEDULE_CACHE_TTL_MS || '600000', 10), // 10 minutes
  
  // Network Request Defaults
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
  USER_AGENT: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',

  // RiveStream Endpoints
  RIVESTREAM_SCHEDULE_URL: 'https://backend.rivestream.app/api/schedule',
  RIVESTREAM_SCHEDULE_EXTRA_URL: 'https://backend.rivestream.app/api/schedule?type=schedule-extra-generated',
  STREAMED_SPORTS_URL: 'https://streamed.pk/api/sports',
  STREAMED_MATCHES_URL: 'https://streamed.pk/api/matches',

  // DaddyLive / DLHD Mirrors for Private Channels
  MIRRORS: [
    {
      id: 'alpha',
      name: 'Server Alpha (dlstreams.st)',
      baseUrl: 'https://dlstreams.st',
      playerPaths: [
        '/stream/stream-{id}.php',
        '/cast/stream-{id}.php',
        '/watch/stream-{id}.php',
        '/plus/stream-{id}.php'
      ]
    },
    {
      id: 'bravo',
      name: 'Server Bravo (dlhd.st)',
      baseUrl: 'https://dlhd.st',
      playerPaths: [
        '/stream/stream-{id}.php',
        '/cast/stream-{id}.php',
        '/watch/stream-{id}.php',
        '/plus/stream-{id}.php'
      ]
    },
    {
      id: 'charlie',
      name: 'Server Charlie (dlhd.pk)',
      baseUrl: 'https://dlhd.pk',
      playerPaths: [
        '/stream/stream-{id}.php',
        '/plus/stream-{id}.php',
        '/watch/stream-{id}.php',
        '/cast/stream-{id}.php'
      ]
    },
    {
      id: 'delta',
      name: 'Server Delta (daddylive.mp)',
      baseUrl: 'https://daddylive.mp',
      playerPaths: [
        '/stream/stream-{id}.php',
        '/watch/stream-{id}.php',
        '/player/stream-{id}.php',
        '/casting/stream-{id}.php'
      ]
    }
  ] as MirrorConfig[]
};
