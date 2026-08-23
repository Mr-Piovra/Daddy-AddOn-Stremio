#!/bin/bash

# ==========================================
# RiveStream Stremio Addon - Avvio Rapido
# Porta: 7033
# ==========================================

# Posizionati nella directory dello script
cd "$(dirname "$0")" || exit 1

# Esporta i path tipici di macOS per Node.js (Homebrew, nvm, standard)
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"

# Se nvm esiste, caricalo per garantire disponibilità di node/npm
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Verifica che Node.js sia disponibile
if ! command -v node &> /dev/null; then
    echo "❌ Errore: Node.js non trovato nel PATH."
    echo "Verifica che Node.js sia installato."
    exit 1
fi

PORT=7033
export PORT=7033
export ADDON_URL="http://localhost:7033"

echo "======================================================"
echo "🚀 Avvio RiveStream Stremio Addon sulla porta $PORT..."
echo "======================================================"

# Verifica se la porta 7033 è già occupata e libera la porta se necessario
EXISTING_PID=$(lsof -ti :$PORT)
if [ -n "$EXISTING_PID" ]; then
    echo "⚠️  Porta $PORT occupata (PID: $EXISTING_PID). Arresto del vecchio processo..."
    kill -9 $EXISTING_PID 2>/dev/null
    sleep 1
fi

# Verifica e compila se manca la build
if [ ! -f "dist/index.js" ]; then
    echo "🔨 Compilazione TypeScript in corso..."
    npm run build
fi

echo ""
echo "📡 Indirizzi utili:"
echo "   🌐 Dashboard Configurazione: http://localhost:$PORT"
echo "   🔗 Link Manifest Stremio:     http://localhost:$PORT/manifest.json"
echo "   ❤️  Health Check:              http://localhost:$PORT/health"
echo "======================================================"
echo "ℹ️  Per fermare l'addon premi CTRL + C"
echo ""

# Avvia l'addon
npm start
