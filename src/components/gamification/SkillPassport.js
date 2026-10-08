import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

export default function SkillPassport({ endorsements = [] }) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.titleIcon}>🏅</Text>
          <Text style={styles.title}>Skill Passport</Text>
        </View>
        <Text style={styles.stampCount}>
          {endorsements.reduce((acc, curr) => acc + (curr.count || 0), 0)} stamps
        </Text>
      </View>

      {endorsements.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No endorsement stamps yet. Complete sessions to collect stamps from partners!
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {endorsements.map((badge) => (
            <View key={badge.key} style={styles.badgePill}>
              <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
              <Text style={styles.badgeLabel}>{badge.label}</Text>
              <View style={styles.countTag}>
                <Text style={styles.countText}>×{badge.count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  titleIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.text,
  },
  stampCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  emptyWrap: {
    paddingVertical: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.round,
    paddingLeft: SPACING.sm,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 4,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  countTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.round,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
