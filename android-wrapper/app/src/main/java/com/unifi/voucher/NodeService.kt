package com.unifi.voucher

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Foreground service that runs the Node.js server.
 *
 * This service supports two modes:
 * 1. EMBEDDED: Node.js runs locally via nodejs-mobile (requires native library integration)
 * 2. EXTERNAL: Connects to an external server (for development or when using Docker)
 *
 * Set the mode via BuildConfig or at runtime.
 */
class NodeService : Service() {

    companion object {
        const val TAG = "NodeService"
        const val ACTION_START = "com.unifi.voucher.START_NODE"
        const val ACTION_STOP = "com.unifi.voucher.STOP_NODE"
        const val NOTIFICATION_ID = 1

        // Server mode: EMBEDDED (nodejs-mobile) or EXTERNAL (remote server)
        enum class ServerMode { EMBEDDED, EXTERNAL }

        // Default to EMBEDDED, change to EXTERNAL for development
        var serverMode = ServerMode.EMBEDDED

        // External server URL (used when serverMode = EXTERNAL)
        var externalServerUrl = "http://192.168.1.100:3000"

        var isRunning = false
            private set

        var serverReady = false
            private set

        // Check if nodejs-mobile libraries are available
        private var nodejsMobileAvailable = false

        init {
            try {
                System.loadLibrary("node")
                System.loadLibrary("nodejs-mobile")
                nodejsMobileAvailable = true
                Log.i(TAG, "nodejs-mobile libraries loaded successfully")
            } catch (e: UnsatisfiedLinkError) {
                Log.w(TAG, "nodejs-mobile libraries not found, falling back to EXTERNAL mode")
                nodejsMobileAvailable = false
                serverMode = ServerMode.EXTERNAL
            }
        }
    }

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var nodeThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Service created (mode: $serverMode)")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopNodeServer()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START, null -> {
                if (!isRunning) {
                    startForeground(NOTIFICATION_ID, createNotification())
                    startNodeServer()
                }
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopNodeServer()
        serviceScope.cancel()
        Log.i(TAG, "Service destroyed")
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, NodeService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val modeText = when (serverMode) {
            ServerMode.EMBEDDED -> getString(R.string.notification_text)
            ServerMode.EXTERNAL -> "Connected to external server"
        }

        return NotificationCompat.Builder(this, VoucherApplication.CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(modeText)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .addAction(R.drawable.ic_stop, getString(R.string.stop), stopPendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun startNodeServer() {
        if (isRunning) return

        isRunning = true
        serverReady = false

        serviceScope.launch {
            try {
                when (serverMode) {
                    ServerMode.EMBEDDED -> startEmbeddedServer()
                    ServerMode.EXTERNAL -> startExternalMode()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start server", e)
                isRunning = false
            }
        }
    }

    /**
     * Start embedded Node.js server using nodejs-mobile
     */
    private suspend fun startEmbeddedServer() {
        if (!nodejsMobileAvailable) {
            Log.e(TAG, "nodejs-mobile not available, cannot start embedded server")
            isRunning = false
            return
        }

        // Extract Node.js project from assets
        extractNodeProject()

        // Start Node.js in a separate thread
        nodeThread = Thread {
            try {
                Log.i(TAG, "Starting embedded Node.js server...")
                val projectDir = ConfigManager(this@NodeService).getNodeProjectDir()
                startNode(projectDir.absolutePath)
            } catch (e: Exception) {
                Log.e(TAG, "Error running Node.js", e)
            }
        }
        nodeThread?.start()

        // Wait for server to be ready
        waitForServer("http://${VoucherApplication.SERVER_HOST}:${VoucherApplication.SERVER_PORT}")
    }

    /**
     * Connect to external server (development mode)
     */
    private suspend fun startExternalMode() {
        Log.i(TAG, "External mode: connecting to $externalServerUrl")

        // Just wait for external server to be available
        waitForServer(externalServerUrl)
    }

    private fun extractNodeProject() {
        val configManager = ConfigManager(this)
        val projectDir = configManager.getNodeProjectDir()

        // Check if already extracted
        if (File(projectDir, "server.js").exists()) {
            Log.i(TAG, "Node.js project already extracted")
            return
        }

        Log.i(TAG, "Extracting Node.js project to ${projectDir.absolutePath}")

        // Create directory
        projectDir.mkdirs()

        // Copy from assets
        val assetManager = assets
        copyAssetFolder(assetManager, "nodejs-project", projectDir.absolutePath)

        Log.i(TAG, "Node.js project extracted successfully")
    }

    private fun copyAssetFolder(
        assetManager: android.content.res.AssetManager,
        srcPath: String,
        dstPath: String
    ) {
        try {
            val files = assetManager.list(srcPath) ?: return

            if (files.isEmpty()) {
                // It's a file, copy it
                copyAssetFile(assetManager, srcPath, dstPath)
            } else {
                // It's a directory, create it and copy contents
                File(dstPath).mkdirs()
                for (file in files) {
                    copyAssetFolder(assetManager, "$srcPath/$file", "$dstPath/$file")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error copying asset: $srcPath", e)
        }
    }

    private fun copyAssetFile(
        assetManager: android.content.res.AssetManager,
        srcPath: String,
        dstPath: String
    ) {
        try {
            assetManager.open(srcPath).use { input ->
                FileOutputStream(dstPath).use { output ->
                    input.copyTo(output)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error copying file: $srcPath", e)
        }
    }

    private suspend fun waitForServer(baseUrl: String) {
        val maxAttempts = 30
        val delayMs = 1000L
        val healthUrl = "$baseUrl/_health"

        Log.i(TAG, "Waiting for server at $healthUrl")

        for (attempt in 1..maxAttempts) {
            if (checkServerHealth(healthUrl)) {
                serverReady = true
                Log.i(TAG, "Server is ready after $attempt attempts")

                // Broadcast server ready event
                sendBroadcast(Intent("com.unifi.voucher.SERVER_READY"))
                return
            }
            delay(delayMs)
        }

        Log.e(TAG, "Server failed to respond after $maxAttempts attempts")
        // Still mark as running but not ready - UI will show error
    }

    private fun checkServerHealth(healthUrl: String): Boolean {
        return try {
            val url = URL(healthUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 2000
            connection.readTimeout = 2000
            connection.requestMethod = "GET"

            val responseCode = connection.responseCode
            connection.disconnect()

            responseCode == 200
        } catch (e: Exception) {
            false
        }
    }

    private fun stopNodeServer() {
        if (!isRunning) return

        Log.i(TAG, "Stopping Node.js server...")
        isRunning = false
        serverReady = false

        if (serverMode == ServerMode.EMBEDDED) {
            nodeThread?.interrupt()
            nodeThread = null

            // Kill any lingering Node.js process
            if (nodejsMobileAvailable) {
                try {
                    stopNode()
                } catch (e: Exception) {
                    Log.e(TAG, "Error stopping Node.js", e)
                }
            }
        }
    }

    /**
     * Native method to start Node.js - implemented by nodejs-mobile
     * Only call if nodejsMobileAvailable is true
     */
    private external fun startNode(projectPath: String)

    /**
     * Native method to stop Node.js
     * Only call if nodejsMobileAvailable is true
     */
    private external fun stopNode()

    /**
     * Get the current server URL based on mode
     */
    fun getServerUrl(): String {
        return when (serverMode) {
            ServerMode.EMBEDDED -> "http://${VoucherApplication.SERVER_HOST}:${VoucherApplication.SERVER_PORT}"
            ServerMode.EXTERNAL -> externalServerUrl
        }
    }
}
