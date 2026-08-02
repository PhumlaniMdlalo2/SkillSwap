import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

export default function SkillCard({ skill, onPress }) {
  const teacher = skill.teacher;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Badge label={skill.category} />
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={COLORS.token} />
          <Text style={styles.ratingText}>{teacher?.rating ?? '—'}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{skill.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{skill.description}</Text>

      <View style={styles.teacherRow}>
        <Avatar uri={teacher?.avatar} name={teacher?.name} size={28} />
        <Text style={styles.teacherName} numberOfLines={1}>{teacher?.name ?? 'SkillSwap teacher'}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  teacherName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
});
