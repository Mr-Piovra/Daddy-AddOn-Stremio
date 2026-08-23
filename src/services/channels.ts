import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';

export interface PrivateChannel {
  id: string;
  title: string;
  category?: string;
  language?: string;
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
  count: number;
}

export class ChannelsService {
  private static privateChannels: PrivateChannel[] = [];
  private static publicChannels: PublicChannel[] = [];
  private static categories: Category[] = [];
  private static countries: Country[] = [];
  private static isInitialized = false;

  private static DISK_CACHE_DIR = path.join(__dirname, '../../cache/channels');

  /**
   * Inizializza i canali caricando il dataset locale e avviando la sincronizzazione asincrona.
   */
  public static init(): void {
    if (this.isInitialized) return;

    try {
      const dataDir = path.join(__dirname, '../data');

      // 1. Carica dataset locale di base (istantaneo in 0ms)
      const privatePath = path.join(dataDir, 'privateChannels.json');
      const publicPath = path.join(dataDir, 'publicChannels.json');
      const categoriesPath = path.join(dataDir, 'categories.json');
      const countriesPath = path.join(dataDir, 'countries.json');

      if (fs.existsSync(privatePath)) {
        this.privateChannels = JSON.parse(fs.readFileSync(privatePath, 'utf8'));
      }
      if (fs.existsSync(publicPath)) {
        this.publicChannels = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
      }
      if (fs.existsSync(categoriesPath)) {
        this.categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
      }
      if (fs.existsSync(countriesPath)) {
        this.countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
      }

      // 2. Se esiste una cache aggiornata su disco, fai merge
      this.loadCachedChannelsFromDisk();

      this.isInitialized = true;
      console.log(`[ChannelsService] Caricati ${this.privateChannels.length} canali Private e ${this.publicChannels.length} canali Public.`);

      // 3. Avvia sync in background (non bloccante)
      this.scheduleBackgroundSync();
    } catch (err) {
      console.error('[ChannelsService] Errore inizializzazione dataset:', err);
    }
  }

  public static getPrivateChannels(filter?: {
    search?: string;
    skip?: number;
    limit?: number;
  }): { channels: PrivateChannel[]; total: number } {
    this.init();
    let list = this.privateChannels;

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
      list = list.filter(c => c.country.toUpperCase() === co);
    }

    if (filter?.category) {
      const cat = filter.category.toLowerCase();
      list = list.filter(c => c.categories.some(k => k.toLowerCase() === cat));
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
   * Esegue la sincronizzazione asincrona dei canali in background.
   */
  public static async syncChannelsFromRemote(): Promise<void> {
    try {
      // Prova a scaricare la lista canali 24/7 aggiornata da DaddyLive mirrors
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
              if (!this.privateChannels.some(c => c.id === chId)) {
                this.privateChannels.push({ id: chId, title });
                addedCount++;
              }
            }

            if (addedCount > 0) {
              console.log(`[ChannelsService] Sincronizzati ${addedCount} nuovi canali da ${mirror.name}`);
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
    // Esegui primo sync dopo 5 secondi dall'avvio
    setTimeout(() => {
      this.syncChannelsFromRemote().catch(() => {});
    }, 5000);

    // Esegui sync periodico ogni 12 ore
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
          if (!this.privateChannels.some(c => c.id === ch.id)) {
            this.privateChannels.push(ch);
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
