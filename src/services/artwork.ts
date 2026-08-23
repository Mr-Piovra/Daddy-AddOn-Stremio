import fs from 'fs';
import path from 'path';

export interface ChannelArtwork {
  poster: string;
  posterShape: 'poster' | 'landscape' | 'square';
  logo?: string;
  background?: string;
}

export interface CoverMapData {
  ita_portrait_map: Record<string, string>;
  world_portrait_map: Record<string, string>;
  landscape_map?: Record<string, string>;
}

export class ArtworkService {
  private static itaPortraitMap: Record<string, string> = {};
  private static worldPortraitMap: Record<string, string> = {};
  private static landscapeMap: Record<string, string> = {};
  private static m3uLogosMap: Record<string, string> = {};
  private static m3uPortraitMap: Record<string, string> = {};
  private static m3uLandscapeMap: Record<string, string> = {};
  private static isInitialized = false;

  private static readonly PLACEHOLD_BG = '0d1117';
  private static readonly PLACEHOLD_FG = '00e5ff';

  // Sport curated high quality banners / posters
  private static readonly SPORT_POSTERS: Record<string, { poster: string; background: string }> = {
    football: {
      poster: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&auto=format&fit=crop&q=80'
    },
    soccer: {
      poster: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&auto=format&fit=crop&q=80'
    },
    motorsport: {
      poster: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1600&auto=format&fit=crop&q=80'
    },
    f1: {
      poster: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1600&auto=format&fit=crop&q=80'
    },
    motogp: {
      poster: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1600&auto=format&fit=crop&q=80'
    },
    basketball: {
      poster: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&auto=format&fit=crop&q=80'
    },
    tennis: {
      poster: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1600&auto=format&fit=crop&q=80'
    },
    'combat sports': {
      poster: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=1600&auto=format&fit=crop&q=80'
    },
    boxing: {
      poster: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=1600&auto=format&fit=crop&q=80'
    },
    mma: {
      poster: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=1600&auto=format&fit=crop&q=80'
    },
    rugby: {
      poster: 'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=1600&auto=format&fit=crop&q=80'
    },
    cricket: {
      poster: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1600&auto=format&fit=crop&q=80'
    },
    golf: {
      poster: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1600&auto=format&fit=crop&q=80'
    },
    baseball: {
      poster: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=1600&auto=format&fit=crop&q=80'
    },
    'ice hockey': {
      poster: 'https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=1600&auto=format&fit=crop&q=80'
    },
    default: {
      poster: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
      background: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600&auto=format&fit=crop&q=80'
    }
  };

  /**
   * Inizializza i dataset delle copertine da disco e avvia il download M3U in background.
   */
  public static init(): void {
    if (this.isInitialized) return;

    try {
      const candidates = [
        path.join(__dirname, '../data/channel-cover-maps.generated.json'),
        path.join(__dirname, '../../src/data/channel-cover-maps.generated.json'),
        path.join(__dirname, '../../references/tvvoo/src/channel-cover-maps.generated.json')
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const data = JSON.parse(raw) as CoverMapData;
          this.itaPortraitMap = data.ita_portrait_map || {};
          this.worldPortraitMap = data.world_portrait_map || {};
          this.landscapeMap = data.landscape_map || {};
          console.log(`[ArtworkService] Inizializzate copertine da ${path.basename(p)}: IT=${Object.keys(this.itaPortraitMap).length}, World=${Object.keys(this.worldPortraitMap).length}`);
          break;
        }
      }

      this.isInitialized = true;

      // Aggiornamento M3U in background (non bloccante)
      setTimeout(() => {
        this.fetchM3UCovers().catch(() => {});
      }, 2000);
    } catch (err) {
      console.error('[ArtworkService] Errore inizializzazione copertine:', err);
    }
  }

  /**
   * Restituisce il pacchetto artwork completo (poster, logo, background, posterShape) per un canale.
   */
  public static getChannelArtwork(name: string, countryCode?: string, fallbackLogo?: string): ChannelArtwork {
    this.init();

    const isItalian = (countryCode || '').toUpperCase() === 'IT' ||
      /\b(italy|italia|rai|mediaset|sky italia|canale|rete 4|la7|tv8|nove|dazn \d+ it)\b/i.test(name);

    // 1. Cerca copertina portrait dedicata
    let poster = this.findPortraitCover(name, isItalian);

    // 2. Se non presente mappa generata, controlla M3U portrait
    if (!poster) {
      const cleanKey = this.normalizeKey(this.cleanChannelName(name));
      poster = this.m3uPortraitMap[`it:${cleanKey}`] || this.m3uPortraitMap[cleanKey];
    }

    // 3. Cerca Logo dedicato
    const logo = fallbackLogo || this.findChannelLogo(name, isItalian);

    // 4. Se ancora senza poster ma abbiamo un logo valido, usa il logo come fallback oppure placeholder moderno
    if (!poster) {
      if (fallbackLogo && !fallbackLogo.includes('tvvoo.png')) {
        poster = fallbackLogo;
      } else {
        poster = this.buildPlaceholder(name, 'poster');
      }
    }

    // 5. Cerca Background (landscape)
    let background: string | undefined;
    if (poster && poster.includes('/portrait/')) {
      background = poster.replace('/portrait/', '/landscape/');
    } else {
      const cleanKey = this.normalizeKey(this.cleanChannelName(name));
      background = this.landscapeMap[cleanKey] || this.m3uLandscapeMap[`it:${cleanKey}`] || poster;
    }

    return {
      poster,
      posterShape: 'poster',
      logo: logo || undefined,
      background: background || poster
    };
  }

  /**
   * Restituisce l'artwork per un evento live sportivo in base alla categoria/sport e titolo.
   */
  public static getEventArtwork(eventTitle: string, category?: string): ChannelArtwork {
    this.init();

    const catKey = (category || '').toLowerCase().trim();
    let sportArt = this.SPORT_POSTERS[catKey];

    if (!sportArt) {
      const titleLower = eventTitle.toLowerCase();
      if (titleLower.includes('vs') || titleLower.includes('fc') || titleLower.includes('calcio') || titleLower.includes('league') || titleLower.includes('cup') || titleLower.includes('serie a') || titleLower.includes('premier')) {
        sportArt = this.SPORT_POSTERS.football;
      } else if (titleLower.includes('gp') || titleLower.includes('formula') || titleLower.includes('f1') || titleLower.includes('motogp') || titleLower.includes('nascar')) {
        sportArt = this.SPORT_POSTERS.motorsport;
      } else if (titleLower.includes('nba') || titleLower.includes('basket') || titleLower.includes('euroleague')) {
        sportArt = this.SPORT_POSTERS.basketball;
      } else if (titleLower.includes('atp') || titleLower.includes('wta') || titleLower.includes('tennis') || titleLower.includes('wimbledon') || titleLower.includes('open')) {
        sportArt = this.SPORT_POSTERS.tennis;
      } else if (titleLower.includes('ufc') || titleLower.includes('boxing') || titleLower.includes('mma') || titleLower.includes('fight') || titleLower.includes('wwe')) {
        sportArt = this.SPORT_POSTERS['combat sports'];
      } else if (titleLower.includes('rugby') || titleLower.includes('six nations')) {
        sportArt = this.SPORT_POSTERS.rugby;
      } else {
        sportArt = this.SPORT_POSTERS.default;
      }
    }

    return {
      poster: sportArt.poster,
      posterShape: 'landscape',
      logo: undefined,
      background: sportArt.background
    };
  }

  /**
   * Cerca una copertina portrait nella mappa per il nome del canale fornito.
   */
  private static findPortraitCover(name: string, isItalian: boolean): string | null {
    const clean = this.cleanChannelName(name);
    const normRaw = this.normalizeKey(name);
    const normClean = this.normalizeKey(clean);
    const normHyphenated = this.normalizeKey(
      clean.replace(/([a-zA-Z])(\d)/g, '$1-$2').replace(/(\d)([a-zA-Z])/g, '$1-$2')
    );

    // Gestione alias Sky Calcio / Sky Sport Calcio
    let aliasSkyCalcio: string | undefined;
    if (/sky\s*calcio/i.test(clean)) {
      aliasSkyCalcio = normClean.replace('sky-calcio', 'sky-sport-calcio');
    }

    // Gestione alias DAZN
    let aliasDazn: string | undefined;
    const daznMatch = clean.match(/dazn\s*(\d+|f1|laliga\s*\d*)/i);
    if (daznMatch) {
      aliasDazn = `dazn-${this.normalizeKey(daznMatch[1])}`;
    }

    const keys = Array.from(new Set([normRaw, normClean, normHyphenated, aliasSkyCalcio, aliasDazn])).filter(Boolean) as string[];

    const primaryMap = isItalian ? this.itaPortraitMap : this.worldPortraitMap;
    const secondaryMap = isItalian ? this.worldPortraitMap : this.itaPortraitMap;

    // 1. Corrispondenza diretta
    for (const k of keys) {
      if (primaryMap[k]) return primaryMap[k];
      if (secondaryMap[k]) return secondaryMap[k];
    }

    // 2. Suffissi frequenti (-1, -2, -d, -mpd, -hd, -backup)
    const suffixes = ['-1', '-2', '-3', '-d', '-mpd', '-hd', '-backup'];
    for (const k of keys) {
      for (const suf of suffixes) {
        if (primaryMap[k + suf]) return primaryMap[k + suf];
        if (secondaryMap[k + suf]) return secondaryMap[k + suf];
      }
    }

    // 3. Match prefisso parola (lunghezza >= 4)
    for (const k of keys) {
      if (k.length >= 4) {
        const pMatch = Object.keys(primaryMap).find(x => x.startsWith(`${k}-`));
        if (pMatch) return primaryMap[pMatch];
        const sMatch = Object.keys(secondaryMap).find(x => x.startsWith(`${k}-`));
        if (sMatch) return secondaryMap[sMatch];
      }
    }

    // 4. Fallback generico per DAZN
    if (/dazn/i.test(name)) {
      if (primaryMap['dazn-1'] || secondaryMap['dazn-1']) {
        return primaryMap['dazn-1'] || secondaryMap['dazn-1'];
      }
    }

    // 5. Fallback generico per Sky Calcio
    if (/sky.*calcio/i.test(name)) {
      if (primaryMap['sky-sport-calcio']) return primaryMap['sky-sport-calcio'];
    }

    return null;
  }

  private static findChannelLogo(name: string, isItalian: boolean): string | null {
    const cleanKey = this.normalizeKey(this.cleanChannelName(name));
    if (isItalian && this.m3uLogosMap[`it:${cleanKey}`]) {
      return this.m3uLogosMap[`it:${cleanKey}`];
    }
    if (this.m3uLogosMap[cleanKey]) {
      return this.m3uLogosMap[cleanKey];
    }
    return null;
  }

  public static cleanChannelName(name: string): string {
    if (!name) return '';
    return name
      .replace(/^[0-9]+(?=[a-zA-Z])/, '') // Rimuove prefissi numerici come "8Sky" -> "Sky"
      .replace(/\s*(\.[a-z0-9]{1,3})+$/i, '')
      .replace(/\s*\((?:\d+|[A-Za-z]{1,3})\)\s*$/i, '')
      .replace(/\s+(italy|italia|usa|uk|canada|australia|germany|france|spain|poland|serbia|croatia|de|es|fr|it)\b/gi, '')
      .replace(/\s+(hd|fhd|uhd|4k|sd|1080p|720p|hevc|raw|vip)\b/gi, '')
      .replace(/[\+\*\#\_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static normalizeKey(name: string): string {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private static buildPlaceholder(name: string, shape: 'poster' | 'landscape'): string {
    const size = shape === 'poster' ? '600x900' : '800x450';
    const text = encodeURIComponent(this.cleanChannelName(name).toUpperCase() || 'LIVE TV');
    return `https://placehold.co/${size}/${this.PLACEHOLD_BG}/${this.PLACEHOLD_FG}.png?font=montserrat&text=${text}`;
  }

  /**
   * Sincronizza loghi e copertine M3U in background.
   */
  private static async fetchM3UCovers(): Promise<void> {
    try {
      const url = 'https://raw.githubusercontent.com/piholo/logo/main/lista.m3u';
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) return;

      const text = await resp.text();
      const lines = text.split(/\r?\n/);
      let count = 0;

      for (const line of lines) {
        if (!line.startsWith('#EXTINF')) continue;

        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const portraitMatch = line.match(/tvg-cover-portrait="([^"]+)"/);
        const landscapeMatch = line.match(/tvg-cover-landscape="([^"]+)"/);
        const commaIdx = line.indexOf(',');
        const rawName = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : '';

        const cleanKey = this.normalizeKey(this.cleanChannelName(rawName));
        if (!cleanKey) continue;

        if (logoMatch?.[1]) {
          this.m3uLogosMap[`it:${cleanKey}`] = logoMatch[1];
          this.m3uLogosMap[cleanKey] = logoMatch[1];
        }
        if (portraitMatch?.[1]) {
          this.m3uPortraitMap[`it:${cleanKey}`] = portraitMatch[1];
          this.m3uPortraitMap[cleanKey] = portraitMatch[1];
        }
        if (landscapeMatch?.[1]) {
          this.m3uLandscapeMap[`it:${cleanKey}`] = landscapeMatch[1];
          this.m3uLandscapeMap[cleanKey] = landscapeMatch[1];
        }
        count++;
      }

      console.log(`[ArtworkService] M3U live artwork sincronizzato (${count} voci processate).`);
    } catch (err) {
      // Ignora errori di rete per il fallback M3U
    }
  }
}
