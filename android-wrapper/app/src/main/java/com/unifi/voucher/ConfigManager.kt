package com.unifi.voucher

import android.content.Context
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import java.io.File

/**
 * Manages the options.json configuration file for the Node.js server.
 */
class ConfigManager(private val context: Context) {

    companion object {
        private const val OPTIONS_FILE = "options.json"
    }

    private val gson: Gson = GsonBuilder().setPrettyPrinting().create()

    /**
     * Configuration data class matching the server's expected format
     */
    data class Config(
        // UniFi Controller settings
        val unifi_ip: String = "",
        val unifi_port: Int = 443,
        val unifi_token: String = "",
        val unifi_site: String = "default",
        val unifi_ssid: String = "",
        val unifi_ssid_password: String = "",

        // Voucher settings
        val voucher_types: String = "480,1,,,;1440,1,,,;",
        val voucher_custom: Boolean = false,

        // Authentication (disabled for local app)
        val auth_disable: Boolean = true,

        // Services
        val service_web: Boolean = true,
        val service_api: Boolean = false,

        // Printing
        val printer_type: String = "pdf",

        // Logging
        val log_level: String = "info",

        // Branding
        val logo_path: String = "",
        val locale: String = "en-GB",

        // App-specific settings
        val auto_start: Boolean = false
    )

    /**
     * Get the path to the options.json file in the Node.js project directory
     */
    fun getOptionsFilePath(): String {
        return File(getNodeProjectDir(), OPTIONS_FILE).absolutePath
    }

    /**
     * Get the Node.js project directory
     */
    fun getNodeProjectDir(): File {
        return File(context.filesDir, "nodejs-project")
    }

    /**
     * Check if configuration exists
     */
    fun hasConfig(): Boolean {
        return File(getOptionsFilePath()).exists()
    }

    /**
     * Load configuration from file
     */
    fun loadConfig(): Config {
        val file = File(getOptionsFilePath())
        return if (file.exists()) {
            try {
                val json = file.readText()
                gson.fromJson(json, Config::class.java)
            } catch (e: Exception) {
                Config()
            }
        } else {
            Config()
        }
    }

    /**
     * Save configuration to file
     */
    fun saveConfig(config: Config): Boolean {
        return try {
            val file = File(getOptionsFilePath())
            file.parentFile?.mkdirs()
            file.writeText(gson.toJson(config))
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * Delete configuration file
     */
    fun deleteConfig(): Boolean {
        return try {
            File(getOptionsFilePath()).delete()
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Validate configuration
     */
    fun validateConfig(config: Config): ValidationResult {
        val errors = mutableListOf<String>()

        if (config.unifi_ip.isBlank()) {
            errors.add("UniFi Controller IP is required")
        }

        if (config.unifi_token.isBlank()) {
            errors.add("API Token is required")
        }

        if (config.unifi_ssid.isBlank()) {
            errors.add("WiFi SSID is required")
        }

        return ValidationResult(errors.isEmpty(), errors)
    }

    data class ValidationResult(
        val isValid: Boolean,
        val errors: List<String>
    )
}
