import { ChannelsService } from './services/channels';
import { UserConfig } from './utils/configParser';

export function getManifest(userConfig?: UserConfig) {
  const countries = ChannelsService.getCountries();
  const categories = ChannelsService.getCategories();

  const popularCountryNames = [
    'Italy', 'United States', 'United Kingdom', 'Spain', 'France',
    'Germany', 'Portugal', 'Albania', 'Turkey', 'Netherlands',
    'Argentina', 'Brazil', 'Canada', 'Mexico', 'Greece'
  ];

  const availableCountryOptions = countries
    .filter(c => popularCountryNames.includes(c.name))
    .map(c => c.name);

  const categoryOptions = categories.map(c => c.name);

  const publicGenreOptions = [
    ...availableCountryOptions,
    ...categoryOptions
  ];

  const catalogs: any[] = [];

  // 1. Private Catalogs (se abilitato)
  if (userConfig?.enablePrivate !== false) {
    catalogs.push({
      type: 'tv',
      id: 'rivestream-private',
      name: '⚡ RiveStream Private TV & Sport',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false }
      ]
    });
  }

  // 2. Events Catalog (se abilitato)
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

  // 3. Public Catalog (se abilitato)
  if (userConfig?.enablePublic !== false) {
    catalogs.push({
      type: 'tv',
      id: 'rivestream-public',
      name: '📺 RiveStream World IPTV',
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
    version: '1.0.0',
    name: userConfig?.proxyUrl ? 'RiveStream IPTV [Proxy]' : 'RiveStream IPTV',
    description: 'Guarda oltre 1.450 canali TV & Sport (DaddyLive HD), 8.400+ canali IPTV mondiali ed eventi live da RiveStream direttamente su Stremio.',
    logo: 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
    background: 'https://raw.githubusercontent.com/qwertyuiop8899/tvvoo/refs/heads/main/public/tvvoo.png',
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
