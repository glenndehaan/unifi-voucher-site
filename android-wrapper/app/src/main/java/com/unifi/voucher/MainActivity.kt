package com.unifi.voucher

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.unifi.voucher.databinding.ActivityMainBinding
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Main activity with WebView showing the Node.js server UI.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        const val TAG = "MainActivity"
        const val SERVER_URL = "http://${VoucherApplication.SERVER_HOST}:${VoucherApplication.SERVER_PORT}"
    }

    private lateinit var binding: ActivityMainBinding
    private var serverReadyReceiver: BroadcastReceiver? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)

        setupWebView()
        setupSwipeRefresh()
        startNodeService()
    }

    override fun onDestroy() {
        super.onDestroy()
        serverReadyReceiver?.let {
            unregisterReceiver(it)
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_settings -> {
                startActivity(Intent(this, SettingsActivity::class.java))
                true
            }
            R.id.action_refresh -> {
                binding.webView.reload()
                true
            }
            R.id.action_home -> {
                binding.webView.loadUrl(SERVER_URL)
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        binding.webView.apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                loadWithOverviewMode = true
                useWideViewPort = true
                builtInZoomControls = true
                displayZoomControls = false
                setSupportZoom(true)
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT

                // Enable modern web features
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    safeBrowsingEnabled = false
                }
            }

            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    binding.progressBar.visibility = View.VISIBLE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    binding.progressBar.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    if (request?.isForMainFrame == true) {
                        showError()
                    }
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val url = request?.url?.toString() ?: return false

                    // Handle external links
                    if (!url.startsWith(SERVER_URL)) {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    }

                    return false
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    super.onProgressChanged(view, newProgress)
                    binding.progressBar.progress = newProgress
                }
            }

            // Handle file downloads (PDFs)
            setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
                val request = android.app.DownloadManager.Request(Uri.parse(url))
                request.setMimeType(mimetype)
                request.addRequestHeader("User-Agent", userAgent)
                request.setDescription(getString(R.string.downloading))
                request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype))
                request.setNotificationVisibility(
                    android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                )
                request.setDestinationInExternalPublicDir(
                    android.os.Environment.DIRECTORY_DOWNLOADS,
                    URLUtil.guessFileName(url, contentDisposition, mimetype)
                )

                val dm = getSystemService(DOWNLOAD_SERVICE) as android.app.DownloadManager
                dm.enqueue(request)
                Toast.makeText(this@MainActivity, R.string.download_started, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.apply {
            setColorSchemeColors(
                ContextCompat.getColor(this@MainActivity, R.color.primary)
            )
            setOnRefreshListener {
                binding.webView.reload()
            }
        }
    }

    private fun startNodeService() {
        showLoading()

        // Register for server ready broadcast
        serverReadyReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                Log.i(TAG, "Server ready broadcast received")
                loadWebView()
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(
                serverReadyReceiver,
                IntentFilter("com.unifi.voucher.SERVER_READY"),
                Context.RECEIVER_NOT_EXPORTED
            )
        } else {
            registerReceiver(
                serverReadyReceiver,
                IntentFilter("com.unifi.voucher.SERVER_READY")
            )
        }

        // Start the Node.js service
        val serviceIntent = Intent(this, NodeService::class.java).apply {
            action = NodeService.ACTION_START
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }

        // If server is already running, load immediately
        if (NodeService.serverReady) {
            loadWebView()
        } else {
            // Poll for server ready as fallback
            lifecycleScope.launch {
                repeat(30) {
                    delay(1000)
                    if (NodeService.serverReady) {
                        loadWebView()
                        return@launch
                    }
                }
                // Timeout - show error
                showError()
            }
        }
    }

    private fun loadWebView() {
        runOnUiThread {
            binding.loadingLayout.visibility = View.GONE
            binding.webViewContainer.visibility = View.VISIBLE
            binding.webView.loadUrl(SERVER_URL)
        }
    }

    private fun showLoading() {
        binding.loadingLayout.visibility = View.VISIBLE
        binding.webViewContainer.visibility = View.GONE
        binding.errorLayout.visibility = View.GONE
    }

    private fun showError() {
        runOnUiThread {
            binding.loadingLayout.visibility = View.GONE
            binding.webViewContainer.visibility = View.GONE
            binding.errorLayout.visibility = View.VISIBLE

            binding.btnRetry.setOnClickListener {
                startNodeService()
            }
        }
    }
}
