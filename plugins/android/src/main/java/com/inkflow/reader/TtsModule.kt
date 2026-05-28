package com.inkflow.reader

import android.content.Intent
import android.os.Build
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale

/**
 * React Native native module exposing Android's built-in Text-to-Speech engine.
 *
 * Lazily initialises [TextToSpeech] on first use and emits utterance progress
 * events (`tts-start`, `tts-done`, `tts-error`) to the JavaScript layer.
 */
class TtsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    TextToSpeech.OnInitListener {

    companion object {
        private const val TAG = "InkFlowTts"
    }

    override fun getName(): String = "InkFlowTts"

    /** The platform TTS instance — created lazily via [ensureTts]. */
    private var tts: TextToSpeech? = null

    /** Tracks whether the engine reported successful initialisation. */
    @Volatile
    private var ttsInitialised = false

    /** Tracks the currently selected voice ID to enforce it on utterances. */
    @Volatile
    private var currentVoiceId: String? = null

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    /**
     * Lazily create and initialise the [TextToSpeech] engine if it has not
     * been created yet.
     */
    private fun ensureTts() {
        if (tts == null) {
            tts = TextToSpeech(reactApplicationContext, this)
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            ttsInitialised = true
            tts?.setOnUtteranceProgressListener(utteranceListener)
            Log.d(TAG, "TTS engine initialised successfully")
        } else {
            ttsInitialised = false
            Log.e(TAG, "TTS engine initialisation failed with status: $status")

            // Prompt the user to install TTS data if nothing is available.
            try {
                val installIntent = Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(installIntent)
            } catch (e: Exception) {
                Log.e(TAG, "Could not launch TTS data installer", e)
            }
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        tts?.stop()
        tts?.shutdown()
        tts = null
        ttsInitialised = false
        Log.d(TAG, "TTS engine shut down")
    }

    // -----------------------------------------------------------------------
    // Event helpers
    // -----------------------------------------------------------------------

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private val utteranceListener = object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String?) {
            val params = Arguments.createMap().apply {
                putString("utteranceId", utteranceId)
            }
            sendEvent("tts-start", params)
        }

        override fun onDone(utteranceId: String?) {
            val params = Arguments.createMap().apply {
                putString("utteranceId", utteranceId)
            }
            sendEvent("tts-done", params)
        }

        @Deprecated("Deprecated in API 21+, kept for backward compat")
        override fun onError(utteranceId: String?) {
            val params = Arguments.createMap().apply {
                putString("utteranceId", utteranceId)
                putString("error", "Unknown TTS error")
            }
            sendEvent("tts-error", params)
        }

        override fun onError(utteranceId: String?, errorCode: Int) {
            val params = Arguments.createMap().apply {
                putString("utteranceId", utteranceId)
                putString("error", "TTS error code: $errorCode")
            }
            sendEvent("tts-error", params)
        }
    }

    // -----------------------------------------------------------------------
    // @ReactMethod — exposed to JavaScript
    // -----------------------------------------------------------------------

    /**
     * Speak [text] immediately, flushing any queued utterances.
     */
    @ReactMethod
    fun speak(text: String, utteranceId: String) {
        ensureTts()
        val engine = tts ?: return
        if (!ttsInitialised) {
            val params = Arguments.createMap().apply {
                putString("utteranceId", utteranceId)
                putString("error", "TTS engine not initialised")
            }
            sendEvent("tts-error", params)
            return
        }
        var bundle: android.os.Bundle? = null
        if (currentVoiceId != null) {
            bundle = android.os.Bundle()
            bundle.putString(TextToSpeech.Engine.KEY_PARAM_VOICE_NAME, currentVoiceId)
        }
        engine.speak(text, TextToSpeech.QUEUE_FLUSH, bundle, utteranceId)
    }

    /**
     * Add [text] to the TTS queue to be spoken after the current speech finishes.
     */
    @ReactMethod
    fun queue(text: String, utteranceId: String) {
        ensureTts()
        val engine = tts ?: return
        if (!ttsInitialised) {
            val params = Arguments.createMap().apply {
                putString("utteranceId", utteranceId)
                putString("error", "TTS engine not initialised")
            }
            sendEvent("tts-error", params)
            return
        }
        var bundle: android.os.Bundle? = null
        if (currentVoiceId != null) {
            bundle = android.os.Bundle()
            bundle.putString(TextToSpeech.Engine.KEY_PARAM_VOICE_NAME, currentVoiceId)
        }
        engine.speak(text, TextToSpeech.QUEUE_ADD, bundle, utteranceId)
    }

    /**
     * Stop all current and queued speech immediately.
     */
    @ReactMethod
    fun stop() {
        tts?.stop()
    }

    /**
     * Simulate pause by stopping speech.
     * Android TTS has no native pause/resume — the JS layer must track the
     * remaining text and re-call [speak] to resume from the correct position.
     */
    @ReactMethod
    fun pause() {
        tts?.stop()
    }

    /**
     * Set the speech rate. `1.0` is normal speed.
     */
    @ReactMethod
    fun setRate(rate: Float, promise: Promise) {
        ensureTts()
        val engine = tts
        if (engine == null || !ttsInitialised) {
            promise.reject("TTS_NOT_READY", "TTS engine is not initialised")
            return
        }
        val result = engine.setSpeechRate(rate)
        if (result == TextToSpeech.SUCCESS) {
            promise.resolve(null)
        } else {
            promise.reject("TTS_SET_RATE_ERROR", "Failed to set speech rate")
        }
    }

    /**
     * Set the speech pitch. `1.0` is normal pitch.
     */
    @ReactMethod
    fun setPitch(pitch: Float, promise: Promise) {
        ensureTts()
        val engine = tts
        if (engine == null || !ttsInitialised) {
            promise.reject("TTS_NOT_READY", "TTS engine is not initialised")
            return
        }
        val result = engine.setPitch(pitch)
        if (result == TextToSpeech.SUCCESS) {
            promise.resolve(null)
        } else {
            promise.reject("TTS_SET_PITCH_ERROR", "Failed to set pitch")
        }
    }

    /**
     * Return a list of available voices as an array of maps with keys:
     * `id`, `name`, `locale`, `isNetworkRequired`.
     *
     * Runs voice enumeration on a background thread to avoid blocking the UI.
     */
    @ReactMethod
    fun getAvailableVoices(promise: Promise) {
        ensureTts()
        Thread {
            try {
                val engine = tts
                if (engine == null || !ttsInitialised) {
                    promise.reject("TTS_NOT_READY", "TTS engine is not initialised")
                    return@Thread
                }

                val voices: Set<Voice>? = engine.voices
                if (voices == null) {
                    promise.resolve(Arguments.createArray())
                    return@Thread
                }

                val result = Arguments.createArray()
                for (voice in voices) {
                    val map = Arguments.createMap().apply {
                        putString("id", voice.name)
                        putString("name", voice.name)
                        putString("locale", voice.locale.toLanguageTag())
                        putBoolean("isNetworkRequired", voice.isNetworkConnectionRequired)
                    }
                    result.pushMap(map)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("TTS_VOICES_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Select a voice by its identifier string.
     */
    @ReactMethod
    fun setVoice(voiceId: String, promise: Promise) {
        ensureTts()
        Thread {
            try {
                val engine = tts
                if (engine == null || !ttsInitialised) {
                    promise.reject("TTS_NOT_READY", "TTS engine is not initialised")
                    return@Thread
                }

                val voices: Set<Voice>? = engine.voices
                val target = voices?.firstOrNull { it.name == voiceId }
                if (target == null) {
                    promise.reject("TTS_VOICE_NOT_FOUND", "Voice '$voiceId' not found")
                    return@Thread
                }

                val result = engine.setVoice(target)
                if (result == TextToSpeech.SUCCESS) {
                    currentVoiceId = target.name
                    promise.resolve(null)
                } else {
                    promise.reject("TTS_SET_VOICE_ERROR", "Failed to set voice to '$voiceId'")
                }
            } catch (e: Exception) {
                promise.reject("TTS_SET_VOICE_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Check whether the TTS engine has been initialised and is ready to speak.
     */
    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(ttsInitialised)
    }

    /**
     * Required for NativeEventEmitter to work without warnings.
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }

    /**
     * Required for NativeEventEmitter to work without warnings.
     */
    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }
}
