import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../store/useAppHooks';
import { chatService } from '../../services/chatService';
import useFocusRefetch from '../../hooks/useFocusRefetch';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const enabled = Boolean(user);

  const {
    data: conversations = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['conversations', user?.user_id],
    queryFn: () => chatService.fetchConversations(user.user_id),
    enabled,
  });

  useFocusRefetch(refetch, enabled);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isPending) return <LoadingSpinner label="Loading messages…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Messages
        </Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Match with someone in Swap, then tap them to start a conversation.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { counterpart, lastMessage } = item;
          const preview = lastMessage
            ? `${lastMessage.fromMe ? 'You: ' : ''}${lastMessage.content}`
            : 'Say hello to start swapping skills';
          const when = lastMessage?.createdAt ?? item.matchedAt;

          return (
            <Card
              style={styles.row}
              onPress={() => router.push(`/chat/${item.id}`)}
              accessibilityLabel={`Open chat with ${counterpart?.name ?? 'match'}`}
            >
              <Avatar uri={counterpart?.avatar} name={counterpart?.name} size={48} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {counterpart?.name ?? 'SkillSwap member'}
                  </Text>
                  <Text style={styles.time}>{timeAgo(when)}</Text>
                </View>
                <Text
                  style={[styles.preview, !lastMessage && styles.previewEmpty]}
                  numberOfLines={1}
                >
                  {preview}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  name: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  time: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
  },
  preview: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  previewEmpty: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADII.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
