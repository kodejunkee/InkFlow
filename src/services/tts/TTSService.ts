/**
 * TTSService — TypeScript wrapper around the InkFlowTts native module.
 *
 * Provides a clean API for text-to-speech operations using Android's
 * native TextToSpeech engine. Does not manage sentence queuing —
 * that is handled by the useTTS hook.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TtsVoice {
  id: string;
  name: string;
  locale: string;
  isNetworkRequired: boolean;
}

export type TtsEventType = 'tts-start' | 'tts-done' | 'tts-error';

export interface TtsEvent {
  utteranceId: string;
  error?: string;
}

type TtsListener = (event: TtsEvent) => void;

// ─── Native Module ───────────────────────────────────────────────────────────

const { InkFlowTts } = NativeModules;

// Event emitter for native TTS events
let emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter {
  if (!emitter) {
    emitter = new NativeEventEmitter(InkFlowTts);
  }
  return emitter;
}

// ─── Service API ─────────────────────────────────────────────────────────────

export const hasNativeQueue = !!InkFlowTts?.queue;

/**
 * Speak a single piece of text. Uses QUEUE_FLUSH so any in-progress
 * speech is immediately replaced.
 */
export function speak(text: string, utteranceId: string): void {
  if (!InkFlowTts) {
    console.warn('[TTSService] Native TTS module not available');
    return;
  }
  InkFlowTts.speak(text, utteranceId);
}

/** Queue a piece of text to play after the current one finishes. */
export function queue(text: string, utteranceId: string): void {
  if (!InkFlowTts) return;
  if (InkFlowTts.queue) {
    InkFlowTts.queue(text, utteranceId);
  } else {
    // Fallback if native app not rebuilt yet
    console.warn('[TTSService] Native queue() method not found. Rebuild required.');
  }
}

/** Stop all speech immediately. */
export function stop(): void {
  if (!InkFlowTts) return;
  InkFlowTts.stop();
}

/** Pause speech (simulated via stop on Android). */
export function pause(): void {
  if (!InkFlowTts) return;
  InkFlowTts.pause();
}

/** Set speech rate (1.0 = normal speed). */
export async function setRate(rate: number): Promise<void> {
  if (!InkFlowTts) return;
  await InkFlowTts.setRate(rate);
}

/** Set speech pitch (1.0 = normal pitch). */
export async function setPitch(pitch: number): Promise<void> {
  if (!InkFlowTts) return;
  await InkFlowTts.setPitch(pitch);
}

/** Get all voices available on the device. */
export async function getAvailableVoices(): Promise<TtsVoice[]> {
  if (!InkFlowTts) return [];
  try {
    const voices = await InkFlowTts.getAvailableVoices();
    return voices as TtsVoice[];
  } catch (e) {
    console.error('[TTSService] Failed to get voices:', e);
    return [];
  }
}

/** Set the active voice by ID. */
export async function setVoice(voiceId: string): Promise<void> {
  if (!InkFlowTts) return;
  await InkFlowTts.setVoice(voiceId);
}

/** Check if the TTS engine is initialized and ready. */
export async function isAvailable(): Promise<boolean> {
  if (!InkFlowTts) return false;
  try {
    return await InkFlowTts.isAvailable();
  } catch {
    return false;
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

/** Subscribe to a TTS event. Returns an unsubscribe function. */
export function addEventListener(
  event: TtsEventType,
  listener: TtsListener,
): () => void {
  const subscription = getEmitter().addListener(event, listener);
  return () => subscription.remove();
}

/** Subscribe to utterance completion. */
export function onDone(listener: TtsListener): () => void {
  return addEventListener('tts-done', listener);
}

/** Subscribe to utterance start. */
export function onStart(listener: TtsListener): () => void {
  return addEventListener('tts-start', listener);
}

/** Subscribe to utterance error. */
export function onError(listener: TtsListener): () => void {
  return addEventListener('tts-error', listener);
}
