package com.inkflow.reader

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.content.Context

/**
 * React Native Native Module bridging JavaScript to Python via Chaquopy.
 *
 * Exposes novel searching, details fetching, chapter downloading,
 * and EPUB generation functions to the JS layer.
 */
class NovelSourceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NovelSource"

    /**
     * Initialize Python if not already started.
     */
    private fun ensurePython() {
        if (!Python.isStarted()) {
            Python.start(AndroidPlatform(reactApplicationContext))
        }
    }

    @ReactMethod
    fun showDownloadNotification(id: Int, title: String, progress: Int, total: Int, status: String) {
        val channelId = "novel_downloads"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Downloads", NotificationManager.IMPORTANCE_LOW)
            val manager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        val builder = NotificationCompat.Builder(reactApplicationContext, channelId)
            .setSmallIcon(reactApplicationContext.resources.getIdentifier("ic_launcher", "mipmap", reactApplicationContext.packageName))
            .setContentTitle(title)
            .setContentText(status)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)

        if (total > 0) {
            builder.setProgress(total, progress, false)
        } else {
            builder.setProgress(0, 0, true)
        }

        try {
            NotificationManagerCompat.from(reactApplicationContext).notify(id, builder.build())
        } catch (e: SecurityException) {
            // Missing POST_NOTIFICATIONS permission
        }
    }

    @ReactMethod
    fun cancelDownloadNotification(id: Int) {
        NotificationManagerCompat.from(reactApplicationContext).cancel(id)
    }

    /**
     * Search for novels on a given source.
     *
     * @param sourceId   Identifier for the novel source
     * @param query      Search query string
     * @param cookies    Cookie header string for authenticated requests
     * @param userAgent  User-Agent header string
     * @param promise    Resolves with a JSON string containing search results
     */
    @ReactMethod
    fun searchNovels(sourceId: String, query: String, cookies: String, userAgent: String, promise: Promise) {
        Thread {
            try {
                ensurePython()
                val py = Python.getInstance()
                val module = py.getModule("novel_scraper")
                val result = module.callAttr("search", sourceId, query, cookies, userAgent)
                promise.resolve(result.toString())
            } catch (e: Exception) {
                promise.reject("NOVEL_SEARCH_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Fetch detailed information for a specific novel.
     *
     * @param sourceId   Identifier for the novel source
     * @param url        URL of the novel page
     * @param cookies    Cookie header string for authenticated requests
     * @param userAgent  User-Agent header string
     * @param promise    Resolves with a JSON string containing novel details
     */
    @ReactMethod
    fun getNovelDetails(sourceId: String, url: String, cookies: String, userAgent: String, promise: Promise) {
        Thread {
            try {
                ensurePython()
                val py = Python.getInstance()
                val module = py.getModule("novel_scraper")
                val result = module.callAttr("get_novel_details", sourceId, url, cookies, userAgent)
                promise.resolve(result.toString())
            } catch (e: Exception) {
                promise.reject("NOVEL_DETAILS_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Download a batch of chapters for a novel.
     *
     * @param sourceId     Identifier for the novel source
     * @param chaptersJson JSON string describing the chapters to download
     * @param cookies      Cookie header string for authenticated requests
     * @param userAgent    User-Agent header string
     * @param outputDir    Directory to save downloaded chapter files
     * @param promise      Resolves with a JSON string containing download results
     */
    @ReactMethod
    fun downloadChapterBatch(sourceId: String, chaptersJson: String, cookies: String, userAgent: String, outputDir: String, promise: Promise) {
        Thread {
            try {
                ensurePython()
                val py = Python.getInstance()
                val module = py.getModule("novel_scraper")
                val result = module.callAttr("download_chapter_batch", sourceId, chaptersJson, cookies, userAgent, outputDir)
                promise.resolve(result.toString())
            } catch (e: Exception) {
                promise.reject("NOVEL_DOWNLOAD_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Generate an EPUB file from downloaded chapters.
     *
     * @param chaptersDir    Directory containing downloaded chapter files
     * @param metadataJson   JSON string with novel metadata (title, author, etc.)
     * @param coverImagePath Path to the cover image file
     * @param outputPath     Where to save the generated EPUB file
     * @param promise        Resolves with the output EPUB path
     */
    @ReactMethod
    fun generateNovelEpub(chaptersDir: String, metadataJson: String, coverImagePath: String, outputPath: String, promise: Promise) {
        Thread {
            try {
                ensurePython()
                val py = Python.getInstance()
                val module = py.getModule("novel_epub_generator")
                val result = module.callAttr("generate_epub", chaptersDir, metadataJson, coverImagePath, outputPath)
                promise.resolve(result.toString())
            } catch (e: Exception) {
                promise.reject("NOVEL_EPUB_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Update an existing EPUB file with new downloaded chapters.
     *
     * @param existingEpubPath Path to the current EPUB file
     * @param newChaptersDir   Directory containing the newly downloaded chapter files
     * @param outputEpubPath   Where to save the updated EPUB file
     * @param promise          Resolves with the output EPUB path
     */
    @ReactMethod
    fun updateNovelEpub(existingEpubPath: String, newChaptersDir: String, outputEpubPath: String, promise: Promise) {
        Thread {
            try {
                ensurePython()
                val py = Python.getInstance()
                val module = py.getModule("novel_epub_updater")
                val result = module.callAttr("update_epub", existingEpubPath, newChaptersDir, outputEpubPath)
                promise.resolve(result.toString())
            } catch (e: Exception) {
                promise.reject("NOVEL_EPUB_UPDATE_ERROR", e.message, e)
            }
        }.start()
    }
}
