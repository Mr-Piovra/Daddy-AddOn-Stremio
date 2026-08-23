import { ChannelsService } from './services/channels';
import { UserConfig } from './utils/configParser';

export function getManifest(userConfig?: UserConfig) {
  const catalogs: any[] = [];

  // 1. Private Catalogs (DaddyLive HD - IT & EN)
  if (userConfig?.enablePrivate !== false) {
    catalogs.push({
      type: 'tv',
      id: 'rivestream-private',
      name: '⚡ RiveStream TV & Sport (IT / EN)',
      extra: [
        {
          name: 'genre',
          isRequired: false,
          options: [
            'All',
            '🇮🇹 Canali Italiani',
            '🇬🇧 UK / USA / Sport',
            '⚽ Sky Sport',
            '🎬 Cinema & Serie TV'
          ]
        },
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false }
      ]
    });
  }

  // 2. Events Catalog (Palinsesto Live Sports)
  if (userConfig?.enableEvents !== false) {
    catalogs.push({
      type: 'tv',
      id: 'rivestream-events',
      name: '⚽ RiveStream Live Events',
      extra: [
        {
          name: 'genre',
          isRequired: false,
          options: [
            'All',
            'Football',
            'Motorsport',
            'Basketball',
            'Tennis',
            'Combat Sports',
            'Rugby',
            'Cricket',
            'Upcoming Events'
          ]
        },
        { name: 'search', isRequired: false }
      ]
    });
  }

  // 3. Public Catalog (IPTV Italia & Canali Inglesi)
  if (userConfig?.enablePublic !== false) {
    const publicGenreOptions = [
      '🇮🇹 Italia',
      '🇬🇧 United Kingdom',
      '🇺🇸 United States',
      '🇨🇦 Canada',
      '🇦🇺 Australia',
      'Sports',
      'News',
      'Movies',
      'Entertainment',
      'Documentary',
      'Music',
      'Kids',
      'Animation',
      'General'
    ];

    catalogs.push({
      type: 'tv',
      id: 'rivestream-public',
      name: '📺 RiveStream IPTV (IT / EN)',
      extra: [
        {
          name: 'genre',
          isRequired: false,
          options: publicGenreOptions
        },
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false }
      ]
    });
  }

  return {
    id: 'org.rivestream.stremio',
    version: '1.1.0',
    name: userConfig?.proxyUrl ? 'RiveStream IPTV [Proxy]' : 'RiveStream IPTV',
    description: 'Guarda i migliori canali TV & Sport italiani ed inglesi (DaddyLive HD, Sky, DAZN, Rai, Mediaset, ESPN, TNT Sports) ed eventi live direttamente su Stremio con copertine dedicate.',
    logo: 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
    background: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&auto=format&fit=crop&q=80',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    catalogs,
    idPrefixes: ['rivestream:'],
    behaviorHints: {
      configurable: true,
      configurationRequired: false
    }
  };
}
