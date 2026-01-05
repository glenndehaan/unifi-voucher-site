package com.unifi.voucher

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Splash screen that checks configuration and starts the appropriate activity.
 */
@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    companion object {
        const val TAG = "SplashActivity"
    }

    private val configManager by lazy { ConfigManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        lifecycleScope.launch {
            // Small delay for splash visibility
            delay(500)

            checkConfigAndNavigate()
        }
    }

    private fun checkConfigAndNavigate() {
        Log.i(TAG, "Checking configuration...")

        if (configManager.hasConfig()) {
            val config = configManager.loadConfig()
            val validation = configManager.validateConfig(config)

            if (validation.isValid) {
                Log.i(TAG, "Configuration valid, starting main activity")
                startMainActivity()
            } else {
                Log.w(TAG, "Configuration invalid: ${validation.errors}")
                startSetupActivity()
            }
        } else {
            Log.i(TAG, "No configuration found, starting setup")
            startSetupActivity()
        }
    }

    private fun startMainActivity() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun startSetupActivity() {
        val intent = Intent(this, SetupActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
