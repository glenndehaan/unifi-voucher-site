# UniFi Voucher - Android App

Aplicación Android nativa para gestionar vouchers UniFi. Soporta dos modos de operación:
- **EMBEDDED**: Ejecuta Node.js localmente en el dispositivo (requiere nodejs-mobile)
- **EXTERNAL**: Se conecta a un servidor externo (Docker o desarrollo local)

## Abrir en Android Studio

1. Abre Android Studio
2. Selecciona **File → Open**
3. Navega a la carpeta `android-wrapper` y ábrela
4. Espera a que Gradle sincronice (puede tardar unos minutos la primera vez)

## Modos de Operación

### Modo EXTERNAL (Desarrollo) - Recomendado para empezar

Este modo conecta la app a un servidor que ya está corriendo (Docker o local).

1. **Inicia el servidor en tu PC:**
   ```bash
   # Opción A: Con Docker
   docker-compose up

   # Opción B: Directamente con Node.js
   cd ..  # directorio raíz del proyecto
   npm install
   npm run build
   npm start
   ```

2. **Configura la IP del servidor en la app:**

   Edita `NodeService.kt` y cambia la URL:
   ```kotlin
   // En NodeService.kt, línea ~40
   var externalServerUrl = "http://192.168.1.100:3000"  // IP de tu PC
   ```

3. **Ejecuta la app en Android Studio (Run → Run 'app')**

La app detectará automáticamente que nodejs-mobile no está disponible y usará el modo EXTERNAL.

### Modo EMBEDDED (Producción)

Para ejecutar Node.js directamente en el dispositivo, necesitas integrar **nodejs-mobile**:

1. Descarga nodejs-mobile desde: https://github.com/nickolee/nickolee-mobile-android/releases

2. Copia las librerías nativas a:
   ```
   app/src/main/jniLibs/
   ├── arm64-v8a/
   │   └── libnode.so
   ├── armeabi-v7a/
   │   └── libnode.so
   ├── x86/
   │   └── libnode.so
   └── x86_64/
       └── libnode.so
   ```

3. Prepara el proyecto Node.js:
   ```bash
   chmod +x scripts/prepare-nodejs-project.sh
   ./scripts/prepare-nodejs-project.sh
   ```

4. Descomenta la dependencia en `app/build.gradle.kts`:
   ```kotlin
   implementation(files("libs/nodejs-mobile-android.aar"))
   ```

## Estructura del Proyecto

```
android-wrapper/
├── app/
│   ├── src/main/
│   │   ├── java/com/unifi/voucher/
│   │   │   ├── MainActivity.kt          # WebView principal
│   │   │   ├── SetupActivity.kt         # Configuración inicial
│   │   │   ├── SettingsActivity.kt      # Ajustes
│   │   │   ├── SplashActivity.kt        # Pantalla de carga
│   │   │   ├── NodeService.kt           # Servicio (EMBEDDED/EXTERNAL)
│   │   │   ├── ConfigManager.kt         # Gestión de options.json
│   │   │   ├── BootReceiver.kt          # Auto-inicio
│   │   │   └── VoucherApplication.kt    # Application class
│   │   ├── res/
│   │   │   ├── layout/                  # Layouts XML
│   │   │   ├── values/                  # Strings, colors, themes
│   │   │   └── values-es/               # Traducción español
│   │   └── assets/
│   │       └── nodejs-project/          # Servidor (generado)
│   └── build.gradle.kts
├── nodejs-assets/
│   └── nodejs-project/
│       └── main.js                      # Entry point nodejs-mobile
├── scripts/
│   └── prepare-nodejs-project.sh
├── gradlew                              # Gradle wrapper (Linux/Mac)
├── gradlew.bat                          # Gradle wrapper (Windows)
└── settings.gradle.kts
```

## Compilación desde Línea de Comandos

```bash
# Debug APK
./gradlew assembleDebug

# Release APK (requiere configurar firma)
./gradlew assembleRelease

# Instalar en dispositivo conectado
./gradlew installDebug
# o
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Configuración de la App

Al primer inicio, aparece un wizard de configuración:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Controller IP | IP del UniFi Controller | 192.168.1.1 |
| Port | Puerto HTTPS | 443 |
| API Token | Token de acceso local | uuid-format |
| Site ID | ID del sitio | default |
| WiFi SSID | Nombre de la red guest | Guest-WiFi |
| Voucher Types | Tipos predefinidos | 480,1,,,;1440,1,,,; |

### Obtener el API Token

1. Abre UniFi Network en el navegador
2. Ve a **Settings → Control Plane → Local API Access**
3. Crea un nuevo token
4. Cópialo a la app

## Debug

```bash
# Ver logs de la app
adb logcat | grep -E "(UniFiVoucher|NodeService|MainActivity)"

# Ver todos los logs
adb logcat -s UniFiVoucher:V NodeService:V MainActivity:V

# Limpiar y reinstalar
./gradlew clean installDebug
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      Android App                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐     ┌────────────────────────────────┐   │
│  │ SplashActivity│────►│ SetupActivity (si no hay config)│  │
│  └──────────────┘     └────────────────────────────────┘   │
│         │                          │                        │
│         ▼                          ▼                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   MainActivity                        │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │                   WebView                       │  │  │
│  │  │           http://[SERVER]:3000                 │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   NodeService                         │  │
│  │                                                       │  │
│  │   EMBEDDED Mode          │    EXTERNAL Mode           │  │
│  │   ─────────────          │    ─────────────           │  │
│  │   nodejs-mobile          │    Connect to              │  │
│  │   127.0.0.1:3000        │    192.168.x.x:3000        │  │
│  │                          │    (Docker/Local)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Limitaciones

| Funcionalidad | EMBEDDED | EXTERNAL |
|--------------|----------|----------|
| Crear vouchers | ✅ | ✅ |
| Ver vouchers | ✅ | ✅ |
| Eliminar vouchers | ✅ | ✅ |
| Generar PDF | ✅ (descarga) | ✅ (descarga) |
| Impresora ESC/POS | ❌ | ⚠️ (si la impresora es accesible) |
| Enviar email | ⚠️ | ✅ |
| Funciona offline | ✅ | ❌ |

## Solución de Problemas

### "Server failed to start"
- **Modo EXTERNAL**: Verifica que el servidor esté corriendo y la IP sea correcta
- **Modo EMBEDDED**: Verifica que nodejs-mobile esté correctamente integrado

### "Connection refused"
- Asegúrate de que el dispositivo y el servidor estén en la misma red
- Verifica que el firewall permita conexiones al puerto 3000

### "No se puede conectar al UniFi Controller"
- Verifica la IP y puerto del controller
- Asegúrate de que el token API sea válido
- El dispositivo debe poder alcanzar el controller por red

### La app se cierra en segundo plano
- Android puede matar el servicio por optimización de batería
- Añade la app a la lista de excepciones de optimización de batería

## Requisitos

### Desarrollo
- Android Studio Hedgehog (2023.1.1) o superior
- JDK 17+
- Android SDK 34

### Dispositivo
- Android 7.0 (API 24) o superior
- ~100MB de espacio (modo EXTERNAL)
- ~150MB de espacio (modo EMBEDDED)

## Licencia

MIT License
