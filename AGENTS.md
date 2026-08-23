# AGENTS.md - Linee Guida per Agenti di Sviluppo (RiveStream Stremio)

Questo documento definisce le regole operative, gli standard architetturali e i requisiti di coerenza per tutti gli agenti AI e gli sviluppatori che collaborano a questo progetto (**RiveStream Stremio**).

---

## 1. Gestione delle Fonti e Documentazione (`Fonti.md`)

> [!IMPORTANT]
> **REGOLA MANDATORIA:**
> 1. **Consultazione preventiva:** Prima di iniziare qualsiasi task di ricerca, progettazione o implementazione di integrazioni/API, l'agente **DEVE** consultare il file [Fonti.md](file:///Users/jay/Desktop/RiveStream%20Stremio/Fonti.md).
> 2. **Tracciamento continuo:** Ogni volta che viene individuata, utilizzata o aggiornata una documentazione, un'API, un endpoint, un SDK, una repository di riferimento o una risorsa tecnica rilevante, l'agente **DEVE** annotarla immediatamente in [Fonti.md](file:///Users/jay/Desktop/RiveStream%20Stremio/Fonti.md).

### Formato per l'aggiunta di nuove fonti in `Fonti.md`
Quando aggiungi una nuova fonte a `Fonti.md`, usa la seguente struttura:
```markdown
### [Nome / Titolo della Risorsa]
- **URL / Riferimento:** `https://...`
- **Categoria:** (es. Stremio SDK, Scraping / Extractor, Streaming Protocol, API Provider, Tooling)
- **Descrizione e Scopo:** Breve sintesi di cosa contiene la risorsa e a cosa serve nel progetto.
- **Note Tecniche / Parametri Chiave:** Eventuali header necessari (User-Agent, Referer), limiti di rate, formati supportati (HLS/m3u8, MP4, DASH).
- **Data inserimento / Verifica:** YYYY-MM-DD
```

---

## 2. Architettura del Progetto e Principi di Design

Il progetto ha come obiettivo l'integrazione fluida e affidabile tra provider di streaming/estrazione dati (RiveStream / provider correlati) e l'ecosistema **Stremio**.

### 2.1 Principi Fondamentali
1. **Modularità e Separazione delle Responsabilità (SoC):**
   - **`manifest`**: Definizione rigorosa dei metadati dell'addon Stremio (ID, version, catalogs, resources, types).
   - **`extractors / scrapers`**: Moduli isolati e indipendenti per ciascun provider o sorgente di streaming.
   - **`handlers`**: Gestori dedicati per le risorse Stremio (`catalog`, `meta`, `stream`, `subtitles`).
   - **`cache`**: Livello di memorizzazione trasparente per ridurre richieste ridondanti e rispettare i rate limits.
   - **`utils / helpers`**: Funzioni riutilizzabili (parsing HTML/JSON, decodifica video link, gestione HTTP headers/User-Agent).
   - **`config`**: Gestione centralizzata di variabili d'ambiente e costanti operative.

2. **Resilienza e Tolleranza ai Guasti:**
   - I servizi di streaming esterni e gli scraper possono variare nel tempo: implementare sempre gestione degli errori con fallback graceful.
   - Se un flusso o un provider fallisce, l'addon **non deve bloccarsi né andare in crash**: deve restituire un array vuoto o un errore gestito compatibile con il protocollo Stremio.
   - Utilizzare timeout espliciti su tutte le chiamate di rete.

3. **Performance ed Efficienza:**
   - Elaborazione asincrona e non bloccante (`async/await`).
   - Streaming diretto: evitare buffering intermedi pesanti sul server quando è possibile restituire direttamente URL di streaming con header appropriati al player Stremio.

---

## 3. Standard di Programmazione e Qualità del Codice

### 3.1 Coerenza del Codice
- **Tipizzazione e Contratti:**
  - Definire interfacce / tipi rigorosi per ogni struttura dati (manifest, stream response, meta item, extractor output).
- **Nomi Significativi:**
  - Funzioni e variabili devono avere nomi autoesplicativi in inglese.
  - Costanti espresse in `UPPER_SNAKE_CASE`.
- **Trattamento delle Variabili Sensibili:**
  - Nessun token, credenziale, o chiave API in chiaro nel codice. Usare sempre variabili d'ambiente (`.env`).
- **Logging Strutturato:**
  - Utilizzare log informativi con livelli chiari (`INFO`, `WARN`, `ERROR`, `DEBUG`).
  - Non loggare mai dati sensibili o chiavi private.

### 3.2 Protocollo Addon Stremio
- Rispettare rigorosamente la specifica ufficiale dell'API Stremio (Stremio Addon Protocol):
  - `stream` response: array di oggetti stream `{ name, title, url, behaviorHints: { notWebReady, proxyHeaders, ... } }`.
  - Gestione corretta dei cataloghi (`id`, `type`, `name`, `genres`).
  - Gestione corretta degli identificatori standard (`tt...` per IMDb, Kitsu per Anime, ID custom per sorgenti terze).

---

## 4. Workflow Operativo per gli Agenti

Quando ricevi un task o un comando:
1. **Fase 1: Analisi e Consultazione Fonti**
   - Leggi il contesto e consulta [Fonti.md](file:///Users/jay/Desktop/RiveStream%20Stremio/Fonti.md) per verificare specifiche tecniche, API già documentate e convenzioni esistenti.
2. **Fase 2: Progettazione / Pianificazione**
   - Assicurati che ogni modifica rispetti la modularità e non introduca dipendenze circolari o codice duplicato.
3. **Fase 3: Implementazione Pulita**
   - Scrivi codice leggibile, con commenti dove necessario (specialmente nella logica di decifrazione, parsing o estrazione stream).
4. **Fase 4: Verifica e Validazione**
   - Verifica la sintassi, l'assenza di errori e la conformità al protocollo Stremio.
5. **Fase 5: Aggiornamento Documentazione e Fonti**
   - Se hai scoperto nuove informazioni, fix di endpoint, o nuove risorse utili, aggiorna tempestivamente [Fonti.md](file:///Users/jay/Desktop/RiveStream%20Stremio/Fonti.md).
