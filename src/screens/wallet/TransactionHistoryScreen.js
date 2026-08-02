import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useWallet } from '../../store/useAppHooks';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { formatTokens, formatDateTime } from '../../utils/helpers';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'earn', label: 'Earned' },
  { key: 'spend', label: 'Spent' },
];

export default function TransactionHistoryScreen() {
  const { transactions, loading, refresh } = useWallet();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  );

  if (loading && transactions.length === 0) {
    return <LoadingSpinner label="Loading transactions…" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.transaction_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions in this view yet.</Text>}
        renderItem={({ item }) => {
          const isEarn = item.type === 'earn';
          return (
            <Card style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: isEarn ? COLORS.secondaryLight : COLORS.dangerLight }]}>
                <Ionicons name={isEarn ? 'arrow-down' : 'arrow-up'} size={16} color={isEarn ? COLORS.secondary : COLORS.danger} />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDescription}>{item.description}</Text>
                <Text style={styles.txDate}>{formatDateTime(item.created_at)}</Text>
              </View>
              <Text style={[styles.txAmount, { color: isEarn ? COLORS.secondary : COLORS.danger }]}>
                {formatTokens(item.amount)}
              </Text>
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
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  filterTextActive: {
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
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: RADII.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  txDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
    marginTop: 2,
  },
  txAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
