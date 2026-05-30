/**
 * InkFlow Browse Screen
 *
 * Search for novels from online sources (AllNovel.org).
 * Uses a hidden WebView to bypass Cloudflare, then searches via Python scraper.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Keyboard,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getTheme } from '../../src/theme/themes';
import { textStyles } from '../../src/theme/typography';
import { useCookieStore, DEFAULT_USER_AGENT } from '../../src/stores/cookieStore';
import { useNovelStore } from '../../src/stores/novelStore';
import { searchNovels } from '../../src/services/novel/NovelSourceService';
import { getEnabledSources, getSource } from '../../src/services/novel/ExtensionManager';
import NovelCard from '../../src/components/novel/NovelCard';
import HorizontalNovelCard from '../../src/components/novel/HorizontalNovelCard';
import CloudflareBypasser from '../../src/components/novel/CloudflareBypasser';
import type { NovelSearchResult, NovelSource } from '../../src/types/novel';

// ─── Inner Screen ───────────────────────────────────────

export default function BrowseScreen() {
  const router = useRouter();
  const theme = getTheme(useSettingsStore((s) => s.theme));
  
  const getCookies = useCookieStore((s) => s.getCookies);
  const setCookies = useCookieStore((s) => s.setCookies);

  const searchResults = useNovelStore((s) => s.searchResults);
  const searchQuery = useNovelStore((s) => s.searchQuery);
  const setSearchQuery = useNovelStore((s) => s.setSearchQuery);
  const setSearchResults = useNovelStore((s) => s.setSearchResults);

  const [isSearching, setSearching] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sourceErrors, setSourceErrors] = useState<Record<string, boolean>>({});
  const [bypassingSource, setBypassingSource] = useState<NovelSource | null>(null);
  
  const inputRef = useRef<TextInput>(null);

  // Group results by source
  const groupedResults = useMemo(() => {
    if (!searchQuery && searchResults.length === 0) return [];
    const sources = getEnabledSources();
    return sources.map((source) => ({
      source,
      results: searchResults.filter((r) => r.sourceId === source.id),
    }));
  }, [searchResults, searchQuery]);

  const handleSearch = useCallback(async () => {
    const query = localQuery.trim();
    if (!query) return;

    Keyboard.dismiss();
    setSearchQuery(query);
    setSearching(true);
    setSearchError(null);
    setSourceErrors({});

    try {
      const sources = getEnabledSources();
      if (sources.length === 0) {
        throw new Error('No enabled sources');
      }

      // Search all enabled sources in parallel
      const searchPromises = sources.map((source) => {
        const cookieData = getCookies(source.baseUrl);
        const cookies = cookieData?.cookies || '';
        const userAgent = cookieData?.userAgent || DEFAULT_USER_AGENT;
        
        return searchNovels(source.id, query, cookies, userAgent).catch((e) => {
          console.log(`[Browse] Search failed for source ${source.id} (likely Cloudflare):`, e);
          setSourceErrors((prev) => ({ ...prev, [source.id]: true }));
          return []; // Return empty array on failure for a specific source
        });
      });
      
      const resultsArray = await Promise.all(searchPromises);
      const results = resultsArray.flat();
      setSearchResults(results);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Browse] Search failed:', msg);
      setSearchError(msg);
      setSearchResults([]);
      Alert.alert('Search Error', msg);
    } finally {
      setSearching(false);
    }
  }, [localQuery, getCookies, setSearchQuery, setSearching, setSearchResults]);

  const handleNovelPress = useCallback(
    (result: NovelSearchResult) => {
      router.push(`/novel/${encodeURIComponent(result.sourceUrl)}` as any);
    },
    [router],
  );

  const renderSourceGroup = useCallback(
    ({ item }: { item: { source: NovelSource; results: NovelSearchResult[] } }) => (
      <View style={{ marginBottom: 24 }}>
        <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={[textStyles.heading, { color: theme.textPrimary, fontSize: 18 }]}>
            {item.source.name}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </Pressable>
        {item.results.length > 0 ? (
          <FlatList
            data={item.results}
            renderItem={({ item: novel }) => (
              <HorizontalNovelCard
                title={novel.title}
                coverUrl={novel.coverUrl}
                onPress={() => handleNovelPress(novel)}
              />
            )}
            keyExtractor={(novel, idx) => `${novel.sourceUrl}-${idx}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        ) : sourceErrors[item.source.id] ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Pressable
              onPress={() => setBypassingSource(item.source)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
                borderWidth: StyleSheet.hairlineWidth,
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[textStyles.caption, { color: theme.primary, fontWeight: '600' }]}>
                Solve Captcha
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, opacity: 0.5 }}>
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>No results found.</Text>
          </View>
        )}
      </View>
    ),
    [handleNovelPress, theme, sourceErrors]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[textStyles.heading, { color: theme.textPrimary, fontSize: 28 }]}>
          Browse
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.textTertiary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            ref={inputRef}
            style={[
              styles.searchInput,
              { color: theme.textPrimary },
            ]}
            placeholder="Search novels…"
            placeholderTextColor={theme.textTertiary}
            value={localQuery}
            onChangeText={setLocalQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            editable={true}
          />
          {localQuery.length > 0 && (
            <Pressable onPress={() => setLocalQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {isSearching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[textStyles.caption, { color: theme.textSecondary, marginTop: 12 }]}>
            Searching…
          </Text>
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={groupedResults}
          renderItem={renderSourceGroup}
          keyExtractor={(item) => item.source.id}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      ) : searchQuery ? (
        <View style={styles.centered}>
          <Ionicons
            name={searchError ? 'alert-circle-outline' : 'search-outline'}
            size={48}
            color={searchError ? '#EF5350' : theme.textTertiary}
          />
          <Text style={[textStyles.body, { color: theme.textSecondary, marginTop: 12 }]}>
            {searchError ? 'Search failed' : 'No results found'}
          </Text>
          <Text
            style={[
              textStyles.caption,
              { color: theme.textTertiary, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
            ]}
          >
            {searchError || 'Try a different search term'}
          </Text>
          {searchError && (
            <Pressable
              onPress={handleSearch}
              style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.primary }}
            >
              <Text style={[textStyles.caption, { color: '#fff', fontWeight: '600' }]}>
                Retry
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="compass-outline" size={56} color={theme.textTertiary} />
          <Text style={[textStyles.body, { color: theme.textSecondary, marginTop: 16 }]}>
            Search for your next adventure
          </Text>
          <Text
            style={[
              textStyles.caption,
              { color: theme.textTertiary, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
            ]}
          >
            Find thousands of web novels to read offline
          </Text>
        </View>
      )}
      
      {/* Cloudflare Bypasser Modal */}
      {bypassingSource && (
        <CloudflareBypasser
          url={bypassingSource.baseUrl}
          visible={!!bypassingSource}
          onClose={() => setBypassingSource(null)}
          onCookiesReady={(cookies, userAgent) => {
            setCookies(bypassingSource.baseUrl, cookies, userAgent);
            setBypassingSource(null);
            handleSearch(); // Automatically re-search!
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
