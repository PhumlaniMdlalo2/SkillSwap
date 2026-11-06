import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { COLORS, RADII, SPACING, SHADOW } from '../../utils/constants';

export default function Card({ children, style, onPress, padded = true, accessibilityLabel }) {
  const content = <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: 'rgba(0, 0, 0, 0.06)' }}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, borderRadius: RADII.lg }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  padded: {
    padding: SPACING.md,
  },
});
