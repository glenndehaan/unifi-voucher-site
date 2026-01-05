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
 */
class NodeService : Service() {

    companion object {
        const val TAG = "NodeService"
        const val ACTION_START = "com.unifi.voucher.START_NODE"
        const val ACTION_STOP = "com.unifi.voucher.STOP_NODE"
        const val NOTIFICATION_ID = 1

        var isRunning = false
            private set

        var serverReady = false
            private set
    }

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var nodeThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Service created")
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

        return NotificationCompat.Builder(this, VoucherApplication.CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
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
                // Ensure Node.js project is extracted
                extractNodeProject()

                // Start Node.js in a separate thread
                nodeThread = Thread {
                    try {
                        Log.i(TAG, "Starting Node.js server...")
                        val projectDir = ConfigManager(this@NodeService).getNodeProjectDir()

                        // Use nodejs-mobile to start the server
                        // Note: This requires the nodejs-mobile library integration
                        startNode(projectDir.absolutePath)

                    } catch (e: Exception) {
                        Log.e(TAG, "Error running Node.js", e)
                    }
                }
                nodeThread?.start()

                // Wait for server to be ready
                waitForServer()

            } catch (e: Exception) {
                Log.e(TAG, "Failed to start Node.js server", e)
                isRunning = false
            }
        }
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

    private fun copyAssetFolder(assetManager: android.content.res.AssetManager, srcPath: String, dstPath: String) {
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

    private fun copyAssetFile(assetManager: android.content.res.AssetManager, srcPath: String, dstPath: String) {
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

    private suspend fun waitForServer() {
        val maxAttempts = 30
        val delayMs = 1000L

        for (attempt in 1..maxAttempts) {
            if (checkServerHealth()) {
                serverReady = true
                Log.i(TAG, "Server is ready after $attempt attempts")

                // Broadcast server ready event
                sendBroadcast(Intent("com.unifi.voucher.SERVER_READY"))
                return
            }
            delay(delayMs)
        }

        Log.e(TAG, "Server failed to start after $maxAttempts attempts")
    }

    private fun checkServerHealth(): Boolean {
        return try {
            val url = URL("http://${VoucherApplication.SERVER_HOST}:${VoucherApplication.SERVER_PORT}/_health")
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 1000
            connection.readTimeout = 1000
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

        nodeThread?.interrupt()
        nodeThread = null

        // Kill any lingering Node.js process
        stopNode()
    }

    /**
     * Native method to start Node.js - implemented by nodejs-mobile
     */
    private external fun startNode(projectPath: String)

    /**
     * Native method to stop Node.js
     */
    private external fun stopNode()

    init {
        try {
            System.loadLibrary("nodejs-mobile")
            System.loadLibrary("node")
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "Failed to load native libraries", e)
        }
    }
}
