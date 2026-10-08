import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { toUserMessage } from '../../utils/errors';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

export default function ErrorState({ error, onRetry, title = "That didn't load", message, style }) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name="cloud-offline-outline"
        size={44}
        color={COLORS.textFaint}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.alert}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message ?? toUserMessage(error)}</Text>
      </View>
      {onRetry ? (
        <Button
          title="Try again"
          onPress={onRetry}
          variant="outline"
          fullWidth={false}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
    gap: SPACING.sm,
  },
  alert: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    marginTop: SPACING.md,
    borderRadius: RADII.md,
  },
});
