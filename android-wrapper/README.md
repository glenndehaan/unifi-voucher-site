# Android wrapper (WebView + servidor local)

Este directorio es una plantilla para un **segundo repositorio** que empaqueta el servidor Node de UniFi Voucher dentro de un APK. El objetivo es evitar dos desarrollos paralelos: el repositorio principal sigue funcionando con Docker y variables de entorno, y este wrapper solo se encarga de empaquetar y lanzar el servidor local en Android.

## Estructura recomendada del wrapper
- `server/`: submódulo o artefacto del repo principal con el código del servidor. Antes de empaquetar, debe tener el CSS compilado (`npm run build`).
- `scripts/`: utilidades para generar el bundle listo para Android.
- `dist/`: salidas generadas (tarball del servidor) que luego se copian al proyecto Android/Cordova/Capacitor.

Si vas a mantener este wrapper en una **rama separada** del repositorio principal, conviene publicar el bundle como artefacto
de CI (o release) para que el proyecto Android pueda descargarlo sin mezclar los historiales de ambos repos.

## Flujo de uso
1. **Clonar como repo independiente**
   ```bash
   git clone <este-wrapper> android-wrapper
   cd android-wrapper
   git submodule add <repo-principal> server
   ```
2. **Preparar el servidor para empaquetar**
   ```bash
   pushd server
   npm ci
   npm run build   # genera public/dist/style.css
   popd
   ```
3. **Generar el bundle**
   ```bash
   ./scripts/build-server-bundle.sh
   ```
   Obtendrás `dist/server-bundle.tar.gz` con:
   - Código del servidor + `node_modules` en modo producción.
   - `public/dist/style.css` generado.
   - Soporte de configuración mediante `options.json` (sin depender de variables de entorno).

4. **Consumir el bundle desde el proyecto Android**
- Copia `dist/server-bundle.tar.gz` al proyecto nativo (assets o directorio de datos).
- Al iniciar la app, descomprime el bundle, escribe un `options.json` con la configuración recogida desde la UI (apikey, impresoras, logo, etc.) y lanza `node server.js` apuntando a `127.0.0.1:3000`.
- Abre un WebView a `http://127.0.0.1:3000` cuando el servidor responda.

Para mantener sincronía con el repositorio principal, actualiza el submódulo (o descarga el artefacto) desde la versión/tag
que desees y vuelve a ejecutar el script de bundling antes de generar el APK.

## Consideraciones de configuración
- El servidor ya admite `options.json` y, si existe, tiene prioridad sobre las variables de entorno. La UI del wrapper debe leer/guardar esa configuración y regenerar el archivo cuando cambie.
- Para branding (logo), coloca el archivo en el área de datos de la app y referencia la ruta en `options.json` (clave `logo_path`).
- Si necesitas restaurar la configuración por defecto, borra el `options.json` generado antes de volver a arrancar el servidor.

## Compatibilidad con el repo principal
- No se modifica ningún archivo del servidor. El wrapper solo consume una copia (o submódulo) del repo principal y genera un artefacto reutilizable.
- El pipeline de CI/CD del wrapper puede fijar una versión/tag del repo principal para builds reproducibles.
