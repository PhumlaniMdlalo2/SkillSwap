import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../../utils/constants';

export default function TokenBalance({ balance, size = 'large' }) {
  const isLarge = size === 'large';

  return (
    <View style={[styles.container, isLarge ? styles.large : styles.small]}>
      <View style={styles.iconWrap}>
        <Ionicons name="time" size={isLarge ? 22 : 16} color={COLORS.token} />
      </View>
      <View>
        <Text style={[styles.value, isLarge && styles.valueLarge]}>{balance}</Text>
        <Text style={styles.label}>time token{balance === 1 ? '' : 's'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  large: {
    padding: SPACING.md,
    backgroundColor: COLORS.tokenLight,
    borderRadius: RADII.lg,
  },
  small: {},
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADII.round,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  valueLarge: {
    fontSize: FONT_SIZES.xxl,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
});
