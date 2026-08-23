import { ChannelsService } from '../services/channels';
import { ScheduleService } from '../services/schedule';
import { ArtworkService } from '../services/artwork';
import { UserConfig } from '../utils/configParser';

export interface StremioMetaPreview {
  id: string;
  type: string;
  name: string;
  poster?: string;
  posterShape?: 'poster' | 'landscape' | 'square';
  banner?: string;
  logo?: string;
  background?: string;
  genres?: string[];
  description?: string;
}

export class CatalogHandler {
  /**
   * Gestisce le richieste di catalogo Stremio con copertine personalizzate e filtro IT/EN.
   */
  public static async handle(args: {
    type: string;
    id: string;
    extra?: { search?: string; genre?: string; skip?: number };
    userConfig?: UserConfig;
  }): Promise<{ metas: StremioMetaPreview[] }> {
    const { id, extra, userConfig } = args;
    const skip = extra?.skip ? parseInt(extra.skip as unknown as string, 10) : 0;
    const search = extra?.search;
    const genre = extra?.genre;

    // 1. Catalogo Canali Private (DaddyLive HD - IT & EN)
    if (id === 'rivestream-private') {
      if (userConfig?.enablePrivate === false) {
        return { metas: [] };
      }

      let languageFilter: 'it' | 'en' | undefined;
      let effectiveGenre = genre;

      if (genre) {
        if (genre.includes('Italian')) {
          languageFilter = 'it';
        } else if (genre.includes('UK') || genre.includes('USA') || genre.includes('Sport')) {
          languageFilter = 'en';
        }
      }

      const { channels } = ChannelsService.getPrivateChannels({
        search,
        genre: effectiveGenre,
        language: languageFilter,
        skip,
        limit: 100
      });

      const metas: StremioMetaPreview[] = channels.map(c => {
        const art = ArtworkService.getChannelArtwork(c.title, c.language === 'it' ? 'IT' : 'US');
        return {
          id: `rivestream:private:${c.id}`,
          type: 'tv',
          name: c.title,
          poster: art.poster,
          posterShape: 'poster',
          logo: art.logo,
          background: art.background,
          genres: [c.group || 'Live TV', c.language === 'it' ? 'Italia' : 'English'],
          description: `Canale ${c.title} • ${c.group || 'Live TV'} (ID: ${c.id})`
        };
      });

      return { metas };
    }

    // 2. Catalogo Canali Public (IPTV Italia e Canali Inglesi)
    if (id === 'rivestream-public') {
      if (userConfig?.enablePublic === false) {
        return { metas: [] };
      }

      let country: string | undefined;
      let category: string | undefined;

      if (genre) {
        if (genre.includes('Italia') || genre.toLowerCase() === 'italy') {
          country = 'IT';
        } else if (genre.includes('United Kingdom') || genre.toLowerCase() === 'uk') {
          country = 'UK';
        } else if (genre.includes('United States') || genre.toLowerCase() === 'us') {
          country = 'US';
        } else if (genre.includes('Canada') || genre.toLowerCase() === 'ca') {
          country = 'CA';
        } else if (genre.includes('Australia') || genre.toLowerCase() === 'au') {
          country = 'AU';
        } else {
          category = genre;
        }
      }

      const { channels } = ChannelsService.getPublicChannels({
        country,
        category,
        search,
        skip,
        limit: 100
      });

      const metas: StremioMetaPreview[] = channels.map(ch => {
        const art = ArtworkService.getChannelArtwork(ch.name, ch.country, ch.logo);
        return {
          id: `rivestream:public:${ch.id}`,
          type: 'tv',
          name: ch.name,
          poster: art.poster,
          posterShape: 'poster',
          logo: art.logo || ch.logo,
          background: art.background,
          genres: ch.categories && ch.categories.length > 0 ? ch.categories : ['IPTV', ch.country],
          description: `Canale IPTV Pubblico (${ch.country}) - ${ch.categories?.join(', ') || 'Generale'}`
        };
      });

      return { metas };
    }

    // 3. Catalogo Eventi Live (Palinsesto sportivo con grafiche dedicate)
    if (id === 'rivestream-events') {
      if (userConfig?.enableEvents === false) {
        return { metas: [] };
      }

      const events = await ScheduleService.getLiveEvents();
      let list = events;

      if (genre && genre !== 'All') {
        list = list.filter(e => e.category.toLowerCase() === genre.toLowerCase());
      }

      if (search) {
        const q = search.toLowerCase();
        list = list.filter(e => e.event.toLowerCase().includes(q));
      }

      const metas: StremioMetaPreview[] = list.slice(skip, skip + 100).map(ev => {
        const art = ArtworkService.getEventArtwork(ev.event, ev.category);
        return {
          id: `rivestream:event:${ev.id}`,
          type: 'tv',
          name: `${ev.time ? `[${ev.time}] ` : ''}${ev.event}`,
          poster: art.poster,
          posterShape: 'landscape',
          background: art.background,
          genres: [ev.category || 'Live Sports'],
          description: `Evento in diretta: ${ev.event} - Orario: ${ev.time || 'Live'} - Canali: ${ev.channels.map(c => c.channel_name).join(', ')}`
        };
      });

      return { metas };
    }

    return { metas: [] };
  }
}
