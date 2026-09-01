import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../store/useAppHooks';
import { swapService } from '../../services/swapService';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';
import { confirmAction, notify } from '../../utils/alert';

const TABS = [
  { key: 'matches', label: 'Matches' },
  { key: 'right', label: 'Swapped' },
  { key: 'left', label: 'Passed' },
  { key: 'maybe', label: 'Saved' },
];

export default function SwapHistoryScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState('matches');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    setLoading(true);
    const fetcher = tab === 'matches' ? swapService.fetchMatches(user.user_id) : swapService.fetchSwipeHistory(tab);
    fetcher.then((data) => {
      setHistory(data);
      setLoading(false);
    });
  };

  useEffect(load, [tab, user]);

  const handleUnmatch = (matchId) => {
    confirmAction('Unmatch?', "You'll both stop seeing each other as a match, and could reappear in each other's decks later.", {
      confirmText: 'Unmatch',
      destructive: true,
      onConfirm: async () => {
        try {
          await swapService.unmatch(matchId);
          setHistory((prev) => prev.filter((item) => item.id !== matchId));
        } catch (err) {
          notify('Could not unmatch', err.message ?? 'Please try again.');
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Swap History</Text>
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, tab === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingSpinner label="Loading history…" />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Nothing here yet.</Text>}
          renderItem={({ item }) => {
            const person = tab === 'matches' ? item.counterpart : item.target;
            const when = tab === 'matches' ? item.matchedAt : item.createdAt;
            return (
              <Card style={styles.row}>
                <Avatar uri={person?.avatar} name={person?.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{person?.name ?? 'SkillSwap member'}</Text>
                </View>
                <Text style={styles.time}>{timeAgo(when)}</Text>
                {tab === 'matches' && (
                  <Pressable onPress={() => handleUnmatch(item.id)} hitSlop={8} style={{ marginLeft: SPACING.sm }}>
                    <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
                  </Pressable>
                )}
              </Card>
            );
          }}
        />
      )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  time: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
  },
});
