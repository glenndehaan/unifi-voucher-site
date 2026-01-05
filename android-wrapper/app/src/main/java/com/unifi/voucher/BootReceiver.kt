package com.unifi.voucher

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Receiver for boot completed event to auto-start the server.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) {
            return
        }

        Log.i(TAG, "Boot completed, checking auto-start configuration")

        val configManager = ConfigManager(context)

        if (!configManager.hasConfig()) {
            Log.i(TAG, "No configuration found, skipping auto-start")
            return
        }

        val config = configManager.loadConfig()

        if (!config.auto_start) {
            Log.i(TAG, "Auto-start disabled, skipping")
            return
        }

        Log.i(TAG, "Auto-start enabled, starting Node.js service")

        val serviceIntent = Intent(context, NodeService::class.java).apply {
            action = NodeService.ACTION_START
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
