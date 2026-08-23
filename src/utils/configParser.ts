export interface UserConfig {
  proxyUrl?: string;
  proxyPassword?: string;
  proxyType?: 'easyproxy' | 'mediaflow' | 'generic';
  includeDirect?: boolean;
  languages?: string[];
  selectedCountries?: string[];
  enablePrivate?: boolean;
  enablePublic?: boolean;
  enableEvents?: boolean;
}

export class ConfigParser {
  /**
   * Codifica la configurazione in una stringa sicura per il path dell'URL Stremio (base64url safe).
   */
  public static encode(config: UserConfig): string {
    try {
      const json = JSON.stringify(config);
      const b64 = Buffer.from(json, 'utf-8').toString('base64');
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      return '';
    }
  }

  /**
   * Decodifica la configurazione dalla stringa del path o token.
   */
  public static decode(rawStr?: string): UserConfig {
    if (!rawStr) return {};

    let token = rawStr;
    if (token.startsWith('cfg-')) {
      token = token.substring(4);
    }
    token = token.split('/')[0].split('?')[0];

    try {
      let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) {
        b64 += '=';
      }
      const jsonStr = Buffer.from(b64, 'base64').toString('utf-8');
      if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
        return JSON.parse(jsonStr) as UserConfig;
      }
    } catch {
      // Parser compatibilità token personalizzati
    }

    const config: UserConfig = {};

    const mfuMatch = token.match(/mfu_([A-Za-z0-9_-]+)/);
    if (mfuMatch) {
      try {
        let b64 = mfuMatch[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        config.proxyUrl = Buffer.from(b64, 'base64').toString('utf-8');
      } catch {}
    }

    const mfpMatch = token.match(/mfp_([A-Za-z0-9_-]+)/);
    if (mfpMatch) {
      try {
        let b64 = mfpMatch[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        config.proxyPassword = Buffer.from(b64, 'base64').toString('utf-8');
      } catch {}
    }

    if (token.includes('pxt_mfl')) {
      config.proxyType = 'mediaflow';
    } else if (config.proxyUrl) {
      config.proxyType = 'easyproxy';
    }

    if (token.includes('cln')) {
      config.includeDirect = true;
    }

    return config;
  }
}
