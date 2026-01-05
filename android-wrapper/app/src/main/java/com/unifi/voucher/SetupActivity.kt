package com.unifi.voucher

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.unifi.voucher.databinding.ActivitySetupBinding

/**
 * Setup activity for initial configuration of the UniFi Controller connection.
 */
class SetupActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySetupBinding
    private val configManager by lazy { ConfigManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySetupBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
        loadExistingConfig()
    }

    private fun setupUI() {
        binding.btnSave.setOnClickListener {
            saveConfiguration()
        }

        binding.btnTestConnection.setOnClickListener {
            testConnection()
        }

        binding.btnHelp.setOnClickListener {
            showHelp()
        }

        // Default voucher types
        binding.etVoucherTypes.setText("480,1,,,;1440,1,,,;")
    }

    private fun loadExistingConfig() {
        if (configManager.hasConfig()) {
            val config = configManager.loadConfig()

            binding.etUnifiIp.setText(config.unifi_ip)
            binding.etUnifiPort.setText(config.unifi_port.toString())
            binding.etUnifiToken.setText(config.unifi_token)
            binding.etUnifiSite.setText(config.unifi_site)
            binding.etSsid.setText(config.unifi_ssid)
            binding.etSsidPassword.setText(config.unifi_ssid_password)
            binding.etVoucherTypes.setText(config.voucher_types)
            binding.cbVoucherCustom.isChecked = config.voucher_custom
            binding.cbAutoStart.isChecked = config.auto_start

            binding.btnSave.text = getString(R.string.update_config)
        }
    }

    private fun saveConfiguration() {
        val config = ConfigManager.Config(
            unifi_ip = binding.etUnifiIp.text.toString().trim(),
            unifi_port = binding.etUnifiPort.text.toString().toIntOrNull() ?: 443,
            unifi_token = binding.etUnifiToken.text.toString().trim(),
            unifi_site = binding.etUnifiSite.text.toString().trim().ifEmpty { "default" },
            unifi_ssid = binding.etSsid.text.toString().trim(),
            unifi_ssid_password = binding.etSsidPassword.text.toString(),
            voucher_types = binding.etVoucherTypes.text.toString().trim(),
            voucher_custom = binding.cbVoucherCustom.isChecked,
            auto_start = binding.cbAutoStart.isChecked
        )

        // Validate
        val validation = configManager.validateConfig(config)
        if (!validation.isValid) {
            showError(validation.errors.joinToString("\n"))
            return
        }

        // Save
        if (configManager.saveConfig(config)) {
            Toast.makeText(this, R.string.config_saved, Toast.LENGTH_SHORT).show()
            startMainActivity()
        } else {
            showError(getString(R.string.error_saving_config))
        }
    }

    private fun testConnection() {
        val ip = binding.etUnifiIp.text.toString().trim()
        val port = binding.etUnifiPort.text.toString().toIntOrNull() ?: 443
        val token = binding.etUnifiToken.text.toString().trim()

        if (ip.isEmpty() || token.isEmpty()) {
            showError(getString(R.string.error_missing_fields))
            return
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.btnTestConnection.isEnabled = false

        Thread {
            val success = testUnifiConnection(ip, port, token)

            runOnUiThread {
                binding.progressBar.visibility = View.GONE
                binding.btnTestConnection.isEnabled = true

                if (success) {
                    Toast.makeText(this, R.string.connection_success, Toast.LENGTH_SHORT).show()
                } else {
                    showError(getString(R.string.connection_failed))
                }
            }
        }.start()
    }

    private fun testUnifiConnection(ip: String, port: Int, token: String): Boolean {
        return try {
            val url = java.net.URL("https://$ip:$port/proxy/network/api/s/default/self")
            val connection = url.openConnection() as javax.net.ssl.HttpsURLConnection

            // Disable SSL verification for self-signed certificates
            val trustAllCerts = arrayOf<javax.net.ssl.TrustManager>(object : javax.net.ssl.X509TrustManager {
                override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
                override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
            })

            val sslContext = javax.net.ssl.SSLContext.getInstance("TLS")
            sslContext.init(null, trustAllCerts, java.security.SecureRandom())
            connection.sslSocketFactory = sslContext.socketFactory
            connection.hostnameVerifier = javax.net.ssl.HostnameVerifier { _, _ -> true }

            connection.setRequestProperty("X-API-KEY", token)
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.requestMethod = "GET"

            val responseCode = connection.responseCode
            connection.disconnect()

            responseCode == 200
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun showHelp() {
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.help_title)
            .setMessage(R.string.help_message)
            .setPositiveButton(R.string.ok, null)
            .show()
    }

    private fun showError(message: String) {
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.error)
            .setMessage(message)
            .setPositiveButton(R.string.ok, null)
            .show()
    }

    private fun startMainActivity() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
