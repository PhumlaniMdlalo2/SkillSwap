import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import XPProgressBar from '../../components/gamification/XPProgressBar';
import StreakCard from '../../components/gamification/StreakCard';
import BadgeGrid from '../../components/gamification/BadgeGrid';
import RewardsHistory from '../../components/gamification/RewardsHistory';
import { useAuth } from '../../store/useAppHooks';
import { gamificationService } from '../../services/gamificationService';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

const LEVEL_EMOJIS = ['🌱', '🗺️', '🛠️', '🎓', '🏆'];

export default function SkillPassportScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const enabled = Boolean(user);

  const {
    data: stats,
    isPending: statsPending,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['user-stats', user?.user_id],
    queryFn: () => gamificationService.getUserStats(user.user_id),
    enabled,
  });

  const {
    data: endorsements = [],
    isPending: endorsementsPending,
    error: endorsementsError,
    refetch: refetchEndorsements,
  } = useQuery({
    queryKey: ['endorsements', user?.user_id],
    queryFn: () => gamificationService.getUserEndorsements(user.user_id),
    enabled,
  });

  const {
    data: sessionsThisWeek = 0,
    refetch: refetchWeekly,
  } = useQuery({
    queryKey: ['sessions-this-week', user?.user_id],
    queryFn: () => gamificationService.getSessionsThisWeek(user.user_id),
    enabled,
  });

  const {
    data: rewardsHistory = [],
    isPending: rewardsPending,
    refetch: refetchRewards,
  } = useQuery({
    queryKey: ['rewards-history', user?.user_id],
    queryFn: () => gamificationService.getRewardsHistory(user.user_id),
    enabled,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchEndorsements(),
        refetchWeekly(),
        refetchRewards(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const loading = statsPending || endorsementsPending;
  const error = statsError || endorsementsError;

  if (loading) return <LoadingSpinner label="Loading your passport…" />;
  if (error) return <ErrorState error={error} onRetry={onRefresh} />;

  const xp = stats?.xp ?? 0;
  const levelInfo = stats?.levelInfo ?? { level: 1, title: 'Novice', progress: 0, minXp: 0, nextXp: 200 };
  const totalStamps = endorsements.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const levelEmoji = LEVEL_EMOJIS[Math.min((levelInfo.level ?? 1) - 1, LEVEL_EMOJIS.length - 1)];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
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
      >
        {/* ── Hero Header ───────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroAvatarWrap}>
            <Avatar uri={user?.avatar} name={user?.name} size={72} />
            <View style={styles.levelBadgeOverlay}>
              <Text style={styles.levelBadgeOverlayText}>{levelEmoji}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>{user?.name}</Text>
          <Text style={styles.heroTitle}>
            {levelEmoji} {levelInfo.title} · Level {levelInfo.level}
          </Text>
        </View>

        {/* ── Quick Stats ───────────────────────────── */}
        <View style={styles.quickStats}>
          <QuickStat emoji="⚡" value={xp.toLocaleString()} label="Total XP" />
          <QuickStat emoji="🔥" value={stats?.streakWeeks ?? 0} label="Week Streak" />
          <QuickStat emoji="🏅" value={totalStamps} label="Stamps" />
          <QuickStat emoji="🎯" value={sessionsThisWeek} label="This Week" />
        </View>

        {/* ── XP & Level Progress ───────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Level Progress</Text>
          <XPProgressBar xp={xp} levelInfo={levelInfo} />

          {/* Level roadmap */}
          <View style={styles.roadmap}>
            {['Novice', 'Explorer', 'Practitioner', 'Skill Mentor', 'Master Polymath'].map((title, i) => {
              const lvl = i + 1;
              const reached = levelInfo.level >= lvl;
              return (
                <View key={title} style={styles.roadmapItem}>
                  <View style={[styles.roadmapDot, reached && styles.roadmapDotReached]}>
                    <Text style={styles.roadmapEmoji}>{LEVEL_EMOJIS[i]}</Text>
                  </View>
                  <Text style={[
                    styles.roadmapLabel,
                    reached && styles.roadmapLabelReached,
                    levelInfo.level === lvl && styles.roadmapLabelCurrent,
                  ]}>
                    {title}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* ── Streak ────────────────────────────────── */}
        <StreakCard stats={stats} sessionsThisWeek={sessionsThisWeek} />

        {/* ── Endorsement Badges ────────────────────── */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Endorsement Badges</Text>
            <Pressable onPress={() => setShowAllBadges((v) => !v)} hitSlop={12}>
              <Text style={styles.toggleText}>
                {showAllBadges ? 'Earned only' : 'Show all'}
              </Text>
            </Pressable>
          </View>
          <BadgeGrid endorsements={endorsements} showAll={showAllBadges} />
        </Card>

        {/* ── Rewards History ───────────────────────── */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rewards History</Text>
            <Text style={styles.sectionSubtext}>
              {rewardsHistory.length} event{rewardsHistory.length === 1 ? '' : 's'}
            </Text>
          </View>
          <RewardsHistory events={rewardsHistory} limit={15} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickStat({ emoji, value, label }) {
  return (
    <View style={styles.quickStatItem}>
      <Text style={styles.quickStatEmoji}>{emoji}</Text>
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + 24,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  heroAvatarWrap: {
    position: 'relative',
  },
  levelBadgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeOverlayText: {
    fontSize: 12,
  },
  heroName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  heroTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },

  // Quick stats
  quickStats: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    gap: 2,
  },
  quickStatEmoji: {
    fontSize: 16,
  },
  quickStatValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  quickStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Sections
  section: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  toggleText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Level roadmap
  roadmap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  roadmapItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  roadmapDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadmapDotReached: {
    backgroundColor: COLORS.primaryLight,
  },
  roadmapEmoji: {
    fontSize: 12,
  },
  roadmapLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textFaint,
    textAlign: 'center',
  },
  roadmapLabelReached: {
    color: COLORS.textMuted,
  },
  roadmapLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
