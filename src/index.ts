import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { CONFIG } from './config';
import { getManifest } from './manifest';
import { CatalogHandler } from './handlers/catalog';
import { MetaHandler } from './handlers/meta';
import { StreamHandler } from './handlers/stream';
import { ConfigParser, UserConfig } from './utils/configParser';

// Hardening process errors
process.on('uncaughtException', (err: unknown) => {
  console.error('[RiveStream] uncaughtException:', err);
});
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[RiveStream] unhandledRejection:', reason);
});

async function bootstrap() {
  const app = express();
  app.use(cors());

  // Static files & landing page
  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));

  // Health check
  app.get('/health', (_req, res) => {
    const manifest = getManifest();
    res.json({
      status: 'ok',
      version: manifest.version,
      name: manifest.name,
      mirrors: CONFIG.MIRRORS.map(m => m.name)
    });
  });

  // Helper per inviare risposte JSON con header CORS e cache personalizzabile
  function sendStremioResponse(res: Response, data: any, cacheSeconds: number = 300) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (cacheSeconds > 0) {
      res.setHeader('Cache-Control', `max-age=${cacheSeconds}, public`);
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    res.send(data);
  }

  // 1. MANIFEST (Default & Configured)
  const manifestHandler = (req: Request, res: Response) => {
    const configToken = req.params.configuration;
    const userConfig: UserConfig = configToken ? ConfigParser.decode(configToken) : {};
    const manifest = getManifest(userConfig);
    sendStremioResponse(res, manifest, 60);
  };

  app.get('/manifest.json', manifestHandler);
  app.get('/:configuration/manifest.json', manifestHandler);

  // 2. CATALOG (Default & Configured)
  const catalogRouteHandler = async (req: Request, res: Response) => {
    const configToken = req.params.configuration;
    const userConfig: UserConfig = configToken ? ConfigParser.decode(configToken) : {};

    const type = req.params.type;
    const id = req.params.id;
    let extra: any = {};

    if (req.params.extra) {
      try {
        const queryParams = new URLSearchParams(req.params.extra);
        for (const [key, val] of queryParams.entries()) {
          extra[key] = val;
        }
      } catch {}
    }

    if (req.query) {
      extra = { ...extra, ...req.query };
    }

    try {
      const result = await CatalogHandler.handle({ type, id, extra, userConfig });
      sendStremioResponse(res, result, 120);
    } catch (err) {
      console.error('[RiveStream] Catalog error:', err);
      sendStremioResponse(res, { metas: [] });
    }
  };

  app.get('/catalog/:type/:id.json', catalogRouteHandler);
  app.get('/catalog/:type/:id/:extra.json', catalogRouteHandler);
  app.get('/:configuration/catalog/:type/:id.json', catalogRouteHandler);
  app.get('/:configuration/catalog/:type/:id/:extra.json', catalogRouteHandler);

  // 3. META (Default & Configured)
  const metaRouteHandler = async (req: Request, res: Response) => {
    const type = req.params.type;
    const id = req.params.id;

    try {
      const result = await MetaHandler.handle({ type, id });
      sendStremioResponse(res, result, 300);
    } catch (err) {
      console.error('[RiveStream] Meta error:', err);
      sendStremioResponse(res, { meta: null });
    }
  };

  app.get('/meta/:type/:id.json', metaRouteHandler);
  app.get('/:configuration/meta/:type/:id.json', metaRouteHandler);

  // 4. STREAM (Default & Configured) - Zero Cache per flussi sempre freschi
  const streamRouteHandler = async (req: Request, res: Response) => {
    const configToken = req.params.configuration;
    const userConfig: UserConfig = configToken ? ConfigParser.decode(configToken) : {};

    const type = req.params.type;
    const id = req.params.id;

    try {
      const result = await StreamHandler.handle({ type, id, userConfig });
      sendStremioResponse(res, result, 0); // No-cache
    } catch (err) {
      console.error('[RiveStream] Stream error:', err);
      sendStremioResponse(res, { streams: [] }, 0);
    }
  };

  app.get('/stream/:type/:id.json', streamRouteHandler);
  app.get('/:configuration/stream/:type/:id.json', streamRouteHandler);

  // 5. Configuration & Landing Pages
  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  app.get('/configure', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  app.get('/:configuration/configure', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 RiveStream Stremio Addon avviato con successo!`);
    console.log(`📡 URL Manifest: ${CONFIG.ADDON_URL}/manifest.json`);
    console.log(`⚙️  Pannello Configurazione: ${CONFIG.ADDON_URL}`);
    console.log(`======================================================\n`);
  });
}

bootstrap().catch(err => {
  console.error('[RiveStream] Errore critico in avvio:', err);
  process.exit(1);
});
