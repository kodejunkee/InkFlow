package com.inkflow.reader

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform

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
}
