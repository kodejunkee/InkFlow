/**
 * ReaderWebView — epub.js WebView wrapper
 *
 * Manages the WebView lifecycle, bridge communication, and location persistence.
 *
 * The HTML is written to a temporary file so the WebView loads from a file:// URL.
 * This gives the WebView proper file:// origin, allowing epub.js to fetch
 * EPUB files from the local filesystem via XMLHttpRequest.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as LegacyFS from 'expo-file-system/legacy';
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

    // Reader HTML file URI — null until written
    const [htmlFileUri, setHtmlFileUri] = useState<string | null>(null);

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

    // ─── Write HTML to a temp file so WebView gets file:// origin ────

    useEffect(() => {
      let cancelled = false;
      const filePath = (LegacyFS.cacheDirectory ?? '') + 'inkflow_reader.html';

      LegacyFS.writeAsStringAsync(filePath, readerHtml)
        .then(() => {
          if (!cancelled) {
            setHtmlFileUri(filePath);
          }
        })
        .catch((err) => {
          console.error('[ReaderWebView] Failed to write reader HTML:', err);
        });

      return () => {
        cancelled = true;
      };
    }, []); // Only write once on mount — theme changes go via sendCommand

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
            // Page loaded — send the book load command
            if (!hasLoadedBook.current) {
              hasLoadedBook.current = true;
              sendCommand({
                type: 'loadBook',
                uri: book.filePath,
                initialCfi: book.lastLocation ?? undefined,
              });
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

    // Show a minimal loading state while the HTML file is being written
    if (!htmlFileUri) {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color={theme.reader.link} />
        </View>
      );
    }

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
          source={{ uri: htmlFileUri }}
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
