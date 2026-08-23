import { ChannelsService } from '../services/channels';
import { ScheduleService } from '../services/schedule';
import { StremioMetaPreview } from './catalog';

export interface StremioMetaDetail extends StremioMetaPreview {
  background?: string;
  website?: string;
}

export class MetaHandler {
  /**
   * Restituisce i dettagli completi dei metadati per un canale o evento.
   */
  public static async handle(args: {
    type: string;
    id: string;
  }): Promise<{ meta: StremioMetaDetail | null }> {
    const { id } = args;

    // 1. Canale Private
    if (id.startsWith('rivestream:private:')) {
      const channelId = id.replace('rivestream:private:', '');
      const channel = ChannelsService.getPrivateChannelById(channelId);

      if (!channel) return { meta: null };

      return {
        meta: {
          id: `rivestream:private:${channel.id}`,
          type: 'tv',
          name: channel.title,
          poster: 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
          posterShape: 'square',
          genres: ['Live TV', 'Sports', 'Private'],
          description: `Canale televisivo / sportivo ${channel.title}\nID Stream: ${channel.id}\nProvider: RiveStream / DaddyLive HD`
        }
      };
    }

    // 2. Canale Public
    if (id.startsWith('rivestream:public:')) {
      const channelId = id.replace('rivestream:public:', '');
      const channel = ChannelsService.getPublicChannelById(channelId);

      if (!channel) return { meta: null };

      return {
        meta: {
          id: `rivestream:public:${channel.id}`,
          type: 'tv',
          name: channel.name,
          poster: channel.logo || 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
          logo: channel.logo,
          posterShape: 'square',
          genres: channel.categories && channel.categories.length > 0 ? channel.categories : ['IPTV', channel.country],
          website: channel.website,
          description: `Canale IPTV Pubblico (${channel.country})\nCategorie: ${channel.categories?.join(', ') || 'Generale'}\nSito web: ${channel.website || 'N/A'}`
        }
      };
    }

    // 3. Evento Live
    if (id.startsWith('rivestream:event:')) {
      const eventId = id.replace('rivestream:event:', '');
      const event = await ScheduleService.getEventById(eventId);

      if (!event) return { meta: null };

      const channelsListText = event.channels.map(c => `• ${c.channel_name} (ID: ${c.channel_id})`).join('\n');

      return {
        meta: {
          id: `rivestream:event:${event.id}`,
          type: 'tv',
          name: `${event.time ? `[${event.time}] ` : ''}${event.event}`,
          poster: 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
          posterShape: 'landscape',
          genres: [event.category || 'Live Sports'],
          description: `Evento Live: ${event.event}\nOrario: ${event.time || 'Live'}\nCategoria: ${event.category}\n\nCanali che trasmettono:\n${channelsListText}`
        }
      };
    }

    return { meta: null };
  }
}
