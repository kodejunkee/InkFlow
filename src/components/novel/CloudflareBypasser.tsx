import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Modal, SafeAreaView, Pressable, Text, ActivityIndicator } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { DEFAULT_USER_AGENT } from '../../stores/cookieStore';

interface Props {
  url: string;
  visible: boolean;
  onCookiesReady: (cookies: string, userAgent: string) => void;
  onClose: () => void;
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

export default function CloudflareBypasser({ url, visible, onCookiesReady, onClose }: Props) {
  const webViewRef = useRef<WebView>(null);
  const theme = getTheme(useSettingsStore((s) => s.theme));
  const [loading, setLoading] = useState(true);

  // When url changes, reset loading
  useEffect(() => {
    if (visible) {
      setLoading(true);
    }
  }, [url, visible]);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    webViewRef.current?.injectJavaScript(COOKIE_EXTRACT_JS);
  }, []);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'cookies' && data.cookies) {
          // If we got cf_clearance, we solved it!
          if (data.cookies.includes('cf_clearance')) {
            onCookiesReady(data.cookies, data.userAgent);
          }
        }
      } catch {
        // Ignore
      }
    },
    [onCookiesReady],
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (navState.loading === false) {
        setLoading(false);
        webViewRef.current?.injectJavaScript(COOKIE_EXTRACT_JS);
      } else {
        setLoading(true);
      }
    },
    [],
  );

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={[textStyles.body, { color: theme.textPrimary, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
            Cloudflare Verification
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.webviewContainer}>
          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[textStyles.caption, { color: theme.textSecondary, marginTop: 12 }]}>
                Loading verification page...
              </Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.webview}
            onLoadEnd={handleLoadEnd}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            userAgent={DEFAULT_USER_AGENT}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
