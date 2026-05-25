/**
 * ReaderWebView — epub.js WebView wrapper
 *
 * Manages the WebView lifecycle, bridge communication, and location persistence.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { File } from 'expo-file-system';
import type { Book } from '../../types/book';
import type { WebViewMessage, ReaderCommand } from '../../types/bridge';
import { serializeCommand, parseWebViewMessage } from '../../types/bridge';
import { generateReaderHtml } from '../../reader/readerHtml';
import { useSettingsStore } from '../../stores/settingsStore';
import { useReaderStore } from '../../stores/readerStore';
import { getTheme } from '../../theme/themes';

interface ReaderWebViewProps {
  book: Book;
  onReady?: () => void;
  onLocationChanged?: (cfi: string, progress: number, chapterIndex: number, chapterTitle: string) => void;
  onTocLoaded?: (toc: any[]) => void;
  onTextSelected?: (cfiRange: string, selectedText: string, chapterTitle: string, rect: any) => void;
  onTap?: (x: number, y: number) => void;
  onError?: (message: string) => void;
}

export const ReaderWebView = React.forwardRef<WebView, ReaderWebViewProps>(
  function ReaderWebView(
    {
      book,
      onReady,
      onLocationChanged,
      onTocLoaded,
      onTextSelected,
      onTap,
      onError,
    },
    ref,
  ) {
    const webViewRef = useRef<WebView | null>(null);
    const hasLoadedBook = useRef(false);

    const themeName = useSettingsStore((s) => s.theme);
    const fontSize = useSettingsStore((s) => s.fontSize);
    const lineHeight = useSettingsStore((s) => s.lineHeight);
    const margins = useSettingsStore((s) => s.margins);
    const theme = getTheme(themeName);

    // Generate HTML with current settings
    const readerHtml = generateReaderHtml({
      fontSize,
      lineHeight,
      margins,
      theme: {
        background: theme.reader.background,
        text: theme.reader.text,
        link: theme.reader.link,
        selectionBg: theme.reader.selectionBackground,
      },
    });

    // ─── Send command to WebView ─────────────────────────────────────

    const sendCommand = useCallback(
      (command: ReaderCommand) => {
        const wv = webViewRef.current;
        if (wv) {
          wv.injectJavaScript(serializeCommand(command));
        }
      },
      [],
    );

    // ─── Load book data as base64 ────────────────────────────────────

    const loadBookData = useCallback(async () => {
      const wv = webViewRef.current;
      if (!wv) return;

      try {
        const epubFile = new File(book.filePath);
        const base64 = epubFile.base64();

        // Send base64 data to WebView — epub.js will decode and open it
        const initialCfi = book.lastLocation ?? '';
        wv.injectJavaScript(`
          (function() {
            try {
              var base64 = "${base64}";
              var raw = atob(base64);
              var bytes = new Uint8Array(raw.length);
              for (var i = 0; i < raw.length; i++) {
                bytes[i] = raw.charCodeAt(i);
              }
              window._epubData = bytes.buffer;
              window.handleReaderCommand({
                type: 'loadBook',
                uri: '__ARRAYBUFFER__',
                initialCfi: '${initialCfi}'
              });
            } catch (e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'Base64 decode failed: ' + e.message
              }));
            }
          })();
        `);
      } catch (e) {
        console.error('[ReaderWebView] Failed to read EPUB file:', e);
        onError?.('Failed to read EPUB file');
      }
    }, [book, onError]);

    // Expose ref for parent components
    React.useImperativeHandle(ref, () => {
      const wv = webViewRef.current;
      return wv as WebView;
    });

    // ─── Handle messages from WebView ────────────────────────────────

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        const message = parseWebViewMessage(event.nativeEvent.data);
        if (!message) return;

        switch (message.type) {
          case 'ready':
            onReady?.();
            break;

          case 'contentLoaded':
            // Page loaded — read the EPUB as base64 and send to WebView
            if (!hasLoadedBook.current) {
              hasLoadedBook.current = true;
              loadBookData();
            }
            break;

          case 'locationChanged':
            onLocationChanged?.(
              message.cfi,
              message.progress,
              message.chapterIndex,
              message.chapterTitle,
            );
            break;

          case 'tocLoaded':
            onTocLoaded?.(message.toc);
            break;

          case 'textSelected':
            onTextSelected?.(
              message.cfiRange,
              message.selectedText,
              message.chapterTitle,
              message.rect,
            );
            break;

          case 'tap':
            onTap?.(message.x, message.y);
            break;

          case 'error':
            console.error('[ReaderWebView] Error:', message.message);
            onError?.(message.message);
            break;
        }
      },
      [book, sendCommand, onReady, onLocationChanged, onTocLoaded, onTextSelected, onTap, onError],
    );

    // ─── Apply theme changes ─────────────────────────────────────────

    useEffect(() => {
      if (hasLoadedBook.current) {
        sendCommand({
          type: 'applyTheme',
          theme: themeName,
          fontSize,
          lineHeight,
          margins,
        });
      }
    }, [themeName, fontSize, lineHeight, margins, sendCommand]);

    // ─── Expose sendCommand for parent use ───────────────────────────

    // Attach sendCommand to the component instance via a data attribute
    (ReaderWebView as any).sendCommand = sendCommand;

    return (
      <View style={styles.container}>
        <WebView
          ref={(wv) => {
            webViewRef.current = wv;
            if (typeof ref === 'function') {
              ref(wv);
            } else if (ref) {
              (ref as React.MutableRefObject<WebView | null>).current = wv;
            }
          }}
          source={{ html: readerHtml, baseUrl: '' }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          mixedContentMode="always"
          onMessage={handleMessage}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          cacheEnabled={false}
          setSupportMultipleWindows={false}
          textZoom={100}
        />
      </View>
    );
  },
);

export default ReaderWebView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
