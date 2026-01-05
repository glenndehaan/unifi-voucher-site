package com.unifi.voucher

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.unifi.voucher.databinding.ActivitySettingsBinding

/**
 * Settings activity to modify configuration.
 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private val configManager by lazy { ConfigManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        setupUI()
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }

    private fun setupUI() {
        binding.btnEditConfig.setOnClickListener {
            // Go to setup activity in edit mode
            val intent = Intent(this, SetupActivity::class.java)
            startActivity(intent)
        }

        binding.btnRestartServer.setOnClickListener {
            restartServer()
        }

        binding.btnResetConfig.setOnClickListener {
            confirmResetConfig()
        }

        binding.btnAbout.setOnClickListener {
            showAbout()
        }

        // Display current config summary
        displayConfigSummary()
    }

    private fun displayConfigSummary() {
        val config = configManager.loadConfig()

        binding.tvUnifiIp.text = config.unifi_ip.ifEmpty { "-" }
        binding.tvUnifiSite.text = config.unifi_site
        binding.tvSsid.text = config.unifi_ssid.ifEmpty { "-" }
        binding.tvServerStatus.text = if (NodeService.isRunning) {
            getString(R.string.server_running)
        } else {
            getString(R.string.server_stopped)
        }
    }

    private fun restartServer() {
        Toast.makeText(this, R.string.restarting_server, Toast.LENGTH_SHORT).show()

        // Stop the service
        val stopIntent = Intent(this, NodeService::class.java).apply {
            action = NodeService.ACTION_STOP
        }
        stopService(stopIntent)

        // Wait a moment and restart
        binding.root.postDelayed({
            val startIntent = Intent(this, NodeService::class.java).apply {
                action = NodeService.ACTION_START
            }
            startForegroundService(startIntent)

            Toast.makeText(this, R.string.server_restarted, Toast.LENGTH_SHORT).show()
            displayConfigSummary()
        }, 2000)
    }

    private fun confirmResetConfig() {
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.reset_config_title)
            .setMessage(R.string.reset_config_message)
            .setPositiveButton(R.string.reset) { _, _ ->
                resetConfig()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun resetConfig() {
        // Stop server
        val stopIntent = Intent(this, NodeService::class.java).apply {
            action = NodeService.ACTION_STOP
        }
        stopService(stopIntent)

        // Delete config
        configManager.deleteConfig()

        Toast.makeText(this, R.string.config_reset, Toast.LENGTH_SHORT).show()

        // Go back to setup
        val intent = Intent(this, SetupActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun showAbout() {
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.about_title)
            .setMessage(getString(R.string.about_message, BuildConfig.VERSION_NAME))
            .setPositiveButton(R.string.ok, null)
            .show()
    }
}
