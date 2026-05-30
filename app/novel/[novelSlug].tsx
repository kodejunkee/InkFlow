/**
 * Novel Details Page — Full-screen slide-in page.
 *
 * Shows novel metadata, chapter list, and download button.
 * The [novelSlug] param is a URL-encoded source URL.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDB } from '../_layout';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getTheme } from '../../src/theme/themes';
import { textStyles } from '../../src/theme/typography';
import { useCookieStore, DEFAULT_USER_AGENT } from '../../src/stores/cookieStore';
import { useNovelStore } from '../../src/stores/novelStore';
import { getNovelDetails } from '../../src/services/novel/NovelSourceService';
import { getEnabledSources, getSource } from '../../src/services/novel/ExtensionManager';
import { downloadNovel } from '../../src/services/novel/NovelDownloader';
import { getNovelDownloadBySourceUrl } from '../../src/database/queries';
import type { NovelDetails } from '../../src/types/novel';

// ─── Inner Page ──────────────────────────────────────────────────────────────

function NovelDetailsPage() {
  const { novelSlug, sourceId: paramSourceId } = useLocalSearchParams<{ novelSlug: string; sourceId?: string }>();
  const router = useRouter();
  const db = useDB();
  const theme = getTheme(useSettingsStore((s) => s.theme));
  
  const getCookies = useCookieStore((s) => s.getCookies);

  const [novel, setNovel] = useState<NovelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [chaptersExpanded, setChaptersExpanded] = useState(false);
  const [isAlreadyDownloaded, setIsAlreadyDownloaded] = useState(false);

  const activeDownloads = useNovelStore((s) => s.activeDownloads);
  const sourceUrl = novelSlug ? decodeURIComponent(novelSlug) : '';
  const activeDownload = sourceUrl ? activeDownloads[sourceUrl] : null;
  
  // Resolve sourceId
  const sourceId = useMemo(() => {
    if (paramSourceId) return paramSourceId;
    if (sourceUrl) {
      const sources = getEnabledSources();
      for (const s of sources) {
        if (sourceUrl.startsWith(s.baseUrl)) return s.id;
      }
    }
    return 'allnovel';
  }, [paramSourceId, sourceUrl]);

  const resolvedSource = getSource(sourceId);
  const cookieData = resolvedSource ? getCookies(resolvedSource.baseUrl) : null;
  const cookies = cookieData?.cookies || '';
  const userAgent = cookieData?.userAgent || DEFAULT_USER_AGENT;

  // Fetch novel details
  useEffect(() => {
    if (!sourceUrl || !sourceId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const details = await getNovelDetails(sourceId, sourceUrl, cookies, userAgent);
        if (!cancelled) {
          details.sourceId = sourceId;
          setNovel(details);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load novel details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sourceUrl, sourceId, cookies, userAgent]);

  // Check if already downloaded
  useEffect(() => {
    if (!db || !sourceUrl) return;
    const record = getNovelDownloadBySourceUrl(db, sourceUrl);
    setIsAlreadyDownloaded(record?.status === 'completed');
  }, [db, sourceUrl]);

  const handleDownload = useCallback(() => {
    if (!db || !novel) return;

    ToastAndroid.show('Download started in background', ToastAndroid.SHORT);

    // Fire and forget download
    downloadNovel({
      db,
      novel,
      cookies,
      userAgent,
    })
      .then((bookId) => {
        if (bookId) {
          setIsAlreadyDownloaded(true);
        }
      })
      .catch((e) => {
        console.error('Download failed:', e);
      });
  }, [db, novel, cookies, userAgent]);

  // ── Chapter list display ───────────────────────────────────────────
  const displayChapters = useMemo(() => {
    if (!novel?.chapters) return [];
    if (chaptersExpanded) return novel.chapters;
    const chs = novel.chapters;
    if (chs.length <= 10) return chs;
    return [...chs.slice(0, 5), null as any, ...chs.slice(-5)]; // null = separator
  }, [novel?.chapters, chaptersExpanded]);

  // ── Loading State ──────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[textStyles.body, { color: theme.textSecondary, marginTop: 12 }]}>
            Loading…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error State ────────────────────────────────────────────────────
  if (error || !novel) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={[textStyles.body, { color: theme.textPrimary, fontWeight: '600' }]}>
            Error
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textTertiary} />
          <Text style={[textStyles.body, { color: theme.textSecondary, marginTop: 12 }]}>
            {error || 'Failed to load novel'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Content ───────────────────────────────────────────────────
  const isOngoing = novel.status?.toLowerCase() === 'ongoing';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Cover */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: novel.coverUrl }}
            style={styles.heroCover}
            resizeMode="cover"
            blurRadius={Platform.OS === 'android' ? 8 : 15}
          />
          <LinearGradient
            colors={['transparent', theme.background]}
            style={styles.heroGradient}
          />

          {/* Back button overlay */}
          <SafeAreaView style={styles.heroBackButton} edges={['top']}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backCircle, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </SafeAreaView>

          {/* Cover + Title overlay */}
          <View style={styles.heroContent}>
            <Image
              source={{ uri: novel.coverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Title */}
        <Text
          style={[
            textStyles.heading,
            { color: theme.textPrimary, textAlign: 'center', paddingHorizontal: 20, fontSize: 20 },
          ]}
        >
          {novel.title}
        </Text>

        {/* Metadata Row */}
        <View style={styles.metaRow}>
          <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
            {novel.author}
          </Text>
          <Text style={[textStyles.caption, { color: theme.textTertiary }]}> • </Text>
          <View style={styles.statusInline}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOngoing ? '#4CAF50' : '#9E9E9E' },
              ]}
            />
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
              {novel.status}
            </Text>
          </View>
          <Text style={[textStyles.caption, { color: theme.textTertiary }]}> • </Text>
          <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
            {novel.totalChapters} chapters
          </Text>
        </View>

        {/* Genre Tags */}
        {novel.genres && novel.genres.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreContainer}
          >
            {novel.genres.map((genre, i) => (
              <View
                key={i}
                style={[styles.genrePill, { backgroundColor: theme.primaryLight }]}
              >
                <Text style={[textStyles.caption, { color: theme.primary, fontSize: 11, fontWeight: '600' }]}>
                  {genre}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Description */}
        {novel.description ? (
          <View style={styles.section}>
            <Text
              style={[textStyles.body, { color: theme.textSecondary, lineHeight: 22, fontSize: 13 }]}
              numberOfLines={descExpanded ? undefined : 3}
            >
              {novel.description}
            </Text>
            <Pressable onPress={() => setDescExpanded(!descExpanded)}>
              <Text style={[textStyles.caption, { color: theme.primary, marginTop: 4, fontWeight: '600' }]}>
                {descExpanded ? 'Show less' : 'Read more'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Download Button */}
        <View style={styles.section}>
          <Pressable
            style={[
              styles.downloadButton,
              {
                backgroundColor: isAlreadyDownloaded ? theme.surfaceElevated : theme.primary,
                opacity: activeDownload?.status === 'downloading' ? 0.7 : 1,
              },
            ]}
            onPress={
              isAlreadyDownloaded
                ? () => router.replace('/(tabs)')
                : handleDownload
            }
            disabled={!!activeDownload && activeDownload.status !== 'completed' && activeDownload.status !== 'failed'}
          >
            <Ionicons
              name={isAlreadyDownloaded ? 'checkmark-circle' : 'download-outline'}
              size={20}
              color={isAlreadyDownloaded ? '#4CAF50' : '#fff'}
            />
            <Text
              style={[
                textStyles.body,
                {
                  color: isAlreadyDownloaded ? theme.textPrimary : '#fff',
                  fontWeight: '700',
                  marginLeft: 8,
                  fontSize: 15,
                },
              ]}
            >
              {isAlreadyDownloaded
                ? 'Already in Library'
                : !!activeDownload && activeDownload.status !== 'completed' && activeDownload.status !== 'failed'
                ? 'Downloading...'
                : `Download (${novel.totalChapters} chapters)`}
            </Text>
          </Pressable>
        </View>

        {/* Chapter List */}
        <View style={styles.section}>
          <Text
            style={[textStyles.body, { color: theme.textPrimary, fontWeight: '700', marginBottom: 10 }]}
          >
            Chapters
          </Text>
          {displayChapters.map((ch, idx) => {
            if (ch === null) {
              return (
                <View key="separator" style={styles.chapterSeparator}>
                  <Text style={[textStyles.caption, { color: theme.textTertiary }]}>
                    ⋯ {novel.totalChapters - 10} more chapters ⋯
                  </Text>
                </View>
              );
            }
            return (
              <View
                key={ch.index}
                style={[styles.chapterRow, { borderBottomColor: theme.divider }]}
              >
                <Text
                  style={[textStyles.caption, { color: theme.textTertiary, width: 36 }]}
                >
                  {ch.index}
                </Text>
                <Text
                  style={[textStyles.caption, { color: theme.textSecondary, flex: 1 }]}
                  numberOfLines={1}
                >
                  {ch.title}
                </Text>
              </View>
            );
          })}

          {novel.chapters.length > 10 && (
            <Pressable
              style={styles.expandButton}
              onPress={() => setChaptersExpanded(!chaptersExpanded)}
            >
              <Text style={[textStyles.caption, { color: theme.primary, fontWeight: '600' }]}>
                {chaptersExpanded
                  ? 'Show less'
                  : `View all ${novel.totalChapters} chapters`}
              </Text>
              <Ionicons
                name={chaptersExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.primary}
              />
            </Pressable>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default NovelDetailsPage;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header bar (loading/error states)
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Hero
  heroContainer: {
    height: 260,
    position: 'relative',
    marginBottom: 10,
  },
  heroCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  heroBackButton: {
    position: 'absolute',
    top: 0,
    left: 16,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  coverImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  // Metadata
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  statusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Genres
  genreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
  },

  // Download
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },

  // Chapters
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chapterSeparator: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
});
