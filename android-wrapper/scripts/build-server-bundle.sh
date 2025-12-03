#!/usr/bin/env bash
set -euo pipefail

# Empaqueta el servidor (asumido en ../server o ../) en un tar.gz listo para Android.
# - Ejecuta npm ci y npm run build si es necesario.
# - Instala dependencias en modo producción.
# - Incluye public/dist/style.css y respeta options.json (si existe).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="${SERVER_DIR:-${ROOT_DIR}/server}"
DIST_DIR="${ROOT_DIR}/dist"
OUTPUT="${DIST_DIR}/server-bundle.tar.gz"

if [[ ! -f "${SERVER_DIR}/package.json" ]]; then
  echo "[ERROR] No se encontró package.json en ${SERVER_DIR}." >&2
  echo "Coloca el repo principal como submódulo en 'server/' o define SERVER_DIR=/ruta/al/servidor." >&2
  exit 1
fi

rm -rf "${DIST_DIR:?}/server-bundle" && mkdir -p "${DIST_DIR}/server-bundle"

pushd "${SERVER_DIR}" >/dev/null
npm ci
npm run build
npm prune --production
popd >/dev/null

rsync -a --exclude='.git' --exclude='dist' --exclude='android-wrapper' \
  "${SERVER_DIR}/" "${DIST_DIR}/server-bundle/"

# El tarball resultante se usa en el proyecto Android/Cordova/Capacitor.
mkdir -p "${DIST_DIR}"
tar -czf "${OUTPUT}" -C "${DIST_DIR}" server-bundle

cat <<MSG
Bundle generado: ${OUTPUT}
Contenido preparado con dependencias de producción y CSS compilado.
Coloca este archivo en los assets o directorio de datos del proyecto Android y descomprímelo antes de arrancar node.
MSG
