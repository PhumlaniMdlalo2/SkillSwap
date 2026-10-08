import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

export default function StreakBanner({ stats }) {
  if (!stats) return null;

  const { streakWeeks = 0, xp = 0, levelInfo } = stats;
  const progressPercent = Math.round((levelInfo?.progress || 0) * 100);

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.streakWrap}>
          <Text style={styles.streakIcon}>🔥</Text>
          <View>
            <Text style={styles.streakTitle}>
              {streakWeeks > 0 ? `${streakWeeks} Week Streak!` : 'Start Your Streak!'}
            </Text>
            <Text style={styles.streakSubtitle}>
              {streakWeeks > 0
                ? 'Complete a session this week to keep it glowing'
                : 'Complete 1 session this week to light your flame'}
            </Text>
          </View>
        </View>

        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>Lvl {levelInfo?.level || 1}</Text>
        </View>
      </View>

      {/* Level XP Bar */}
      <View style={styles.xpSection}>
        <View style={styles.xpHeader}>
          <Text style={styles.levelTitle}>{levelInfo?.title || 'Novice'}</Text>
          <Text style={styles.xpCount}>
            {xp} / {levelInfo?.nextXp} XP
          </Text>
        </View>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
    borderLeftColor: '#FF7675',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  streakWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  streakIcon: {
    fontSize: 28,
  },
  streakTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.text,
  },
  streakSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  levelBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs - 1,
    borderRadius: RADII.round,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  xpSection: {
    marginTop: 2,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  xpCount: {
    fontSize: 11,
    color: COLORS.textFaint,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADII.round,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF7675',
    borderRadius: RADII.round,
  },
});
