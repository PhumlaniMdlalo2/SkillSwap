import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Card from '../ui/Card';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';

/**
 * A single reward event.
 *
 * @typedef {Object} RewardEvent
 * @property {string}  id
 * @property {'xp'|'badge'|'streak'|'perfect_week'|'level_up'} type
 * @property {string}  title
 * @property {string}  description
 * @property {number}  [xpAmount]
 * @property {string}  createdAt
 */

const TYPE_META = {
  xp: { color: COLORS.primary },
  badge: { color: '#F5A623' },
  streak: { color: '#FF7675' },
  perfect_week: { color: '#FFD700' },
  level_up: { color: '#00B894' },
};

function RewardItem({ event }) {
  const meta = TYPE_META[event.type] || TYPE_META.xp;

  return (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{event.title}</Text>
        <Text style={styles.itemDesc}>{event.description}</Text>
      </View>
      <View style={styles.itemRight}>
        {event.xpAmount ? (
          <Text style={[styles.xpAmount, { color: meta.color }]}>
            +{event.xpAmount} XP
          </Text>
        ) : null}
        <Text style={styles.timeText}>{timeAgo(event.createdAt)}</Text>
      </View>
    </View>
  );
}

/**
 * RewardsHistory — renders a scrollable list of reward events.
 *
 * Props:
 *   events  – array of RewardEvent
 *   limit   – max number of events to show (optional)
 */
export default function RewardsHistory({ events = [], limit }) {
  const displayed = limit ? events.slice(0, limit) : events;

  if (displayed.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No rewards yet</Text>
        <Text style={styles.emptyText}>
          Complete sessions, earn badges, and build streaks to fill up your rewards history!
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {displayed.map((event) => (
        <RewardItem key={event.id} event={event} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  xpAmount: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 10,
    color: COLORS.textFaint,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.lg,
  },
});
