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
 * Exposes EPUB processing and quote generation functions to the JS layer.
 */
class EpubProcessorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "EpubProcessor"

    /**
     * Initialize Python if not already started.
     */
    private fun ensurePython() {
        if (!Python.isStarted()) {
            Python.start(AndroidPlatform(reactApplicationContext))
        }
    }

    /**
     * Process an EPUB file: extract metadata, cover, chapters, and normalize.
     *
     * @param filePath Absolute path to the EPUB file
     * @param promise  Resolves with a JSON string containing processing results
     */
    @ReactMethod
    fun processEpub(filePath: String, promise: Promise) {
        Thread {
            try {
                ensurePython()
                val py = Python.getInstance()
                val module = py.getModule("epub_processor")
                val result = module.callAttr("process_epub", filePath)
                promise.resolve(result.toString())
            } catch (e: Exception) {
                promise.reject("EPUB_PROCESS_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Lightweight metadata-only scan for quick library browsing.
     *
     * @param filePath Absolute path to the EPUB file
     * @param promise  Resolves with a JSON string containing basic metadata
     */
    @ReactMethod
    fun getEpubInfo(filePath: String, promise: Promise) {
        Thread {
            try {
                ensurePython()
                val py = Python.getInstance()
                val module = py.getModule("epub_processor")
                val result = module.callAttr("get_epub_info", filePath)
                promise.resolve(result.toString())
            } catch (e: Exception) {
                promise.reject("EPUB_INFO_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Generate a premium quote card image.
     *
     * @param coverPath    Path to the book cover image
     * @param quoteText    The highlighted text to display
     * @param author       Book author
     * @param title        Book title
     * @param chapterTitle Chapter name
     * @param outputPath   Where to save the generated image
     * @param promise      Resolves with the output image path, or null on failure
     */
    @ReactMethod
    fun generateQuoteCard(
        coverPath: String,
        quoteText: String,
        author: String,
        title: String,
        chapterTitle: String,
        outputPath: String,
        promise: Promise
    ) {
        Thread {
            try {
                ensurePython()
                val py = Python.getInstance()
                val module = py.getModule("quote_generator")
                val result = module.callAttr(
                    "generate_quote_card",
                    coverPath, quoteText, author, title, chapterTitle, outputPath
                )
                val resultStr = result?.toString()
                if (resultStr != null && resultStr != "None") {
                    promise.resolve(resultStr)
                } else {
                    promise.reject("QUOTE_ERROR", "Quote card generation returned null")
                }
            } catch (e: Exception) {
                promise.reject("QUOTE_ERROR", e.message, e)
            }
        }.start()
    }
}
