import { CONFIG, MirrorConfig } from '../config';
import { ExtractedStream } from './types';

export class DLStreamsExtractor {
  // Mappa dinamica degli URL aggiornati tramite redirect HTTP (auto-discovery)
  private static updatedBaseUrls: Record<string, string> = {};

  /**
   * Estrae i flussi HLS interrogando in parallelo tutti i mirror di DaddyLive.
   */
  public static async extractAll(channelId: string): Promise<ExtractedStream[]> {
    const cleanId = channelId.replace(/\D/g, '');
    if (!cleanId) return [];

    const tasks = CONFIG.MIRRORS.map(mirror => this.extractFromMirror(cleanId, mirror));
    const results = await Promise.allSettled(tasks);

    const streams: ExtractedStream[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        streams.push(r.value);
      }
    }

    return streams;
  }

  /**
   * Estrae il flusso HLS da un singolo mirror di DaddyLive con auto-discovery dei redirect.
   */
  public static async extractFromMirror(
    channelId: string,
    mirror: MirrorConfig
  ): Promise<ExtractedStream | null> {
    try {
      const activeBaseUrl = this.updatedBaseUrls[mirror.id] || mirror.baseUrl;

      // 1. Prova i vari percorsi del player (/stream/, /cast/, /watch/, /plus/)
      let playerHtml = '';
      let activePlayerUrl = '';

      for (const pathTemplate of mirror.playerPaths) {
        const candidateUrl = `${activeBaseUrl.replace(/\/+$/, '')}${pathTemplate.replace('{id}', channelId)}`;
        try {
          const resp = await fetch(candidateUrl, {
            headers: {
              'User-Agent': CONFIG.USER_AGENT,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Referer': `${activeBaseUrl}/`,
              'Origin': activeBaseUrl
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS)
          });

          if (resp.ok) {
            // Auto-Discovery: salva l'URL finale in caso di redirect 301/302 verso un nuovo dominio
            const finalOrigin = new URL(resp.url).origin;
            if (finalOrigin && finalOrigin !== activeBaseUrl) {
              this.updatedBaseUrls[mirror.id] = finalOrigin;
            }

            const html = await resp.text();
            if (html.includes('<iframe') || html.includes('daddy') || html.includes('premium')) {
              playerHtml = html;
              activePlayerUrl = resp.url;
              break;
            }
          }
        } catch {
          // Prova percorso successivo
        }
      }

      if (!playerHtml) return null;

      // 2. Estrai l'URL dell'iframe del player (agnostico rispetto a ID o classi)
      const iframeUrl = this.extractIframeUrl(playerHtml, activePlayerUrl);
      if (!iframeUrl) return null;

      // 3. Effettua la richiesta all'iframe con gli header corretti
      const iframeResp = await fetch(iframeUrl, {
        headers: {
          'User-Agent': CONFIG.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': activePlayerUrl,
          'Origin': new URL(activePlayerUrl).origin
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT_MS)
      });

      if (!iframeResp.ok) return null;

      const iframeHtml = await iframeResp.text();

      // 4. Decodifica il link HLS .m3u8 dall'HTML/JS dell'iframe
      const streamUrl = this.decodeHlsFromHtml(iframeHtml);
      if (!streamUrl) return null;

      const iframeOrigin = new URL(iframeUrl).origin;
      const playbackHeaders: Record<string, string> = {
        'User-Agent': CONFIG.USER_AGENT,
        'Referer': `${iframeOrigin}/`,
        'Origin': iframeOrigin
      };

      return {
        streamUrl,
        channelId,
        mirrorId: mirror.id,
        mirrorName: mirror.name,
        headers: playbackHeaders
      };
    } catch (err) {
      if (CONFIG.DEBUG) {
        console.warn(`[DLStreamsExtractor] Errore estrazione da ${mirror.name}:`, err);
      }
      return null;
    }
  }

  private static extractIframeUrl(html: string, baseUrl: string): string | null {
    const iframeMatches = html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi);
    for (const match of iframeMatches) {
      const src = match[1];
      if (
        src.includes('daddy') ||
        src.includes('premium') ||
        src.includes('player') ||
        src.includes('stream') ||
        src.includes('.php')
      ) {
        if (src.startsWith('http://') || src.startsWith('https://')) {
          return src;
        }
        if (src.startsWith('//')) {
          return `https:${src}`;
        }
        try {
          return new URL(src, baseUrl).toString();
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private static decodeHlsFromHtml(html: string): string | null {
    // 1. Cerca atob('...')
    const atobMatches = html.matchAll(/atob\s*\(\s*['"]([A-Za-z0-9+/=]+)['"]\s*\)/g);
    for (const match of atobMatches) {
      try {
        const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
        if (decoded.startsWith('http') && (decoded.includes('.m3u8') || decoded.includes('index'))) {
          return decoded;
        }
      } catch {}
    }

    // 2. Cerca stringhe base64 standalone che decodificano in URL .m3u8
    const b64Regex = /['"](aHR0c[A-Za-z0-9+/=]{20,})['"]/g;
    let b64Match: RegExpExecArray | null;
    while ((b64Match = b64Regex.exec(html)) !== null) {
      try {
        const decoded = Buffer.from(b64Match[1], 'base64').toString('utf-8');
        if (decoded.startsWith('http') && decoded.includes('.m3u8')) {
          return decoded;
        }
      } catch {}
    }

    // 3. Cerca URL .m3u8 in chiaro (es. source: 'https://...')
    const directMatch = html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
    if (directMatch) {
      return directMatch[1];
    }

    return null;
  }
}
