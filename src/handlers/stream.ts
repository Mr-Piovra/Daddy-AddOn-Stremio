import { CONFIG } from '../config';
import { DLStreamsExtractor } from '../extractors/dlstreams';
import { ExtractedStream } from '../extractors/types';
import { ProxyBuilder } from '../proxy/proxyBuilder';
import { MemoryCache } from '../services/cache';
import { ChannelsService } from '../services/channels';
import { ScheduleService } from '../services/schedule';
import { UserConfig } from '../utils/configParser';

export interface StremioStream {
  name: string;
  title?: string;
  url: string;
  behaviorHints?: {
    notWebReady?: boolean;
    proxyHeaders?: {
      request?: Record<string, string>;
      response?: Record<string, string>;
    };
  };
}

export class StreamHandler {
  /**
   * Gestisce la risoluzione degli stream in modo fulmineo (< 30ms):
   * 1. Se EasyProxy/MediaFlow è attivo: genera istantaneamente i link Lazy Extractor con gli header Referer/Origin corretti.
   * 2. Applica MemoryCache (TTL 5 min) per azzerare la latenza sulle richieste ripetute.
   */
  public static async handle(args: {
    type: string;
    id: string;
    userConfig?: UserConfig;
  }): Promise<{ streams: StremioStream[] }> {
    const { id, userConfig } = args;
    const hasCustomProxy = !!userConfig?.proxyUrl?.trim();
    const proxyLabel = userConfig?.proxyType === 'mediaflow' ? 'MediaFlow' : 'EasyProxy';

    const cacheKey = `streams:${id}:${userConfig?.proxyUrl || 'direct'}:${userConfig?.proxyType || 'ep'}:${!!userConfig?.includeDirect}`;
    const cachedStreams = MemoryCache.get<StremioStream[]>(cacheKey);
    if (cachedStreams && cachedStreams.length > 0) {
      return { streams: cachedStreams };
    }

    // 1. Canale Private (DaddyLive HD)
    if (id.startsWith('rivestream:private:')) {
      const channelId = id.replace('rivestream:private:', '').replace(/\D/g, '');
      const streams: StremioStream[] = [];

      // A. Flussi EasyProxy (Lazy Extraction - Risoluzione istantanea al play)
      if (hasCustomProxy) {
        for (const mirror of CONFIG.MIRRORS) {
          const candidateUrl = `${mirror.baseUrl.replace(/\/+$/, '')}/stream/stream-${channelId}.php`;
          const extractorStreamUrl = ProxyBuilder.buildExtractorUrl(
            candidateUrl,
            userConfig,
            'dlstreams',
            {
              Referer: 'https://hamis.romponalis.st/',
              Origin: 'https://hamis.romponalis.st'
            }
          );

          streams.push({
            name: `RiveStream [${proxyLabel}]`,
            title: `⚡ ${mirror.name}\n1080p HLS (${proxyLabel})`,
            url: extractorStreamUrl,
            behaviorHints: {
              notWebReady: false
            }
          });
        }

        // Se l'utente ha richiesto anche i flussi diretti
        if (userConfig?.includeDirect) {
          const directCacheKey = `streams:private:direct:${channelId}`;
          let extracted = MemoryCache.get<ExtractedStream[]>(directCacheKey);

          if (!extracted || extracted.length === 0) {
            extracted = await DLStreamsExtractor.extractAll(channelId);
            if (extracted.length > 0) {
              MemoryCache.set(directCacheKey, extracted, CONFIG.STREAM_CACHE_TTL_MS);
            }
          }

          for (const s of extracted) {
            streams.push({
              name: 'RiveStream [Direct]',
              title: `⚡ ${s.mirrorName}\n1080p HLS (Direct CDN)`,
              url: s.streamUrl,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: s.headers
                }
              }
            });
          }
        }
      } else {
        // Nessun proxy: estrazione locale diretta con cache
        const directCacheKey = `streams:private:direct:${channelId}`;
        let extracted = MemoryCache.get<ExtractedStream[]>(directCacheKey);

        if (!extracted || extracted.length === 0) {
          extracted = await DLStreamsExtractor.extractAll(channelId);
          if (extracted.length > 0) {
            MemoryCache.set(directCacheKey, extracted, CONFIG.STREAM_CACHE_TTL_MS);
          }
        }

        for (const s of extracted) {
          streams.push({
            name: 'RiveStream [Direct]',
            title: `⚡ ${s.mirrorName}\n1080p HLS (Direct CDN)`,
            url: s.streamUrl,
            behaviorHints: {
              notWebReady: true,
              proxyHeaders: {
                request: s.headers
              }
            }
          });
        }
      }

      if (streams.length > 0) {
        MemoryCache.set(cacheKey, streams, CONFIG.STREAM_CACHE_TTL_MS);
      }
      return { streams };
    }

    // 2. Canale Public (IPTV Globale)
    if (id.startsWith('rivestream:public:')) {
      const channelId = id.replace('rivestream:public:', '');
      const channel = ChannelsService.getPublicChannelById(channelId);

      if (!channel || !channel.streamUrl) {
        return { streams: [] };
      }

      const streams: StremioStream[] = [];

      if (hasCustomProxy) {
        const proxyStreamUrl = ProxyBuilder.buildProxyHlsUrl(channel.streamUrl, userConfig);
        streams.push({
          name: `RiveStream IPTV [${proxyLabel}]`,
          title: `📺 Stream (${channel.name})\nHLS Live (${proxyLabel})`,
          url: proxyStreamUrl,
          behaviorHints: {
            notWebReady: false
          }
        });

        if (userConfig?.includeDirect) {
          streams.push({
            name: 'RiveStream IPTV [Direct]',
            title: `📺 Direct Stream (${channel.name})\nHLS Live`,
            url: channel.streamUrl,
            behaviorHints: {
              notWebReady: true
            }
          });
        }
      } else {
        streams.push({
          name: 'RiveStream IPTV [Direct]',
          title: `📺 Direct Stream (${channel.name})\nHLS Live`,
          url: channel.streamUrl,
          behaviorHints: {
            notWebReady: true
          }
        });
      }

      if (streams.length > 0) {
        MemoryCache.set(cacheKey, streams, CONFIG.STREAM_CACHE_TTL_MS);
      }
      return { streams };
    }

    // 3. Evento Live Sportivo (Palinsesto)
    if (id.startsWith('rivestream:event:')) {
      const eventId = id.replace('rivestream:event:', '');
      const event = await ScheduleService.getEventById(eventId);

      if (!event || !event.channels || event.channels.length === 0) {
        return { streams: [] };
      }

      const streams: StremioStream[] = [];

      for (const ch of event.channels) {
        if (!ch.channel_id) continue;
        const channelId = ch.channel_id.replace(/\D/g, '');
        if (!channelId) continue;

        if (hasCustomProxy) {
          for (const mirror of CONFIG.MIRRORS.slice(0, 2)) {
            const candidateUrl = `${mirror.baseUrl.replace(/\/+$/, '')}/stream/stream-${channelId}.php`;
            const extractorStreamUrl = ProxyBuilder.buildExtractorUrl(
              candidateUrl,
              userConfig,
              'dlstreams',
              {
                Referer: 'https://hamis.romponalis.st/',
                Origin: 'https://hamis.romponalis.st'
              }
            );

            streams.push({
              name: `RiveStream Live [${proxyLabel}]`,
              title: `⚽ [${ch.channel_name}] - ${mirror.name}\n1080p HLS (${proxyLabel})`,
              url: extractorStreamUrl,
              behaviorHints: {
                notWebReady: false
              }
            });
          }

          if (userConfig?.includeDirect) {
            const directCacheKey = `streams:private:direct:${channelId}`;
            let extracted = MemoryCache.get<ExtractedStream[]>(directCacheKey);

            if (!extracted || extracted.length === 0) {
              extracted = await DLStreamsExtractor.extractAll(channelId);
              if (extracted.length > 0) {
                MemoryCache.set(directCacheKey, extracted, CONFIG.STREAM_CACHE_TTL_MS);
              }
            }

            for (const s of extracted) {
              streams.push({
                name: 'RiveStream Live [Direct]',
                title: `⚽ [${ch.channel_name}] - ${s.mirrorName}\n1080p HLS (Direct CDN)`,
                url: s.streamUrl,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: s.headers
                  }
                }
              });
            }
          }
        } else {
          const directCacheKey = `streams:private:direct:${channelId}`;
          let extracted = MemoryCache.get<ExtractedStream[]>(directCacheKey);

          if (!extracted || extracted.length === 0) {
            extracted = await DLStreamsExtractor.extractAll(channelId);
            if (extracted.length > 0) {
              MemoryCache.set(directCacheKey, extracted, CONFIG.STREAM_CACHE_TTL_MS);
            }
          }

          for (const s of extracted) {
            streams.push({
              name: 'RiveStream Live [Direct]',
              title: `⚽ [${ch.channel_name}] - ${s.mirrorName}\n1080p HLS (Direct CDN)`,
              url: s.streamUrl,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: s.headers
                }
              }
            });
          }
        }
      }

      if (streams.length > 0) {
        MemoryCache.set(cacheKey, streams, CONFIG.STREAM_CACHE_TTL_MS);
      }
      return { streams };
    }

    return { streams: [] };
  }
}
