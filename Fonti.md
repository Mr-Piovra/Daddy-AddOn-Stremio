# Registro delle Fonti e Documentazione Tecnica (Fonti.md)

Questo file è il registro centrale in cui tutti gli agenti e gli sviluppatori annotano documentazione, repository, specifiche API, endpoint di streaming e risorse utili per lo sviluppo e la manutenzione del progetto **RiveStream Stremio**.

> [!NOTE]
> Consulta questo file prima di implementare nuove funzionalità ed estendilo con ogni nuova risorsa scoperta o integrata.

---

## 1. Documentazione Ufficiale Stremio & SDK

### Stremio Addon Protocol Specification
- **URL / Riferimento:** `https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md`
- **Categoria:** Stremio SDK / Protocol
- **Descrizione e Scopo:** Documentazione ufficiale per la struttura del `manifest.json` e risposte per `catalog`, `meta`, `stream`, `subtitles`.
- **Note Tecniche / Parametri Chiave:** Specifica standard per formati `stream` (`url`, `behaviorHints: { proxyHeaders: { request: { ... } }, notWebReady: true }`). Supporto per percorsi con configurazione dinamica (`/:configuration/manifest.json`).
- **Data inserimento / Verifica:** 2026-08-23

### Stremio Addon SDK (Node.js)
- **URL / Riferimento:** `https://github.com/Stremio/stremio-addon-sdk`
- **Categoria:** Stremio SDK / Tooling
- **Descrizione e Scopo:** SDK Node.js ufficiale per creare addon Stremio conformi e testabili localmente via interfaccia web (`addon.serveHTTP` / `getRouter`).
- **Note Tecniche / Parametri Chiave:** Helper `addonBuilder`, integrazione router Express / HTTP.
- **Data inserimento / Verifica:** 2026-08-23

---

## 2. Repository di Riferimento Studiate

### tvvoo (`qwertyuiop8899/tvvoo`)
- **URL / Riferimento:** `https://github.com/qwertyuiop8899/tvvoo` (clonata localmente in `references/tvvoo`)
- **Categoria:** Addon Architettura / IPTV & Live TV / Stremio SDK
- **Descrizione e Scopo:** Architettura completa di un addon Stremio specializzato in Live TV IPTV (Vavoo).
- **Pattern Architetturali Rilevanti:**
  1. Struttura del pannello di configurazione web (`public/landing.html`) con input per **Proxy URL**, **Proxy API Password**, selettore tipo proxy (**EasyProxy / MediaFlow**) e toggle per stream "Clean / Direct".
  2. Codifica della configurazione nei percorsi di Stremio tramite token URL-safe (`/cfg-mfu_<b64>-mfp_<b64>-cln/manifest.json`).
  3. Formattazione e wrapping degli stream verso EasyProxy / MediaFlow (`/proxy/hls/manifest.m3u8?d=...&api_password=...` e `/extractor/video?host=...`).
  4. **Approccio Ibrido ai Canali:** dataset statico bundled (`src/channels/lists.json`) + pull da Internet periodico con cache persistente su disco (`cache/catalog/`).
- **Data inserimento / Verifica:** 2026-08-23

### EasyProxy (`realbestia1/EasyProxy`)
- **URL / Riferimento:** `https://github.com/realbestia1/EasyProxy` (clonata localmente in `references/EasyProxy`)
- **Categoria:** Extractor Engine / HLS & DASH Stream Resolver / Proxy
- **Descrizione e Scopo:** Server proxy avanzato ed estrattore multi-provider specializzato in decifrazione stream HLS, bypass anti-bot e riscrittura manifest.
- **Pattern Architetturali Rilevanti:**
  1. **Modulo `DLStreamsExtractor`** (`extractors/dlstreams.py`): logica esatta di estrazione e decodifica per DaddyLive / DLStreams (`dlstreams.st`, `dlhd.st`, `dlhd.pk`, `daddylive.mp`).
  2. Endpoint `/extractor/video?host=dlstreams&d={URL}&redirect_stream=true&api_password={password}` per demandare estrazione ed anti-bot al proxy.
- **Data inserimento / Verifica:** 2026-08-23

---

## 3. Palinsesto & Feed Live Sportivi Multi-Sorgente

### DaddyLive Official Schedule Feeds
- **URL / Riferimento:**
  - `https://dlstreams.st/schedule/schedule-generated.json`
  - `https://daddylive.mp/schedule/schedule-generated.json`
  - `https://dlhd.pk/schedule/schedule-generated.json`
- **Categoria:** Schedule / Live Sports Feed
- **Descrizione:** Feed JSON ufficiale nativo pubblicato da DaddyLive per tutti gli eventi e match sportivi del giorno, categorizzati per sport con i relativi ID canale.

### Streamed.pk Sports API
- **URL / Riferimento:**
  - `https://streamed.pk/api/sports`
  - `https://streamed.pk/api/matches/all-today`
- **Categoria:** Sports Metadata API
- **Descrizione:** Endpoint API per recuperare eventi sportivi live, match, tornei e canali sorgente associati.

### RiveStream Backend API
- **URL / Riferimento:** `https://backend.rivestream.app/api/schedule`
- **Categoria:** Schedule Fallback
- **Descrizione:** Aggregatore JSON del palinsesto (utilizzato come ulteriore fallback di sicurezza).

---

## 4. Gestione CDN DaddyLive / Phantemlis & EasyProxy

### Note Tecniche sui Token CDN e Protezione Anti-Hotlink
- **Binding IP dei Token:** I token di sicurezza generati da DaddyLive (es. `secure/<hash>/<timestamp>/premium<id>/index.m3u8`) sono vincolati all'indirizzo IP pubblico del client che ha effettuato l'estrazione.
- **Delega Estrazione e Pre-Risoluzione ad EasyProxy (`resolveEasyProxyStream`):**
  - Nell'app Android di EasyProxy (`com.easyproxy.server`), `DlStreamsExtractor` estrae il manifest corretto ma la rotta `/extractor/video` con `redirect_stream=true` non inietta il Referer nella chiamata diretta a `HlsProxyService`, generando `HTTP 403: Invalid Referer`.
  - **Soluzione Implementata:** L'addon esegue una chiamata lightweight non-bloccante a `/extractor/video?host=dlstreams&d=...&redirect_stream=false`, intercetta l'URL del manifest `.m3u8` generato dall'IP del proxy e costruisce l'URL diretto `/proxy/hls/manifest.m3u8?d={manifest}&h_Referer=https://hamis.romponalis.st/&h_Origin=https://hamis.romponalis.st`.
  - Questo garantisce contemporaneamente:
    1. Token valido e autorizzato per l'IP di EasyProxy.
    2. Header Referer / Origin corretti inoltrati da `HlsProxyService` alla CDN.
    3. Riscrittura trasparente di tutti i segmenti video `.ts` e sub-manifest (HTTP 200 OK).
    4. Filtraggio automatico dei soli mirror attivi e funzionanti.
- **Header Obbligatori CDN:** `Referer: https://hamis.romponalis.st/` e `Origin: https://hamis.romponalis.st`.
- **Data inserimento / Verifica:** 2026-08-23

