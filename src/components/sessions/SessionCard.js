import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { COLORS, SPACING, FONT_SIZES, SESSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate, formatTime } from '../../utils/helpers';

const STATUS_TONE = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

export default function SessionCard({ session, role, onPress }) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Badge label={SESSION_STATUS_LABELS[session.status] ?? session.status} tone={STATUS_TONE[session.status]} />
        <Badge label={role === 'teacher' ? 'Teaching' : 'Learning'} tone="neutral" />
      </View>

      <Text style={styles.title}>{session.skill_title}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.metaText}>{formatDate(session.session_date)}</Text>
        <Ionicons name="time-outline" size={14} color={COLORS.textMuted} style={{ marginLeft: SPACING.sm }} />
        <Text style={styles.metaText}>{formatTime(session.session_date)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 4,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
});
