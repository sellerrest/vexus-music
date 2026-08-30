#!/usr/bin/env bash
#
# Пересборка приложений под Windows и Android.
#
# Порядок важен: сначала собирается React-приложение в отдельную папку
# dist-app, и уже её содержимое кладётся внутрь обоих пакетов. Веб-сборка
# (dist) при этом не трогается — у неё другие настройки, см. ниже.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT="$ROOT/webapp/frontend"
API_BASE="${API_BASE:-https://music.vexus.pw}"
SITE_BASE="${SITE_BASE:-https://music.vexus.pw}"

echo "==> React-приложение для пакетов (сервер: $API_BASE, сайт: $SITE_BASE)"
cd "$FRONT"
# --base ./ — пути к файлам относительные: так страница открывается и из
#   пакета Electron, и из WebView, где корень сайта не наш.
# VITE_API_BASE — полный адрес сервера: внутри пакета относительный /api
#   указывал бы сам в себя (см. webapp/frontend/src/api.ts).
VITE_API_BASE="$API_BASE" VITE_SITE_BASE="$SITE_BASE" npx vite build --base ./ --outDir dist-app

echo "==> Windows (.exe)"
cd "$ROOT/apps/desktop"
rm -rf app && mkdir -p app && cp -r "$FRONT/dist-app/." app/
# ELECTRON_RUN_AS_NODE в окружении превращает electron.exe в обычный node —
# снимаем, иначе упаковщик молча собирает пустышку.
# Подпись кода отключена: сертификата нет, а без флага упаковщик лезет за
# набором для подписи и падает на симлинках внутри него.
env -u ELECTRON_RUN_AS_NODE CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --x64

echo "==> Android (.apk)"
cd "$ROOT/apps/mobile"
rm -rf www && mkdir -p www && cp -r "$FRONT/dist-app/." www/
npx cap sync android
cd android
export JAVA_HOME="${JAVA_HOME:-/c/Program Files/Android/Android Studio/jbr}"
./gradlew assembleRelease --no-daemon

echo "==> Готовые файлы"
cd "$ROOT/apps"
mkdir -p dist
cp "desktop/release/Vexus Music Setup 1.0.0.exe" "dist/VexusMusic-Setup-1.0.0.exe"
cp "desktop/release/VexusMusic-portable-1.0.0.exe" "dist/VexusMusic-Portable-1.0.0.exe"
cp "mobile/android/app/build/outputs/apk/release/app-release.apk" "dist/VexusMusic-1.0.0.apk"
ls -la dist/
