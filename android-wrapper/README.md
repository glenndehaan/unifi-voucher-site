# UniFi Voucher - Android App

Aplicación Android nativa que ejecuta el servidor UniFi Voucher localmente usando **nodejs-mobile**.

## Características

- Servidor Node.js ejecutándose localmente en el dispositivo
- No requiere servidor externo ni Docker
- Funciona offline (solo necesita conexión al UniFi Controller)
- Interfaz web completa via WebView
- Configuración inicial guiada
- Auto-inicio opcional al encender el dispositivo

## Requisitos

### Para desarrollo
- Android Studio Arctic Fox (2020.3.1) o superior
- JDK 17+
- Node.js 18+ (para preparar el bundle)
- Android SDK 24+

### Para el dispositivo
- Android 7.0 (API 24) o superior
- ~150MB de espacio libre
- Conexión a la misma red que el UniFi Controller

## Estructura del proyecto

```
android-wrapper/
├── app/
│   ├── src/main/
│   │   ├── java/com/unifi/voucher/
│   │   │   ├── MainActivity.kt          # WebView principal
│   │   │   ├── SetupActivity.kt         # Configuración inicial
│   │   │   ├── SettingsActivity.kt      # Ajustes de la app
│   │   │   ├── SplashActivity.kt        # Pantalla de carga
│   │   │   ├── NodeService.kt           # Servicio Node.js
│   │   │   ├── ConfigManager.kt         # Gestión de configuración
│   │   │   ├── BootReceiver.kt          # Auto-inicio
│   │   │   └── VoucherApplication.kt    # Application class
│   │   ├── assets/
│   │   │   └── nodejs-project/          # Servidor (generado)
│   │   └── res/                         # Recursos Android
│   └── build.gradle.kts
├── nodejs-assets/
│   └── nodejs-project/
│       └── main.js                      # Entry point nodejs-mobile
├── scripts/
│   ├── prepare-nodejs-project.sh        # Prepara el servidor
│   └── build-server-bundle.sh           # Bundle legacy
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

## Compilación

### 1. Preparar el proyecto Node.js

```bash
cd android-wrapper
chmod +x scripts/prepare-nodejs-project.sh
./scripts/prepare-nodejs-project.sh
```

Este script:
- Copia el servidor desde el directorio padre
- Instala dependencias de producción
- Compila el CSS (Tailwind)
- Limpia archivos innecesarios

### 2. Abrir en Android Studio

```bash
# Abrir Android Studio y seleccionar la carpeta android-wrapper
```

### 3. Compilar el APK

```bash
# Debug
./gradlew assembleDebug

# Release (requiere configurar firma)
./gradlew assembleRelease
```

### 4. Instalar en dispositivo

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Configuración

Al primer inicio, la app mostrará una pantalla de configuración donde debes ingresar:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Controller IP | IP del UniFi Controller | 192.168.1.1 |
| Port | Puerto HTTPS | 443 |
| API Token | Token de acceso local | uuid-token |
| Site ID | ID del sitio | default |
| WiFi SSID | Nombre de la red | Guest-WiFi |
| Voucher Types | Tipos predefinidos | 480,1,,,;1440,1,,,; |

### Obtener el API Token

1. Abre la interfaz web del UniFi Controller
2. Ve a **Settings → Control Plane → Local API Access**
3. Genera un nuevo token de acceso local
4. Copia el token a la configuración de la app

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      Android App (APK)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   MainActivity  │    │        SetupActivity            │ │
│  │    (WebView)    │◄───│   (Configuración inicial)       │ │
│  │ 127.0.0.1:3000  │    └─────────────────────────────────┘ │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              nodejs-mobile Runtime                       ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │            Express Server (server.js)               │││
│  │  │  - Puerto 3000                                      │││
│  │  │  - API UniFi                                        │││
│  │  │  - Generación PDF/QR                                │││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Limitaciones

| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Crear vouchers | ✅ | Conexión directa a UniFi API |
| Ver/eliminar vouchers | ✅ | |
| Generar PDF | ✅ | Descarga a Downloads |
| Impresora ESC/POS | ❌ | No soportado en Android |
| Enviar email | ⚠️ | Depende de acceso SMTP |
| OIDC/SSO | ❌ | No aplica en app local |

## Desarrollo

### Debug del servidor Node.js

```bash
adb logcat | grep -E "(NodeJS|UniFiVoucher|NodeService)"
```

### Modificar el servidor

1. Haz cambios en el código del servidor (directorio padre)
2. Ejecuta `./scripts/prepare-nodejs-project.sh`
3. Recompila el APK

## Solución de problemas

### El servidor no inicia
- Verifica que el proyecto Node.js esté en `nodejs-assets/nodejs-project/`
- Revisa los logs: `adb logcat | grep NodeService`

### No conecta al UniFi Controller
- Verifica que el dispositivo esté en la misma red
- Comprueba IP, puerto y token
- El Controller debe aceptar conexiones desde la IP del dispositivo

### La app se cierra inesperadamente
- Android puede matar el servicio por falta de memoria
- Asegúrate de que la notificación del servicio esté visible

## Licencia

MIT License - Igual que el proyecto principal.
