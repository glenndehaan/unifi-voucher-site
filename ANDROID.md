# UniFi Voucher - Android App

Esta documentación describe cómo empaquetar el servidor UniFi Voucher como una aplicación Android nativa que ejecuta Node.js localmente en el dispositivo.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      Android App (APK)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   MainActivity  │    │        SetupActivity            │ │
│  │    (WebView)    │◄───│   (Configuración inicial)       │ │
│  │                 │    │   - UniFi Controller IP         │ │
│  │ 127.0.0.1:3000  │    │   - API Token                   │ │
│  └────────┬────────┘    │   - SSID / Password             │ │
│           │             │   - Tipos de voucher            │ │
│           ▼             └─────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              nodejs-mobile Runtime                       ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │            Express Server (server.js)               │││
│  │  │  - Sirve UI web en puerto 3000                      │││
│  │  │  - Conecta a UniFi Controller                       │││
│  │  │  - Genera PDFs, QR codes                            │││
│  │  │  - Lee configuración de options.json                │││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  /data/data/com.unifi.voucher/files/                        │
│  ├── nodejs-project/     ← Servidor Node.js                 │
│  │   ├── server.js                                          │
│  │   ├── node_modules/                                      │
│  │   └── public/                                            │
│  └── options.json        ← Configuración persistente        │
└─────────────────────────────────────────────────────────────┘
```

## Requisitos

### Para desarrollo
- Android Studio Arctic Fox (2020.3.1) o superior
- JDK 17+
- Node.js 18+ (para preparar el bundle del servidor)
- Android SDK 24+ (Android 7.0 Nougat mínimo)

### Para el dispositivo
- Android 7.0 (API 24) o superior
- ~150MB de espacio libre
- Conexión a la misma red que el UniFi Controller

## Tecnologías utilizadas

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| App nativa | Kotlin | UI de configuración, WebView, ciclo de vida |
| Runtime Node.js | [nodejs-mobile](https://github.com/nickolee/nodejs-mobile-android) | Ejecutar servidor Express en Android |
| Servidor | Express.js | Mismo código del proyecto Docker |
| UI Web | EJS + Tailwind | Interfaz de vouchers (sin cambios) |
| Comunicación | localhost:3000 | WebView ↔ Node.js |

## Estructura del proyecto Android

```
android-wrapper/
├── app/
│   ├── src/main/
│   │   ├── java/com/unifi/voucher/
│   │   │   ├── MainActivity.kt          # WebView principal
│   │   │   ├── SetupActivity.kt         # Configuración inicial
│   │   │   ├── NodeService.kt           # Servicio Node.js en background
│   │   │   └── BootReceiver.kt          # Auto-inicio opcional
│   │   ├── assets/
│   │   │   └── nodejs-project/          # Bundle del servidor
│   │   │       ├── server.js
│   │   │       ├── node_modules/
│   │   │       └── ...
│   │   └── res/
│   │       ├── layout/
│   │       │   ├── activity_main.xml
│   │       │   └── activity_setup.xml
│   │       ├── values/
│   │       │   ├── strings.xml
│   │       │   └── themes.xml
│   │       └── drawable/
│   │           └── ic_launcher.xml
│   └── build.gradle.kts
├── nodejs-assets/
│   └── nodejs-project/
│       └── main.js                      # Entry point para nodejs-mobile
├── scripts/
│   ├── prepare-nodejs-project.sh        # Copia servidor a assets
│   └── build-server-bundle.sh           # Empaqueta servidor
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

## Flujo de la aplicación

### Primer inicio
1. App detecta que no existe `options.json`
2. Muestra `SetupActivity` con formulario de configuración
3. Usuario ingresa datos del UniFi Controller
4. Se guarda `options.json` en el almacenamiento interno
5. Se inicia `NodeService` con el servidor Express
6. Se abre `MainActivity` con WebView a `http://127.0.0.1:3000`

### Inicios posteriores
1. App detecta que existe `options.json`
2. Inicia `NodeService` directamente
3. Espera a que `/_health` responda OK
4. Abre WebView a `http://127.0.0.1:3000`

### Diagrama de secuencia
```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────────┐
│  User   │     │ MainActivity│     │ NodeService │     │  Express   │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └─────┬──────┘
     │                 │                   │                  │
     │  Abre app       │                   │                  │
     │────────────────>│                   │                  │
     │                 │                   │                  │
     │                 │  startService()   │                  │
     │                 │──────────────────>│                  │
     │                 │                   │                  │
     │                 │                   │  node server.js  │
     │                 │                   │─────────────────>│
     │                 │                   │                  │
     │                 │                   │  Server ready    │
     │                 │                   │<─────────────────│
     │                 │                   │                  │
     │                 │  GET /_health OK  │                  │
     │                 │<──────────────────│                  │
     │                 │                   │                  │
     │  WebView loaded │                   │                  │
     │<────────────────│                   │                  │
     │                 │                   │                  │
```

## Configuración (options.json)

El archivo `options.json` se almacena en el directorio interno de la app y contiene:

```json
{
  "unifi_ip": "192.168.1.1",
  "unifi_port": 443,
  "unifi_token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "unifi_site": "default",
  "unifi_ssid": "Guest-WiFi",
  "unifi_ssid_password": "",
  "voucher_types": "480,1,,,;1440,1,,,;",
  "voucher_custom": false,
  "auth_disable": true,
  "service_web": true,
  "log_level": "info"
}
```

### Mapeo de variables

| Variable Docker | Clave options.json | Descripción |
|-----------------|-------------------|-------------|
| `UNIFI_IP` | `unifi_ip` | IP del UniFi Controller |
| `UNIFI_PORT` | `unifi_port` | Puerto (443 por defecto) |
| `UNIFI_TOKEN` | `unifi_token` | Token API local |
| `UNIFI_SITE_ID` | `unifi_site` | ID del sitio |
| `UNIFI_SSID` | `unifi_ssid` | Nombre de la red WiFi |
| `VOUCHER_TYPES` | `voucher_types` | Tipos de voucher |
| `AUTH_DISABLE` | `auth_disable` | Desactivar autenticación |

## Compilación

### 1. Preparar el bundle del servidor

```bash
cd android-wrapper
./scripts/prepare-nodejs-project.sh
```

Este script:
- Copia el servidor desde el directorio padre
- Ejecuta `npm ci` para instalar dependencias
- Ejecuta `npm run build` para compilar CSS
- Limpia archivos innecesarios (tests, docs, .git)
- Copia todo a `app/src/main/assets/nodejs-project/`

### 2. Compilar el APK

```bash
# Debug
./gradlew assembleDebug

# Release (requiere firma)
./gradlew assembleRelease
```

Los APKs se generan en:
- `app/build/outputs/apk/debug/app-debug.apk`
- `app/build/outputs/apk/release/app-release.apk`

### 3. Instalar en dispositivo

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Limitaciones conocidas

| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Crear vouchers | ✅ Funciona | Conexión directa a UniFi API |
| Ver vouchers | ✅ Funciona | |
| Imprimir PDF | ⚠️ Parcial | Descarga el PDF, usuario imprime manualmente |
| Impresora ESC/POS | ❌ No soportado | Requiere acceso de red a impresora |
| Enviar email | ⚠️ Parcial | Funciona si SMTP accesible desde móvil |
| OIDC/SSO | ❌ No soportado | No tiene sentido en app local |
| Modo Kiosk | ✅ Funciona | Ideal para tablets |

## Funcionalidades específicas de Android

### Notificación persistente
El servicio Node.js muestra una notificación mientras está activo para evitar que Android lo mate.

### Auto-inicio (opcional)
La app puede configurarse para iniciarse automáticamente al encender el dispositivo.

### Modo pantalla completa
La app oculta la barra de navegación para una experiencia más inmersiva.

### Manejo de conectividad
La app detecta cambios en la red y reconecta automáticamente al servidor Node.js.

## Desarrollo

### Prerequisitos
1. Clonar el repositorio
2. Abrir `android-wrapper/` en Android Studio
3. Sincronizar Gradle
4. Ejecutar `./scripts/prepare-nodejs-project.sh`

### Estructura de archivos principales

| Archivo | Descripción |
|---------|-------------|
| `MainActivity.kt` | WebView que muestra la UI del servidor |
| `SetupActivity.kt` | Formulario de configuración inicial |
| `NodeService.kt` | Servicio en foreground que ejecuta Node.js |
| `main.js` | Entry point de nodejs-mobile que carga server.js |

### Debug
```bash
# Ver logs del servidor Node.js
adb logcat | grep -E "(NodeJS|UniFiVoucher)"

# Ver logs de la app
adb logcat | grep "com.unifi.voucher"
```

## FAQ

### ¿Por qué nodejs-mobile y no WebView a servidor externo?
Para que funcione 100% offline y no dependa de un servidor Docker corriendo en otra máquina.

### ¿Puedo usar la misma app en varios dispositivos?
Sí, cada dispositivo tendrá su propia instancia del servidor conectando al mismo UniFi Controller.

### ¿Qué pasa si cambio la IP del UniFi Controller?
Ve a Configuración en la app y actualiza la IP. El servidor se reiniciará con la nueva configuración.

### ¿Puedo ver los vouchers creados desde Docker en la app?
Sí, ambos leen del mismo UniFi Controller. Los vouchers son compartidos.

### ¿Cuánto espacio ocupa la app?
Aproximadamente 100-150MB instalada (incluye el runtime de Node.js).

## Roadmap

- [ ] Integración con impresoras Bluetooth
- [ ] Modo offline con cache local
- [ ] Widget para crear vouchers rápidamente
- [ ] Soporte para múltiples sitios UniFi
- [ ] Exportar/importar configuración

## Licencia

MIT License - Igual que el proyecto principal.
