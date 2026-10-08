import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import SessionCard from '../../components/sessions/SessionCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import useFocusRefetch from '../../hooks/useFocusRefetch';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function SessionHistoryScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: sessions = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sessions', user?.user_id],
    queryFn: async () => {
      const data = await api.getSessionsForUser(user.user_id);
      return data.sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
    },
    enabled: Boolean(user),
  });
  useFocusRefetch(refetch, Boolean(user));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isPending) return <LoadingSpinner label="Loading your sessions…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const filtered = tab === 'all' ? sessions : sessions.filter((s) => s.status === tab);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          My Sessions
        </Text>
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === t.key }}
              style={[styles.tab, tab === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.session_id}
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
          <Text style={styles.emptyText} accessible>
            {tab === 'completed'
              ? "No completed sessions yet — once one wraps up, you'll be able to leave a review here."
              : 'Nothing here yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            role={item.teacher_id === user.user_id ? 'teacher' : 'learner'}
            onPress={() => router.push(`/sessions/${item.session_id}`)}
          />
        )}
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
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
