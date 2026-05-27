/**
 * BookGrid - Responsive grid layout for the book library
 *
 * Uses FlatList with virtualization for performance with large libraries.
 */

import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { BookCard, NUM_COLUMNS, CARD_MARGIN, GRID_PADDING, CARD_WIDTH } from './BookCard';
import { type Book } from '../../types/book';
import { spacing } from '../../theme/spacing';

interface BookGridProps {
  books: Book[];
  onBookPress: (bookId: number) => void;
  onBookLongPress?: (bookId: number) => void;
  ListHeaderComponent?: React.ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function BookGrid({
  books,
  onBookPress,
  onBookLongPress,
  ListHeaderComponent,
  refreshing,
  onRefresh,
}: BookGridProps) {
  const renderItem = ({ item }: { item: Book }) => {
    return (
      <View style={styles.cardWrapper}>
        <BookCard
          id={item.id}
          title={item.title}
          author={item.author}
          coverUri={item.coverUri}
          progress={item.progress}
          onPress={onBookPress}
          onLongPress={onBookLongPress}
        />
      </View>
    );
  };

  return (
    <FlatList
      data={books}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={styles.container}
      columnWrapperStyle={styles.columnWrapper}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      refreshing={refreshing}
      onRefresh={onRefresh}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={8}
      windowSize={5}
      initialNumToRender={6}
      getItemLayout={undefined} // Dynamic height due to variable title lengths
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing['5xl'],
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: CARD_MARGIN,
  },
});
