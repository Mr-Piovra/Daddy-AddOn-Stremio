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
   * Gestisce la risoluzione degli stream in modo pulito e affidabile.
   * Quando EasyProxy è configurato, genera gli stream che delegano l'estrazione a EasyProxy
   * passando contestualmente gli header Referer/Origin richiesti dalla CDN per evitare sia 403 Invalid Token che 403 Invalid Referer.
   */
  public static async handle(args: {
    type: string;
    id: string;
    userConfig?: UserConfig;
  }): Promise<{ streams: StremioStream[] }> {
    const { id, userConfig } = args;
    const hasCustomProxy = !!userConfig?.proxyUrl?.trim();
    const proxyLabel = userConfig?.proxyType === 'mediaflow' ? 'MediaFlow' : 'EasyProxy';

    // 1. Canale Private (DaddyLive HD)
    if (id.startsWith('rivestream:private:')) {
      const channelId = id.replace('rivestream:private:', '').replace(/\D/g, '');
      const streams: StremioStream[] = [];

      // A. Flussi EasyProxy
      if (hasCustomProxy) {
        // Risolve lo stream tramite EasyProxy per ciascun mirror
        const proxyPromises = CONFIG.MIRRORS.map(async (mirror) => {
          const candidateUrl = `${mirror.baseUrl.replace(/\/+$/, '')}/stream/stream-${channelId}.php`;
          const proxyUrl = await ProxyBuilder.resolveEasyProxyStream(
            candidateUrl,
            userConfig,
            'dlstreams',
            {
              Referer: 'https://hamis.romponalis.st/',
              Origin: 'https://hamis.romponalis.st'
            }
          );

          const isResolved = proxyUrl.includes('/proxy/hls/manifest.m3u8');

          return {
            isResolved,
            stream: {
              name: `RiveStream [${proxyLabel}]`,
              title: `⚡ ${mirror.name}\n1080p HLS (${proxyLabel})`,
              url: proxyUrl,
              behaviorHints: {
                notWebReady: false
              }
            }
          };
        });

        const results = await Promise.all(proxyPromises);
        const resolved = results.filter((r) => r.isResolved).map((r) => r.stream);

        if (resolved.length > 0) {
          streams.push(...resolved);
        } else {
          streams.push(...results.map((r) => r.stream));
        }

        // Se l'utente ha richiesto anche i diretti
        if (userConfig?.includeDirect) {
          const cacheKey = `streams:private:${channelId}`;
          let extracted = MemoryCache.get<ExtractedStream[]>(cacheKey);

          if (!extracted || extracted.length === 0) {
            extracted = await DLStreamsExtractor.extractAll(channelId);
            if (extracted.length > 0) {
              MemoryCache.set(cacheKey, extracted, CONFIG.STREAM_CACHE_TTL_MS);
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
        // Nessun proxy: estrazione locale diretta
        const cacheKey = `streams:private:${channelId}`;
        let extracted = MemoryCache.get<ExtractedStream[]>(cacheKey);

        if (!extracted || extracted.length === 0) {
          extracted = await DLStreamsExtractor.extractAll(channelId);
          if (extracted.length > 0) {
            MemoryCache.set(cacheKey, extracted, CONFIG.STREAM_CACHE_TTL_MS);
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
          const proxyPromises = CONFIG.MIRRORS.slice(0, 2).map(async (mirror) => {
            const candidateUrl = `${mirror.baseUrl.replace(/\/+$/, '')}/stream/stream-${channelId}.php`;
            const proxyUrl = await ProxyBuilder.resolveEasyProxyStream(
              candidateUrl,
              userConfig,
              'dlstreams',
              {
                Referer: 'https://hamis.romponalis.st/',
                Origin: 'https://hamis.romponalis.st'
              }
            );

            const isResolved = proxyUrl.includes('/proxy/hls/manifest.m3u8');

            return {
              isResolved,
              stream: {
                name: `RiveStream Live [${proxyLabel}]`,
                title: `⚽ [${ch.channel_name}] - ${mirror.name}\n1080p HLS (${proxyLabel})`,
                url: proxyUrl,
                behaviorHints: {
                  notWebReady: false
                }
              }
            };
          });

          const results = await Promise.all(proxyPromises);
          const resolved = results.filter((r) => r.isResolved).map((r) => r.stream);

          if (resolved.length > 0) {
            streams.push(...resolved);
          } else {
            streams.push(...results.map((r) => r.stream));
          }

          if (userConfig?.includeDirect) {
            const cacheKey = `streams:private:${channelId}`;
            let extracted = MemoryCache.get<ExtractedStream[]>(cacheKey);

            if (!extracted || extracted.length === 0) {
              extracted = await DLStreamsExtractor.extractAll(channelId);
              if (extracted.length > 0) {
                MemoryCache.set(cacheKey, extracted, CONFIG.STREAM_CACHE_TTL_MS);
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
          const cacheKey = `streams:private:${channelId}`;
          let extracted = MemoryCache.get<ExtractedStream[]>(cacheKey);

          if (!extracted || extracted.length === 0) {
            extracted = await DLStreamsExtractor.extractAll(channelId);
            if (extracted.length > 0) {
              MemoryCache.set(cacheKey, extracted, CONFIG.STREAM_CACHE_TTL_MS);
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

      return { streams };
    }

    return { streams: [] };
  }
}
