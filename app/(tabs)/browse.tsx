/**
 * InkFlow Browse Screen
 *
 * Search for novels from online sources (AllNovel.org).
 * Uses a hidden WebView to bypass Cloudflare, then searches via Python scraper.
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getTheme } from '../../src/theme/themes';
import { textStyles } from '../../src/theme/typography';
import { CookieProvider, useCookies } from '../../src/contexts/CookieContext';
import { useNovelStore } from '../../src/stores/novelStore';
import { searchNovels } from '../../src/services/novel/NovelSourceService';
import { getEnabledSources } from '../../src/services/novel/ExtensionManager';
import NovelCard from '../../src/components/novel/NovelCard';
import type { NovelSearchResult } from '../../src/types/novel';

// ─── Inner Screen (uses CookieContext) ───────────────────────────────────────

function BrowseScreen() {
  const router = useRouter();
  const theme = getTheme(useSettingsStore((s) => s.theme));
  const { cookies, userAgent, status: cookieStatus, refreshCookies } = useCookies();

  const searchResults = useNovelStore((s) => s.searchResults);
  const isSearching = useNovelStore((s) => s.isSearching);
  const searchQuery = useNovelStore((s) => s.searchQuery);
  const setSearchResults = useNovelStore((s) => s.setSearchResults);
  const setSearching = useNovelStore((s) => s.setSearching);
  const setSearchQuery = useNovelStore((s) => s.setSearchQuery);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = useCallback(async () => {
    const query = localQuery.trim();
    if (!query) return;

    Keyboard.dismiss();
    setSearchQuery(query);
    setSearching(true);

    try {
      const sources = getEnabledSources();
      if (sources.length === 0) {
        throw new Error('No enabled sources');
      }

      const results = await searchNovels(
        sources[0].id,
        query,
        cookies,
        userAgent,
      );
      setSearchResults(results);
    } catch (e) {
      console.error('[Browse] Search failed:', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [localQuery, cookies, userAgent, setSearchQuery, setSearching, setSearchResults]);

  const handleNovelPress = useCallback(
    (result: NovelSearchResult) => {
      router.push(`/novel/${encodeURIComponent(result.sourceUrl)}` as any);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: NovelSearchResult }) => (
      <NovelCard
        title={item.title}
        author={item.author}
        coverUrl={item.coverUrl}
        status={item.status}
        latestChapter={item.latestChapter}
        onPress={() => handleNovelPress(item)}
      />
    ),
    [handleNovelPress],
  );

  // ── Connection status indicator ────────────────────────────────────
  const renderConnectionBadge = () => {
    let color = theme.textTertiary;
    let label = 'Connecting…';
    let icon: 'cloud-outline' | 'cloud-done-outline' | 'cloud-offline-outline' = 'cloud-outline';

    if (cookieStatus === 'ready') {
      color = '#4CAF50';
      label = 'Connected';
      icon = 'cloud-done-outline';
    } else if (cookieStatus === 'error') {
      color = '#EF5350';
      label = 'Connection failed';
      icon = 'cloud-offline-outline';
    }

    return (
      <Pressable
        style={styles.connectionBadge}
        onPress={cookieStatus === 'error' ? refreshCookies : undefined}
      >
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[textStyles.caption, { color, fontSize: 11, marginLeft: 4 }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[textStyles.heading, { color: theme.textPrimary, fontSize: 28 }]}>
          Browse
        </Text>
        {renderConnectionBadge()}
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
            editable={cookieStatus === 'ready'}
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
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item, idx) => `${item.sourceUrl}-${idx}`}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      ) : searchQuery ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color={theme.textTertiary} />
          <Text style={[textStyles.body, { color: theme.textSecondary, marginTop: 12 }]}>
            No results found
          </Text>
          <Text style={[textStyles.caption, { color: theme.textTertiary, marginTop: 4 }]}>
            Try a different search term
          </Text>
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
            {cookieStatus === 'ready'
              ? 'Find thousands of web novels to read offline'
              : 'Establishing connection to source…'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Wrapper with CookieProvider ─────────────────────────────────────────────

export default function BrowseScreenWrapper() {
  return (
    <CookieProvider sourceUrl="https://allnovel.org">
      <BrowseScreen />
    </CookieProvider>
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
