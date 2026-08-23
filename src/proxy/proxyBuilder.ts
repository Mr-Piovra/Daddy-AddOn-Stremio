import { UserConfig } from '../utils/configParser';

export class ProxyBuilder {
  /**
   * Costruisce l'URL per l'endpoint /extractor/video di EasyProxy.
   * Include sia la delega dell'estrazione (per legare il token all'IP del Proxy)
   * sia i parametri h_Referer e h_Origin (per prevenire il blocco 403 Invalid Referer nella CDN).
   */
  /**
   * Risolve uno stream delegando l'estrazione a EasyProxy (/extractor/video)
   * e ricava l'URL del manifest m3u8 con il token generato sull'IP del proxy,
   * per poi costruire l'URL definitivo /proxy/hls/manifest.m3u8 con gli header Referer/Origin corretti.
   */
  public static async resolveEasyProxyStream(
    targetUrl: string,
    userConfig: UserConfig,
    host: string = 'dlstreams',
    headers: Record<string, string> = {
      Referer: 'https://hamis.romponalis.st/',
      Origin: 'https://hamis.romponalis.st'
    }
  ): Promise<string> {
    const rawProxyUrl = userConfig.proxyUrl?.trim() || '';
    if (!rawProxyUrl) return targetUrl;
    const baseUrl = rawProxyUrl.replace(/\/+$/, '');
    const password = userConfig.proxyPassword?.trim() || '';

    try {
      const extractorUrl = new URL('/extractor/video', baseUrl);
      extractorUrl.searchParams.set('host', host);
      extractorUrl.searchParams.set('d', targetUrl);
      extractorUrl.searchParams.set('redirect_stream', 'false');
      if (password) {
        extractorUrl.searchParams.set('api_password', password);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(extractorUrl.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeout);

      let extractedM3u8: string | null = null;

      // Se EasyProxy risponde con un redirect 302 (comportamento standard EasyProxy Android)
      const location = response.headers.get('location');
      if (location) {
        try {
          const parsedLoc = new URL(location, baseUrl);
          extractedM3u8 = parsedLoc.searchParams.get('d') || parsedLoc.searchParams.get('url');
        } catch {
          // ignora
        }
      } else if (response.ok) {
        // Se EasyProxy risponde in JSON (compatibilità MediaFlow / API)
        const data = (await response.json()) as any;
        extractedM3u8 = data.destination_url || data.url || null;
      }

      if (extractedM3u8) {
        // Costruisce l'URL finale per /proxy/hls/manifest.m3u8 con gli header corretti (Referer / Origin)
        return ProxyBuilder.buildProxyHlsUrl(extractedM3u8, userConfig, headers);
      }
    } catch (err: any) {
      console.warn(`[ProxyBuilder] Failed to resolve stream via EasyProxy: ${err.message}`);
    }

    // Fallback sull'URL generico buildExtractorUrl se la pre-risoluzione fallisce
    return ProxyBuilder.buildExtractorUrl(targetUrl, userConfig, host, headers);
  }

  /**
   * Costruisce l'URL per l'endpoint /extractor/video di EasyProxy.
   * Include sia la delega dell'estrazione (per legare il token all'IP del Proxy)
   * sia i parametri h_Referer e h_Origin (per prevenire il blocco 403 Invalid Referer nella CDN).
   */
  public static buildExtractorUrl(
    targetUrl: string,
    userConfig: UserConfig,
    host: string = 'dlstreams',
    headers: Record<string, string> = {
      Referer: 'https://hamis.romponalis.st/',
      Origin: 'https://hamis.romponalis.st'
    }
  ): string {
    const rawProxyUrl = userConfig.proxyUrl?.trim() || '';
    const baseUrl = rawProxyUrl.replace(/\/+$/, '');
    const password = userConfig.proxyPassword?.trim() || '';

    const u = new URL('/extractor/video', baseUrl);
    u.searchParams.set('host', host);
    u.searchParams.set('d', targetUrl);
    u.searchParams.set('redirect_stream', 'true');

    if (password) {
      u.searchParams.set('api_password', password);
    }

    // Inietta Referer e Origin
    if (headers['Referer']) {
      u.searchParams.set('h_Referer', headers['Referer']);
      u.searchParams.set('h_referer', headers['Referer']);
    }
    if (headers['Origin']) {
      u.searchParams.set('h_Origin', headers['Origin']);
      u.searchParams.set('h_origin', headers['Origin']);
    }
    if (headers['User-Agent']) {
      u.searchParams.set('h_User-Agent', headers['User-Agent']);
      u.searchParams.set('h_user-agent', headers['User-Agent']);
    }

    return u.toString();
  }

  /**
   * Costruisce l'URL per l'endpoint /proxy/hls/manifest.m3u8 di EasyProxy,
   * passando gli header Referer e Origin obbligatori per evitare l'errore "HTTP 403: Invalid Referer".
   */
  public static buildProxyHlsUrl(
    directStreamUrl: string,
    userConfig: UserConfig,
    headers: Record<string, string> = {}
  ): string {
    const rawProxyUrl = userConfig.proxyUrl?.trim() || '';
    const baseUrl = rawProxyUrl.replace(/\/+$/, '');
    const password = userConfig.proxyPassword?.trim() || '';

    const u = new URL('/proxy/hls/manifest.m3u8', baseUrl);
    u.searchParams.set('d', directStreamUrl);

    if (password) {
      u.searchParams.set('api_password', password);
    }

    if (headers['Referer']) {
      u.searchParams.set('h_Referer', headers['Referer']);
      u.searchParams.set('h_referer', headers['Referer']);
    }
    if (headers['Origin']) {
      u.searchParams.set('h_Origin', headers['Origin']);
      u.searchParams.set('h_origin', headers['Origin']);
    }
    if (headers['User-Agent']) {
      u.searchParams.set('h_User-Agent', headers['User-Agent']);
      u.searchParams.set('h_user-agent', headers['User-Agent']);
    }

    return u.toString();
  }
}
