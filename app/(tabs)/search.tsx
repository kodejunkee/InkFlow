import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getTheme } from '../../src/theme/themes';
import { textStyles } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useDB } from '../_layout';
import { searchGlobalAnnotations } from '../../src/database/queries';
import type { GlobalSearchResult } from '../../src/types/book';

export default function SearchScreen() {
  const router = useRouter();
  const db = useDB();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);

  useEffect(() => {
    if (!db) return;

    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    // Debounce the search query
    const timeout = setTimeout(() => {
      try {
        const hits = searchGlobalAnnotations(db, query.trim());
        setResults(hits);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, db]);

  const handleResultPress = useCallback(
    (item: GlobalSearchResult) => {
      // Deep link into the reader to the specific cfi
      router.push({
        pathname: '/reader/[bookId]',
        params: { bookId: item.bookId, cfi: item.cfi },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: GlobalSearchResult }) => {
      const isHighlight = item.type === 'highlight';
      
      return (
        <Pressable
          style={({ pressed }) => [
            styles.resultCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && { opacity: 0.7, backgroundColor: theme.surfaceElevated },
          ]}
          onPress={() => handleResultPress(item)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.typeBadgeContainer}>
              <Ionicons 
                name={isHighlight ? 'create' : 'bookmark'} 
                size={14} 
                color={theme.primary} 
              />
              <Text style={[styles.typeBadgeText, { color: theme.primary }]}>
                {isHighlight ? 'Highlight' : 'Bookmark'}
              </Text>
            </View>
            <Text style={[textStyles.caption, { color: theme.textSecondary }]} numberOfLines={1}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <Text style={[textStyles.h3, { color: theme.textPrimary, marginBottom: spacing.xs }]} numberOfLines={1}>
            {item.bookTitle}
          </Text>
          <Text style={[textStyles.caption, { color: theme.textSecondary, marginBottom: spacing.md }]} numberOfLines={1}>
            {item.chapterTitle || 'Unknown Chapter'}
          </Text>

          {/* Matched text (highlight selected text or bookmark label) */}
          <View style={[styles.textSnippetContainer, { borderLeftColor: item.color || theme.primary }]}>
            <Text style={[textStyles.bodySmall, { color: theme.textPrimary }]} numberOfLines={3}>
              {item.text}
            </Text>
          </View>

          {/* User note */}
          {item.note && (
            <View style={styles.noteContainer}>
              <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} style={{ marginTop: 2 }} />
              <Text style={[textStyles.bodySmall, { color: theme.textSecondary, flex: 1, marginLeft: spacing.xs }]} numberOfLines={2}>
                {item.note}
              </Text>
            </View>
          )}
        </Pressable>
      );
    },
    [theme, handleResultPress]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[textStyles.h2, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Search</Text>
        
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search highlights, notes & bookmarks..."
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={styles.clearButton} hitSlop={12}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {query.trim().length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
          <Text style={[textStyles.body, { color: theme.textSecondary, marginTop: spacing.md }]}>
            Type to search across all your books.
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[textStyles.body, { color: theme.textSecondary }]}>
            No results found for "{query}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  resultCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  textSnippetContainer: {
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.3)',
  },
});
