import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../ui/Button';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

export default function SwapEmptyState({ onRefresh }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="sparkles-outline" size={36} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>No more profiles</Text>
      <Text style={styles.subtitle}>
        You've seen everyone nearby. Check back later or adjust your preferences.
      </Text>
      <Button title="Refresh" onPress={onRefresh} fullWidth={false} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: RADII.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  button: {
    paddingHorizontal: SPACING.xl,
  },
});
