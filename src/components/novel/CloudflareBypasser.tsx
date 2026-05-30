import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  
  const latestCookies = useRef<string>('');
  const latestUserAgent = useRef<string>(DEFAULT_USER_AGENT);

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
        if (data.type === 'cookies') {
          latestCookies.current = data.cookies || '';
          latestUserAgent.current = data.userAgent || DEFAULT_USER_AGENT;
          
          // Still auto-close if we specifically see cf_clearance
          if (data.cookies && data.cookies.includes('cf_clearance')) {
            onCookiesReady(data.cookies, data.userAgent);
          }
        }
      } catch {
        // Ignore
      }
    },
    [onCookiesReady],
  );

  const handleDone = useCallback(() => {
    onCookiesReady(latestCookies.current, latestUserAgent.current);
  }, [onCookiesReady]);

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
            <Text style={[textStyles.body, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[textStyles.body, { color: theme.textPrimary, flex: 1, textAlign: 'center', fontWeight: '600' }]} numberOfLines={1}>
            Verification
          </Text>
          <Pressable onPress={handleDone} style={styles.doneBtn}>
            <Text style={[textStyles.body, { color: theme.primary, fontWeight: 'bold' }]}>Done</Text>
          </Pressable>
        </View>
        
        {/* Instruction Banner */}
        <View style={{ backgroundColor: theme.primary + '15', paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="information-circle" size={20} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[textStyles.caption, { color: theme.primary, flex: 1 }]}>
            Solve any captchas. Once the site fully loads, tap "Done" to continue.
          </Text>
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
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  closeBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  doneBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as any),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
