import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useWallet } from '../../store/useAppHooks';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { formatTokens, formatDate } from '../../utils/helpers';

export default function WalletScreen() {
  const { balance, transactions, loading, refresh } = useWallet();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && transactions.length === 0) {
    return <LoadingSpinner label="Loading your wallet…" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Time token balance</Text>
        <Text style={styles.balanceValue}>{balance}</Text>
        <Text style={styles.balanceHint}>1 token ≈ 1 hour of skill exchange</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <Pressable onPress={() => router.push('/wallet/transactions')}>
          <Text style={styles.sectionLink}>See all</Text>
        </Pressable>
      </View>

      <FlatList
        data={transactions.slice(0, 8)}
        keyExtractor={(item) => item.transaction_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
        renderItem={({ item }) => <TransactionRow transaction={item} />}
      />
    </SafeAreaView>
  );
}

function TransactionRow({ transaction }) {
  const isEarn = transaction.type === 'earn';
  return (
    <Card style={styles.txCard}>
      <View style={[styles.txIcon, { backgroundColor: isEarn ? COLORS.secondaryLight : COLORS.dangerLight }]}>
        <Ionicons
          name={isEarn ? 'arrow-down' : 'arrow-up'}
          size={16}
          color={isEarn ? COLORS.secondary : COLORS.danger}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txDescription} numberOfLines={1}>{transaction.description}</Text>
        <Text style={styles.txDate}>{formatDate(transaction.created_at)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isEarn ? COLORS.secondary : COLORS.danger }]}>
        {formatTokens(transaction.amount)}
      </Text>
    </Card>
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
  balanceCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryLight,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.white,
    marginVertical: SPACING.xs,
  },
  balanceHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primaryLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.lg,
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
