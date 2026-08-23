# Studio Repository di Riferimento & RiveStream IPTV

## 1. Repository Esaminate

### 1.1 `qwertyuiop8899/tvvoo` (clonata in `references/tvvoo`)
- **Linguaggio/Framework:** TypeScript, Node.js (`stremio-addon-sdk`, `express`, `luxon`, `sax`).
- **Punti Chiave:**
  - Architettura di catalogo per paese e tipologia di canale.
  - Formattazione metadati Stremio (`manifest.json`, `catalog`, `meta`, `stream`).
  - Gestione proxying opzionale per stream che richiedono header speciali o bypass IP.

### 1.2 `realbestia1/EasyProxy` (clonata in `references/EasyProxy`)
- **Linguaggio/Framework:** Python (`aiohttp`) e Kotlin (`com.easyproxy.server` per Android).
- **Punti Chiave:**
  - **`extractors/dlstreams.py`**: Algoritmo di risoluzione HTTP per canali DaddyLive/DLHD/DLStreams.
  - Decodifica stream Base64 `atob(...)` dall'iframe del player (`https://hamis.romponalis.st/`).
  - Header HTTP necessari (`Referer: https://hamis.romponalis.st/`, `Origin`, `User-Agent`) per superare la protezione anti-hotlink della CDN Phantemlis.
  - Risoluzione token IP: Il token CDN generato da DaddyLive è legato all'IP del client richiedente. In RiveStream Stremio l'estrazione viene delegata ad EasyProxy con inoltro trasparente di tutti gli header e riscrittura segmenti `.ts` tramite `/proxy/hls/manifest.m3u8`.

---

## 2. Struttura Canali di RiveStream IPTV
1. **Private Channels (752 canali attivi):**
   - Basati sull'infrastruttura DaddyLive con mirror multipli resilienti:
     - `Server Alpha` (`dlstreams.st`)
     - `Server Bravo` (`dlhd.st`)
     - `Server Charlie` (`dlhd.pk`)
     - `Server Delta` (`daddylive.mp`)
2. **Public Channels (8.447 canali):**
   - Canali mondiali suddivisi in oltre 250 nazioni e 30 categorie, con caricamento istantaneo dal dataset locale.
3. **Live Schedule & Sports Events:**
   - Palinsesto dinamico degli eventi live da feed ufficiali con fallback multi-provider e mapping automatico ai canali attivi.
