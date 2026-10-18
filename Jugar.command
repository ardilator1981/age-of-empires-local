#!/bin/bash
# Doble clic para jugar: instala dependencias (la primera vez), arranca el
# servidor local y abre el juego en el navegador.
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v npm >/dev/null 2>&1; then
  echo "No se encuentra Node.js. Descárgalo de https://nodejs.org e inténtalo de nuevo."
  read -r -p "Pulsa Enter para salir"
  exit 1
fi
[ -d node_modules ] || npm install
(sleep 2; open "http://localhost:5173") &
npm run dev -- --port 5173
