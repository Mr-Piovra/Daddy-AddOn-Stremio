import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';

export interface PrivateChannel {
  id: string;
  title: string;
  category?: string;
  language?: 'it' | 'en' | 'other';
  group?: string;
  country?: string;
  logo?: string;
}

export interface PublicChannel {
  id: string;
  name: string;
  logo?: string;
  country: string;
  categories: string[];
  streamUrl: string;
  website?: string;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Country {
  code: string;
  name: string;
  flag?: string;
  count: number;
}

export class ChannelsService {
  private static privateChannels: PrivateChannel[] = [];
  private static publicChannels: PublicChannel[] = [];
  private static categories: Category[] = [];
  private static countries: Country[] = [];
  private static isInitialized = false;

  private static DISK_CACHE_DIR = path.join(__dirname, '../../cache/channels');
  private static ALLOWED_PUBLIC_COUNTRIES = ['IT', 'US', 'UK', 'GB', 'CA', 'AU'];

  /**
   * Classifica un canale DaddyLive per lingua e gruppo.
   */
  public static classifyPrivateChannel(title: string): { language: 'it' | 'en' | 'other'; group: string; country: string } {
    const isExplicitNonIt = /\b(uk|usa|us|ca|au|nz|de|fr|es|pl|rs|hr|bg|ro|gr|tr|il|ru|al|ar|nl|se|dk|no|fi|cz|sk|hu)\b/i.test(title);

    // Controlla se canale Italiano
    const isIt = /\b(italy|italia)\b/i.test(title) ||
      (!isExplicitNonIt && /\b(rai|mediaset|canale 5|italia 1|rete 4|la7|tv8|nove|twentyseven|sportitalia|supertennis|top calcio|tgcom24|cine34|iris|dmax it|focus it)\b/i.test(title));

    if (isIt) {
      return { language: 'it', country: 'Italy', group: '🇮🇹 Canali Italiani' };
    }

    // Controlla se canale di paesi terzi non richiesti (Germania, Spagna, Polonia, Serbia, Russia, ecc.)
    const isOther = /\b(de|germany|fr|france|es|spain|laliga|movistar|pl|poland|polsat|rs|serbia|hr|croatia|bg|bulgaria|ro|romania|gr|greece|tr|turkey|il|israel|ru|russia|al|albania|ar|arabic|nl|netherlands|se|sweden|dk|denmark|no|norway|fi|finland|cz|czech|sk|slovakia|hu|hungary)\b/i.test(title);
    if (isOther) {
      return { language: 'other', country: 'Other', group: 'Altro' };
    }

    // Default: Canali Inglesi / Internazionali (USA, UK, Australia, Canada, Sport internazionali)
    return { language: 'en', country: 'English / International', group: '🇬🇧 UK / USA / Sport' };
  }

  /**
   * Inizializza i canali caricando il dataset locale e applicando i filtri mirati (IT + EN).
   */
  public static init(): void {
    if (this.isInitialized) return;

    try {
      const dataDir = path.join(__dirname, '../data');

      const privatePath = path.join(dataDir, 'privateChannels.json');
      const publicPath = path.join(dataDir, 'publicChannels.json');
      const categoriesPath = path.join(dataDir, 'categories.json');
      const countriesPath = path.join(dataDir, 'countries.json');

      // 1. Carica e filtra Canali Private (DaddyLive)
      if (fs.existsSync(privatePath)) {
        const rawPrivate: Array<{ id: string; title: string }> = JSON.parse(fs.readFileSync(privatePath, 'utf8'));
        this.privateChannels = rawPrivate
          .map(c => {
            const cl = this.classifyPrivateChannel(c.title);
            return {
              id: c.id,
              title: c.title,
              language: cl.language,
              group: cl.group,
              country: cl.country
            };
          })
          // Filtra escludendo le lingue non richieste (mantenendo solo IT ed EN)
          .filter(c => c.language === 'it' || c.language === 'en');
      }

      // 2. Carica e filtra Canali Public (World IPTV limitato a IT + EN)
      if (fs.existsSync(publicPath)) {
        const rawPublic: PublicChannel[] = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
        this.publicChannels = rawPublic.filter(c => 
          this.ALLOWED_PUBLIC_COUNTRIES.includes((c.country || '').toUpperCase())
        );
      }

      // 3. Paesi supportati focalizzati
      this.countries = [
        { code: 'IT', name: 'Italy', flag: '🇮🇹', count: this.publicChannels.filter(c => c.country.toUpperCase() === 'IT').length },
        { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', count: this.publicChannels.filter(c => ['UK', 'GB'].includes(c.country.toUpperCase())).length },
        { code: 'US', name: 'United States', flag: '🇺🇸', count: this.publicChannels.filter(c => c.country.toUpperCase() === 'US').length },
        { code: 'CA', name: 'Canada', flag: '🇨🇦', count: this.publicChannels.filter(c => c.country.toUpperCase() === 'CA').length },
        { code: 'AU', name: 'Australia', flag: '🇦🇺', count: this.publicChannels.filter(c => c.country.toUpperCase() === 'AU').length }
      ];

      // 4. Categorie rilevanti
      if (fs.existsSync(categoriesPath)) {
        const rawCategories: Array<{ id: string; name: string }> = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        const catCounts: Record<string, number> = {};
        for (const ch of this.publicChannels) {
          for (const cat of ch.categories || []) {
            const k = cat.toLowerCase();
            catCounts[k] = (catCounts[k] || 0) + 1;
          }
        }
        this.categories = rawCategories
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            count: catCounts[cat.id.toLowerCase()] || 0
          }))
          .filter(cat => cat.count > 0);
      }

      // 5. Cache aggiuntiva su disco
      this.loadCachedChannelsFromDisk();

      this.isInitialized = true;
      console.log(`[ChannelsService] Inizializzazione completata: ${this.privateChannels.length} canali Private (IT/EN) e ${this.publicChannels.length} canali Public (IT/EN).`);

      // 6. Sync periodico non bloccante
      this.scheduleBackgroundSync();
    } catch (err) {
      console.error('[ChannelsService] Errore inizializzazione dataset:', err);
    }
  }

  public static getPrivateChannels(filter?: {
    search?: string;
    genre?: string;
    language?: 'it' | 'en';
    skip?: number;
    limit?: number;
  }): { channels: PrivateChannel[]; total: number } {
    this.init();
    let list = this.privateChannels;

    if (filter?.language) {
      list = list.filter(c => c.language === filter.language);
    }

    if (filter?.genre && filter.genre !== 'All') {
      const g = filter.genre.toLowerCase();
      if (g.includes('ital')) {
        list = list.filter(c => c.language === 'it');
      } else if (g.includes('uk') || g.includes('usa') || g.includes('sport') || g.includes('eng')) {
        list = list.filter(c => c.language === 'en');
      } else if (g.includes('sky')) {
        list = list.filter(c => /sky/i.test(c.title));
      }
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.id.includes(q));
    }

    const total = list.length;
    const skip = filter?.skip || 0;
    const limit = filter?.limit || 100;

    return {
      channels: list.slice(skip, skip + limit),
      total
    };
  }

  public static getPrivateChannelById(id: string): PrivateChannel | null {
    this.init();
    const cleanId = id.replace(/\D/g, '');
    return this.privateChannels.find(c => c.id === cleanId) || null;
  }

  public static getPublicChannels(filter?: {
    country?: string;
    category?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): { channels: PublicChannel[]; total: number } {
    this.init();
    let list = this.publicChannels;

    if (filter?.country) {
      const co = filter.country.toUpperCase();
      if (co === 'UK' || co === 'GB') {
        list = list.filter(c => ['UK', 'GB'].includes(c.country.toUpperCase()));
      } else {
        list = list.filter(c => c.country.toUpperCase() === co);
      }
    }

    if (filter?.category) {
      const cat = filter.category.toLowerCase();
      list = list.filter(c => (c.categories || []).some(k => k.toLowerCase() === cat));
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    }

    const total = list.length;
    const skip = filter?.skip || 0;
    const limit = filter?.limit || 100;

    return {
      channels: list.slice(skip, skip + limit),
      total
    };
  }

  public static getPublicChannelById(id: string): PublicChannel | null {
    this.init();
    return this.publicChannels.find(c => c.id === id) || null;
  }

  public static getCategories(): Category[] {
    this.init();
    return this.categories;
  }

  public static getCountries(): Country[] {
    this.init();
    return this.countries;
  }

  /**
   * Esegue la sincronizzazione asincrona dei canali in background filtrando solo IT / EN.
   */
  public static async syncChannelsFromRemote(): Promise<void> {
    try {
      for (const mirror of CONFIG.MIRRORS) {
        try {
          const resp = await fetch(`${mirror.baseUrl}/24-7-channels.php`, {
            headers: { 'User-Agent': CONFIG.USER_AGENT, 'Referer': mirror.baseUrl },
            signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS)
          });
          if (resp.ok) {
            const html = await resp.text();
            const channelMatches = html.matchAll(/href=["'](?:\/stream)?\/stream-(\d+)\.php["'][^>]*>([^<]+)<\/a>/gi);
            let addedCount = 0;

            for (const m of channelMatches) {
              const chId = m[1];
              const title = m[2].trim();
              const cl = this.classifyPrivateChannel(title);

              // Accetta solo canali Italiani o Inglesi
              if (cl.language === 'it' || cl.language === 'en') {
                if (!this.privateChannels.some(c => c.id === chId)) {
                  this.privateChannels.push({
                    id: chId,
                    title,
                    language: cl.language,
                    group: cl.group,
                    country: cl.country
                  });
                  addedCount++;
                }
              }
            }

            if (addedCount > 0) {
              console.log(`[ChannelsService] Sincronizzati ${addedCount} nuovi canali IT/EN da ${mirror.name}`);
              this.saveCachedChannelsToDisk();
            }
            break;
          }
        } catch {
          // Prova mirror successivo
        }
      }
    } catch (err) {
      if (CONFIG.DEBUG) console.warn('[ChannelsService] Sync background error:', err);
    }
  }

  private static scheduleBackgroundSync(): void {
    setTimeout(() => {
      this.syncChannelsFromRemote().catch(() => {});
    }, 5000);

    setInterval(() => {
      this.syncChannelsFromRemote().catch(() => {});
    }, 12 * 60 * 60 * 1000);
  }

  private static loadCachedChannelsFromDisk(): void {
    try {
      const diskPath = path.join(this.DISK_CACHE_DIR, 'extra_private_channels.json');
      if (fs.existsSync(diskPath)) {
        const extra: PrivateChannel[] = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
        for (const ch of extra) {
          const cl = this.classifyPrivateChannel(ch.title);
          if (cl.language === 'it' || cl.language === 'en') {
            if (!this.privateChannels.some(c => c.id === ch.id)) {
              this.privateChannels.push({
                ...ch,
                language: cl.language,
                group: cl.group,
                country: cl.country
              });
            }
          }
        }
      }
    } catch {}
  }

  private static saveCachedChannelsToDisk(): void {
    try {
      if (!fs.existsSync(this.DISK_CACHE_DIR)) {
        fs.mkdirSync(this.DISK_CACHE_DIR, { recursive: true });
      }
      const diskPath = path.join(this.DISK_CACHE_DIR, 'extra_private_channels.json');
      fs.writeFileSync(diskPath, JSON.stringify(this.privateChannels, null, 2), 'utf8');
    } catch {}
  }
}
