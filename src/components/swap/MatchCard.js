import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';

export default function MatchCard({ match, candidate, onPress }) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <Avatar uri={candidate?.photo} name={candidate?.name} size={48} />
      <View style={styles.info}>
        <Text style={styles.name}>{candidate?.name ?? 'SkillSwap member'}</Text>
        <Text style={styles.skill} numberOfLines={1}>Teaches {candidate?.teaches}</Text>
        <Text style={styles.time}>Connected {timeAgo(match.matchedAt)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  skill: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  time: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
    marginTop: 2,
  },
});
