import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { MemoryCache } from './cache';

export interface ScheduleChannel {
  channel_name: string;
  channel_id: string;
  channel_url: string;
}

export interface ScheduleEvent {
  id: string;
  time: string;
  event: string;
  category: string;
  channels: ScheduleChannel[];
}

export class ScheduleService {
  private static CACHE_KEY = 'rivestream:schedule';
  private static DISK_CACHE_PATH = path.join(__dirname, '../../cache/schedule_cache.json');
  private static isSyncing = false;
  private static syncInterval: NodeJS.Timeout | null = null;

  /**
   * Avvia il worker in background per mantenere il palinsesto sempre aggiornato e caldo in memoria
   */
  public static startBackgroundWorker(intervalMs: number = 300000): void {
    if (this.syncInterval) return;

    // Esegui primo sync in background senza bloccare
    setTimeout(() => {
      this.syncSchedule().catch(err => {
        if (CONFIG.DEBUG) console.warn('[ScheduleService] Initial background sync error:', err);
      });
    }, 1000);

    // Programma il timer ricorrente ogni 5 minuti
    this.syncInterval = setInterval(() => {
      this.syncSchedule().catch(err => {
        if (CONFIG.DEBUG) console.warn('[ScheduleService] Periodic background sync error:', err);
      });
    }, intervalMs);

    console.log(`[ScheduleService] Background Worker avviato (sync ogni ${intervalMs / 60000} minuti)`);
  }

  /**
   * Recupera il palinsesto degli eventi live:
   * 1. Dalla memoria (MemoryCache) -> Istantaneo (< 1ms)
   * 2. Dal disco (DISK_CACHE_PATH) -> Istantaneo (< 5ms)
   * 3. Sync live di emergenza solo se la cache è completamente vuota
   */
  public static async getLiveEvents(): Promise<ScheduleEvent[]> {
    const cached = MemoryCache.get<ScheduleEvent[]>(this.CACHE_KEY);
    if (cached && cached.length > 0) return cached;

    // 2. Fallback su disco
    const diskEvents = this.readFromDisk();
    if (diskEvents.length > 0) {
      MemoryCache.set(this.CACHE_KEY, diskEvents, CONFIG.SCHEDULE_CACHE_TTL_MS);
      return diskEvents;
    }

    // 3. Fallback di emergenza
    return await this.syncSchedule();
  }

  /**
   * Cerca un evento specifico per ID.
   */
  public static async getEventById(id: string): Promise<ScheduleEvent | null> {
    const events = await this.getLiveEvents();
    return events.find(e => e.id === id) || null;
  }

  /**
   * Sincronizza il palinsesto con timeout rapido (3.5s)
   */
  public static async syncSchedule(): Promise<ScheduleEvent[]> {
    if (this.isSyncing) {
      return this.readFromDisk();
    }
    this.isSyncing = true;

    try {
      // 1. Prova dai mirror attivi
      for (const mirror of CONFIG.MIRRORS) {
        const scheduleUrl = `${mirror.baseUrl.replace(/\/+$/, '')}/schedule/schedule-generated.json`;
        try {
          const events = await this.fetchFromDaddyLive(scheduleUrl);
          if (events && events.length > 0) {
            this.persistEvents(events);
            console.log(`[ScheduleService] Palinsesto aggiornato con successo da ${mirror.name} (${events.length} eventi)`);
            return events;
          }
        } catch {
          // Fallback
        }
      }

      // 2. Prova da RiveStream Backend API
      try {
        const events = await this.fetchFromRiveStream(CONFIG.RIVESTREAM_SCHEDULE_URL);
        if (events && events.length > 0) {
          this.persistEvents(events);
          console.log(`[ScheduleService] Palinsesto aggiornato da RiveStream API (${events.length} eventi)`);
          return events;
        }
      } catch {
        // Fallback
      }
    } finally {
      this.isSyncing = false;
    }

    return this.readFromDisk();
  }

  private static async fetchFromDaddyLive(url: string): Promise<ScheduleEvent[]> {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://dlstreams.st/'
      },
      signal: AbortSignal.timeout(3500)
    });

    if (!resp.ok) return [];

    const raw = await resp.json() as Record<string, Record<string, Array<{ time: string; event: string; channels: Array<string | ScheduleChannel> }>>>;
    return this.parseScheduleObject(raw);
  }

  private static async fetchFromRiveStream(url: string): Promise<ScheduleEvent[]> {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(3500)
    });

    if (!resp.ok) return [];

    const raw = await resp.json() as Record<string, Record<string, Array<{ time: string; event: string; channels: Array<string | ScheduleChannel> }>>>;
    return this.parseScheduleObject(raw);
  }

  private static parseScheduleObject(raw: any): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];
    if (!raw || typeof raw !== 'object') return events;

    let eventIndex = 0;
    for (const dayKey of Object.keys(raw)) {
      const dayData = raw[dayKey];
      if (typeof dayData !== 'object' || !dayData) continue;

      for (const categoryKey of Object.keys(dayData)) {
        const categoryEvents = dayData[categoryKey];
        if (!Array.isArray(categoryEvents)) continue;

        for (const ev of categoryEvents) {
          eventIndex++;
          const parsedChannels: ScheduleChannel[] = [];

          if (Array.isArray(ev.channels)) {
            for (const ch of ev.channels) {
              if (typeof ch === 'object' && ch !== null) {
                parsedChannels.push({
                  channel_name: ch.channel_name || 'Live Channel',
                  channel_id: String(ch.channel_id || ''),
                  channel_url: ch.channel_url || ''
                });
              } else if (typeof ch === 'string') {
                parsedChannels.push({
                  channel_name: `Channel ${ch}`,
                  channel_id: ch,
                  channel_url: `/watch.php?id=${ch}`
                });
              }
            }
          }

          events.push({
            id: `event_${eventIndex}_${parsedChannels[0]?.channel_id || 'live'}`,
            time: ev.time || '',
            event: ev.event || 'Live Match',
            category: categoryKey || 'Sports',
            channels: parsedChannels
          });
        }
      }
    }

    return events;
  }

  private static persistEvents(events: ScheduleEvent[]): void {
    MemoryCache.set(this.CACHE_KEY, events, CONFIG.SCHEDULE_CACHE_TTL_MS);
    try {
      const dir = path.dirname(this.DISK_CACHE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.DISK_CACHE_PATH, JSON.stringify(events, null, 2), 'utf8');
    } catch {}
  }

  private static readFromDisk(): ScheduleEvent[] {
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        const raw = fs.readFileSync(this.DISK_CACHE_PATH, 'utf8');
        return JSON.parse(raw) as ScheduleEvent[];
      }
    } catch {}
    return [];
  }
}
