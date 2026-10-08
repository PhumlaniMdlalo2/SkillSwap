import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import {
  streakStatus,
  streakStatusMeta,
  countdownLabel,
  isPerfectWeek,
  PERFECT_WEEK_THRESHOLD,
} from '../../utils/streakHelpers';

/**
 * Enhanced streak card with:
 * - Streak-status awareness (active / at-risk / lapsed / none)
 * - Countdown to week-end when at risk
 * - Perfect-week bonus indicator
 *
 * Props:
 *   stats              – { streakWeeks, xp, levelInfo, lastActiveWeek }
 *   sessionsThisWeek   – number of completed sessions this ISO week (optional)
 */
export default function StreakCard({ stats, sessionsThisWeek = 0 }) {
  if (!stats) return null;

  const { streakWeeks = 0, lastActiveWeek } = stats;
  const status = streakStatus(lastActiveWeek);
  const meta = streakStatusMeta(status);
  const perfectWeek = isPerfectWeek(sessionsThisWeek);

  return (
    <Card style={[styles.card, { borderLeftColor: meta.color }]}>
      {/* Top row: streak info */}
      <View style={styles.topRow}>
        <View style={styles.streakWrap}>
          <Text style={styles.streakIcon}>{meta.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>
              {streakWeeks > 0 ? `${streakWeeks} Week Streak!` : 'Start Your Streak!'}
            </Text>
            <Text style={[styles.streakSubtitle, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        {streakWeeks > 0 && (
          <View style={[styles.flameBadge, { backgroundColor: meta.color + '18' }]}>
            <Text style={[styles.flameBadgeText, { color: meta.color }]}>
              🔥 {streakWeeks}
            </Text>
          </View>
        )}
      </View>

      {/* Countdown timer when at risk */}
      {status === 'at_risk' && (
        <View style={styles.countdownRow}>
          <Text style={styles.countdownIcon}>⏰</Text>
          <Text style={styles.countdownText}>{countdownLabel()}</Text>
        </View>
      )}

      {/* Lapsed encouragement */}
      {status === 'lapsed' && (
        <View style={styles.countdownRow}>
          <Text style={styles.countdownIcon}>💪</Text>
          <Text style={styles.countdownText}>
            Complete a session this week to start a new streak!
          </Text>
        </View>
      )}

      {/* Perfect-week bonus */}
      {perfectWeek && (
        <View style={styles.perfectWeekBanner}>
          <Text style={styles.perfectWeekText}>
            ⭐ Perfect Week! {PERFECT_WEEK_THRESHOLD}+ sessions completed — +200 bonus XP!
          </Text>
        </View>
      )}

      {/* Progress toward perfect week */}
      {!perfectWeek && sessionsThisWeek > 0 && (
        <View style={styles.perfectProgress}>
          <Text style={styles.perfectProgressText}>
            📊 {sessionsThisWeek}/{PERFECT_WEEK_THRESHOLD} sessions this week
            {sessionsThisWeek === PERFECT_WEEK_THRESHOLD - 1
              ? ' — 1 more for a Perfect Week bonus!'
              : ''}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 1,
    fontWeight: '600',
  },
  flameBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.round,
  },
  flameBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  countdownIcon: {
    fontSize: 14,
  },
  countdownText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
    flex: 1,
  },
  perfectWeekBanner: {
    marginTop: SPACING.sm,
    backgroundColor: '#FEF3DE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.sm,
  },
  perfectWeekText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#B7791F',
  },
  perfectProgress: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  perfectProgressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
