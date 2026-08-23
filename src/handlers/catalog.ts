import { ChannelsService } from '../services/channels';
import { ScheduleService } from '../services/schedule';
import { UserConfig } from '../utils/configParser';

export interface StremioMetaPreview {
  id: string;
  type: string;
  name: string;
  poster?: string;
  posterShape?: 'poster' | 'landscape' | 'square';
  banner?: string;
  logo?: string;
  genres?: string[];
  description?: string;
}

export class CatalogHandler {
  /**
   * Gestisce le richieste di catalogo Stremio.
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

    // 1. Catalogo Canali Private (DaddyLive)
    if (id === 'rivestream-private') {
      if (userConfig?.enablePrivate === false) {
        return { metas: [] };
      }

      const { channels } = ChannelsService.getPrivateChannels({
        search,
        skip,
        limit: 100
      });

      const metas: StremioMetaPreview[] = channels.map(c => ({
        id: `rivestream:private:${c.id}`,
        type: 'tv',
        name: c.title,
        poster: 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
        posterShape: 'square',
        genres: ['Live TV', 'Sports', 'Private'],
        description: `Canale televisivo / sportivo ${c.title} (ID: ${c.id})`
      }));

      return { metas };
    }

    // 2. Catalogo Canali Public (Mondo)
    if (id === 'rivestream-public') {
      if (userConfig?.enablePublic === false) {
        return { metas: [] };
      }

      let country: string | undefined;
      let category: string | undefined;

      if (genre) {
        const countries = ChannelsService.getCountries();
        const foundCountry = countries.find(co => co.name.toLowerCase() === genre.toLowerCase());
        if (foundCountry) {
          country = foundCountry.code;
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

      const metas: StremioMetaPreview[] = channels.map(ch => ({
        id: `rivestream:public:${ch.id}`,
        type: 'tv',
        name: ch.name,
        poster: ch.logo || 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
        posterShape: 'square',
        genres: ch.categories && ch.categories.length > 0 ? ch.categories : ['IPTV', ch.country],
        description: `Canale IPTV Pubblico (${ch.country}) - ${ch.categories?.join(', ') || 'Generale'}`
      }));

      return { metas };
    }

    // 3. Catalogo Eventi Live (Palinsesto del giorno)
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

      const metas: StremioMetaPreview[] = list.slice(skip, skip + 100).map(ev => ({
        id: `rivestream:event:${ev.id}`,
        type: 'tv',
        name: `${ev.time ? `[${ev.time}] ` : ''}${ev.event}`,
        poster: 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
        posterShape: 'landscape',
        genres: [ev.category || 'Live Sports'],
        description: `Evento in diretta: ${ev.event} - Orario: ${ev.time || 'Live'} - Canali: ${ev.channels.map(c => c.channel_name).join(', ')}`
      }));

      return { metas };
    }

    return { metas: [] };
  }
}
