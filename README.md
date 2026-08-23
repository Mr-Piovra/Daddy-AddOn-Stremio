# RiveStream Stremio Addon 🎬⚡

Addon avanzato e auto-ospitato per **Stremio** che integra l'intero catalogo **RiveStream IPTV & Live Sports**, con estrazione in tempo reale dei flussi HLS da **DaddyLive HD (DLStreams)** e supporto completo per proxy trasparente (**EasyProxy** e **MediaFlow Proxy**).

---

## 🌟 Caratteristiche Principali

- ⚡ **1.450+ Canali TV & Sport (Private Channels):** Canali televisivi e sportivi internazionali in alta definizione (Sky Sport, beIN Sports, Arena Sport, ESPN, DAZN, Eurosport, SuperSport, ecc.).
- 📺 **8.400+ Canali IPTV Mondiali (Public Channels):** Database globale organizzato per oltre **250 nazioni** e **30 categorie** (Cinema, Documentari, Sport, News, Musica, Animazione, ecc.).
- ⚽ **Palinsesto Eventi Live (Live Events):** Eventi e match sportivi del giorno aggiornati automaticamente in tempo reale dal palinsesto integrato.
- 🛡️ **Supporto EasyProxy & MediaFlow Proxy:** Compatibilità totale con server proxy esterni. L'addon risolve automaticamente i token vincolati all'IP e inietta gli header di protezione (`Referer`, `Origin`, `User-Agent`) per prevenire errori `403 Forbidden`.
- 🔒 **Privacy Totale & Mascheramento IP:** Quando è configurato EasyProxy, il **100% del traffico streaming e dei segmenti video `.ts` passa dal proxy**. L'IP del client Stremio è completamente invisibile alle CDN esterne.
- 🚀 **Risoluzione HLS Diretta (Zero Pubblicità):** Riproduzione nativa nel player Stremio senza iframe, banner o popup.
- 🔄 **Multi-Mirror con Failover:** Risoluzione parallela su più mirror server (Alpha, Bravo, Charlie, Delta) per la massima continuità di visione.
- ⚙️ **Pannello Web di Configurazione:** Dashboard moderna integrata per personalizzare cataloghi, credenziali proxy e generare il link di installazione in 1 click.

---

## 🐳 Guida all'Installazione con Docker

### Opzione A: Docker su Windows (Docker Desktop)

#### Prerequisiti
- [Docker Desktop per Windows](https://www.docker.com/products/docker-desktop/) installato e avviato (con backend WSL2 raccomandato).
- [Git per Windows](https://git-scm.com/) o download manuale del repository come file ZIP.

#### Passaggi
1. Apri **PowerShell** o **Windows Terminal** e posizionati nella cartella del progetto:
   ```powershell
   cd "C:\percorso\di\RiveStream Stremio"
   ```

2. Avvia il container in background con **Docker Compose**:
   ```powershell
   docker compose up -d --build
   ```

3. Verifica che il container sia attivo e funzionante:
   ```powershell
   docker compose ps
   docker compose logs -f
   ```

4. Apri il browser all'indirizzo:
   ```
   http://localhost:7033
   ```

---

### Opzione B: Docker su Linux (Debian, Ubuntu, Fedora, CentOS, Arch)

#### Prerequisiti
- Docker Engine e Docker Compose plugin installati:
  ```bash
  # Su Debian / Ubuntu
  sudo apt-get update
  sudo apt-get install -y docker.io docker-compose-v2
  ```

#### Passaggi
1. Clona la repository ed entra nella cartella:
   ```bash
   git clone https://github.com/tuo-username/rivestream-stremio.git
   cd rivestream-stremio
   ```

2. (Opzionale) Personalizza le variabili d'ambiente:
   ```bash
   cp .env.example .env
   ```

3. Avvia il container con Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. Per visualizzare i log in tempo reale:
   ```bash
   docker compose logs -f
   ```

5. L'addon sarà accessibile su:
   ```
   http://IP_DELLA_TUA_MACCHINA:7033
   ```

#### Gestione del Container Docker
- **Arresto:** `docker compose down`
- **Riavvio:** `docker compose restart`
- **Aggiornamento codice e rebuild:**
  ```bash
  git pull
  docker compose up -d --build
  ```

---

## 💻 Installazione Nativa con Node.js (Windows, Linux, macOS)

Se preferisci eseguire l'addon senza Docker:

### Prerequisiti
- **Node.js** (versione 18.x o 20.x raccomandata)
- **npm** (incluso con Node.js)

### 1. Installazione Dipendenze
```bash
npm install
```

### 2. Compilazione TypeScript
```bash
npm run build
```

### 3. Avvio del Server
- **In modalità sviluppo (con live-reload):**
  ```bash
  npm run dev
  ```
- **In modalità produzione:**
  ```bash
  npm start
  ```

*(Opzionale su Linux/Mac)* Per mantenere l'addon sempre attivo in background con **PM2**:
```bash
npm install -g pm2
pm2 start dist/index.js --name "rivestream-stremio"
pm2 save
pm2 startup
```

---

## 📱 Configurazione & Installazione su Stremio

1. Apri la dashboard web dell'addon nel browser (`http://localhost:7033` o `http://IP_DEL_SERVER:7033`).
2. **Configura il Proxy (Consigliato per la massima privacy e stabilità):**
   - Inserisci l'URL del tuo EasyProxy (es. `https://jayandroidproxy.dpdns.org`).
   - Inserisci l'eventuale **API Password**.
   - Seleziona **EasyProxy**.
3. **Seleziona i Cataloghi:**
   - ⚡ *Canali TV & Sport (Private HD)*
   - ⚽ *Palinsesto Eventi Live*
   - 📺 *Canali IPTV Mondiali*
4. Clicca su **"Installa su Stremio"** per aprire direttamente l'app, oppure clicca su **"Copia Link"** e incollalo nella barra di ricerca degli Addon in Stremio.

---

## 🔒 Architettura Privacy: Come Funziona il Mascheramento IP

```
[ Client Stremio ]
        │
        │ 1. Richiesta Manifest e Segmenti .ts
        ▼
[ EasyProxy Server ] ─── (IP del Proxy) ───► [ CDN Streaming / DaddyLive ]
   (Android / VPS)
```

1. Quando clicchi su un canale, l'addon genera uno stream con URL delegato a EasyProxy.
2. EasyProxy richiede lo stream alla CDN con il proprio IP e scarica il manifest `.m3u8`.
3. Tutti i segmenti video (`.ts`) all'interno del file manifest vengono **riscritti** per passare unicamente dal tuo EasyProxy (`/proxy/stream`).
4. Il player di Stremio scarica i frammenti video esclusivamente dal proxy: **le CDN della sorgente non vedono mai l'indirizzo IP della tua connessione domestica/client**.

---

## 🧪 Esecuzione dei Test

Per convalidare la corretta generazione del manifest, la decodifica dei token e l'integrazione proxy:
```bash
npm run build
npm run test:addon
npx ts-node test/test-proxy-config.ts
```

---

## 📂 Struttura del Progetto

```
RiveStream Stremio/
├── src/
│   ├── index.ts                # Server Express & endpoint Stremio SDK
│   ├── manifest.ts             # Definizione cataloghi e metadati Stremio
│   ├── config.ts               # Parametri operativi, mirror DaddyLive e costanti
│   ├── extractors/
│   │   ├── dlstreams.ts        # Algoritmo estrazione e decodifica DaddyLive (.m3u8)
│   │   └── types.ts            # Tipi e interfacce estrattori
│   ├── handlers/
│   │   ├── catalog.ts          # Gestore cataloghi (Private, Public, Events)
│   │   ├── meta.ts             # Metadati per ciascun canale ed evento sportivo
│   │   └── stream.ts           # Risoluzione stream multi-mirror con verifica proxy
│   ├── proxy/
│   │   └── proxyBuilder.ts     # Generatore URL EasyProxy con iniezione header anti-403
│   ├── services/
│   │   ├── channels.ts         # Gestore dataset locale canali (Private & Public)
│   │   ├── schedule.ts         # Parser e fetcher palinsesto live eventi
│   │   └── cache.ts            # Layer di memoria cache con TTL
│   └── data/                   # Dataset JSON canali (752 Private, 8447 Public)
├── public/
│   └── index.html              # Pannello Web di configurazione e installazione
├── test/
│   ├── test-addon.ts           # Suite di test completa per gli endpoint Stremio
│   ├── test-extractor.ts       # Test diagnostico estrazione mirror DaddyLive
│   └── test-proxy-config.ts    # Test validazione parametri e sicurezza proxy
├── Dockerfile                  # Multi-stage Docker build per ambienti di produzione
├── docker-compose.yml          # Configurazione Docker Compose pronta all'uso
├── Fonti.md                    # Registro continuo fonti tecniche e documentazione CDN/API
└── AGENTS.md                   # Linee guida per sviluppatori e agenti AI
```

---

## 📄 Licenza
Progetto distribuito a scopo di studio e interoperabilità con l'ecosistema Stremio.
