import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../../utils/constants';

const TONES = {
  neutral: { bg: COLORS.primaryLight, fg: COLORS.primary },
  success: { bg: COLORS.secondaryLight, fg: COLORS.secondary },
  warning: { bg: COLORS.tokenLight, fg: COLORS.token },
  danger: { bg: COLORS.dangerLight, fg: COLORS.danger },
};

export default function Badge({ label, tone = 'neutral' }) {
  const palette = TONES[tone] ?? TONES.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADII.round,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
});
