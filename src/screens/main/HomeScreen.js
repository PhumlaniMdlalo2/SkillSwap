import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import TokenBalance from '../../components/wallet/TokenBalance';
import SessionCard from '../../components/sessions/SessionCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth, useWallet } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

export default function HomeScreen() {
  const { user } = useAuth();
  const { balance, refresh: refreshWallet } = useWallet();
  const [sessions, setSessions] = useState([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [sessionData, requests] = await Promise.all([
      api.getSessionsForUser(user.user_id),
      api.getRequestsForUser(user.user_id),
    ]);
    setSessions(sessionData.filter((s) => s.status === 'pending').slice(0, 3));
    setPendingRequestCount(
      requests.filter((r) => r.teacher_id === user.user_id && r.status === 'pending').length
    );
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshWallet()]);
    setRefreshing(false);
  };

  if (loading) return <LoadingSpinner label="Loading your dashboard…" />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          )
        }
      >
        <Text style={styles.greeting}>Hi {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
        <Text style={styles.subGreeting}>Here's what's happening in your skill exchange.</Text>

        <Card style={styles.walletCard} onPress={() => router.push('/wallet/transactions')}>
          <View style={styles.walletRow}>
            <TokenBalance balance={balance} />
            <Ionicons name="chevron-forward" size={20} color={COLORS.textFaint} />
          </View>
        </Card>

        {pendingRequestCount > 0 && (
          <Card style={styles.requestBanner} onPress={() => router.push('/requests')}>
            <View style={styles.requestBannerIcon}>
              <Ionicons name="mail" size={18} color={COLORS.token} />
            </View>
            <Text style={styles.requestBannerText}>
              {pendingRequestCount} session request{pendingRequestCount === 1 ? '' : 's'} waiting on you
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
          </Card>
        )}

        <View style={styles.quickActions}>
          <QuickAction icon="search" label="Browse Skills" onPress={() => router.push('/(tabs)/explore')} />
          <QuickAction icon="add-circle" label="Add a Skill" onPress={() => router.push('/skills/add')} />
          <QuickAction icon="sparkles" label="Skill Match" onPress={() => router.push('/(tabs)/swap')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming sessions</Text>
          <Text style={styles.sectionLink} onPress={() => router.push('/skills/my-skills')}>
            My skills
          </Text>
        </View>

        {sessions.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No upcoming sessions yet. Go book one!</Text>
            <Button
              title="Browse Skills"
              variant="secondary"
              fullWidth={false}
              onPress={() => router.push('/(tabs)/explore')}
              style={{ marginTop: SPACING.sm }}
            />
          </Card>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.session_id}
              session={session}
              role={session.teacher_id === user.user_id ? 'teacher' : 'learner'}
              onPress={() => router.push(`/sessions/${session.session_id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <Card onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  greeting: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  walletCard: {
    marginBottom: SPACING.lg,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.tokenLight,
  },
  requestBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: RADII.round,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADII.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
});
