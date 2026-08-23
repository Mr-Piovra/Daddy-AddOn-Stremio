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

  /**
   * Recupera il palinsesto degli eventi live con fallback multi-sorgente:
   * 1. DaddyLive Native Mirrors (dlstreams.st, daddylive.mp, dlhd.pk)
   * 2. RiveStream Backend API
   * 3. Cache persistente su disco
   */
  public static async getLiveEvents(): Promise<ScheduleEvent[]> {
    const cached = MemoryCache.get<ScheduleEvent[]>(this.CACHE_KEY);
    if (cached && cached.length > 0) return cached;

    // 1. Prova dai mirror nativi di DaddyLive
    for (const mirror of CONFIG.MIRRORS) {
      const scheduleUrl = `${mirror.baseUrl.replace(/\/+$/, '')}/schedule/schedule-generated.json`;
      try {
        const events = await this.fetchFromDaddyLive(scheduleUrl);
        if (events && events.length > 0) {
          this.persistEvents(events);
          return events;
        }
      } catch {
        // Fallback al prossimo mirror
      }
    }

    // 2. Prova da RiveStream Backend API come fallback
    try {
      const events = await this.fetchFromRiveStream(CONFIG.RIVESTREAM_SCHEDULE_URL);
      if (events && events.length > 0) {
        this.persistEvents(events);
        return events;
      }
    } catch {
      // Fallback
    }

    // 3. Fallback finale su cache persistente su disco
    const diskEvents = this.readFromDisk();
    if (diskEvents.length > 0) {
      MemoryCache.set(this.CACHE_KEY, diskEvents, CONFIG.SCHEDULE_CACHE_TTL_MS);
      return diskEvents;
    }

    return [];
  }

  /**
   * Cerca un evento specifico per ID.
   */
  public static async getEventById(id: string): Promise<ScheduleEvent | null> {
    const events = await this.getLiveEvents();
    return events.find(e => e.id === id) || null;
  }

  private static async fetchFromDaddyLive(url: string): Promise<ScheduleEvent[]> {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://dlstreams.st/'
      },
      signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS)
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
      signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS)
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
