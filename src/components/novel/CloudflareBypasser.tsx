/**
 * CloudflareBypasser — Hidden WebView that silently solves Cloudflare challenges.
 *
 * Renders an invisible WebView that loads the source URL. Once the page loads
 * (Cloudflare challenge solved), it extracts the cookies and user-agent string.
 */

import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

interface Props {
  url: string;
  onCookiesReady: (cookies: string, userAgent: string) => void;
  onError: (error: string) => void;
}

const COOKIE_EXTRACT_JS = `
  (function() {
    var cookies = document.cookie || '';
    var ua = navigator.userAgent || '';
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'cookies',
      cookies: cookies,
      userAgent: ua
    }));
  })();
  true;
`;

export default function CloudflareBypasser({ url, onCookiesReady, onError }: Props) {
  const webViewRef = useRef<WebView>(null);
  const hasExtracted = useRef(false);

  const handleLoadEnd = useCallback(() => {
    // Inject JS to extract cookies after page loads
    if (webViewRef.current && !hasExtracted.current) {
      webViewRef.current.injectJavaScript(COOKIE_EXTRACT_JS);
    }
  }, []);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'cookies' && data.cookies) {
          hasExtracted.current = true;
          onCookiesReady(data.cookies, data.userAgent);
        }
      } catch {
        // Ignore parse errors from other WebView messages
      }
    },
    [onCookiesReady],
  );

  const handleError = useCallback(
    (syntheticEvent: { nativeEvent: { description: string } }) => {
      onError(syntheticEvent.nativeEvent.description || 'WebView error');
    },
    [onError],
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      // If the page finished loading and we haven't extracted yet, try again
      if (navState.loading === false && !hasExtracted.current) {
        webViewRef.current?.injectJavaScript(COOKIE_EXTRACT_JS);
      }
    },
    [],
  );

  return (
    <View style={styles.container} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        onError={handleError}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        // Use a common mobile Chrome user agent
        userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 0,
    height: 0,
    overflow: 'hidden',
    position: 'absolute',
    opacity: 0,
  },
  webview: {
    width: 1,
    height: 1,
  },
});
