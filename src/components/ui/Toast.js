import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToast } from '../../utils/alert';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOW } from '../../utils/constants';

export default function Toast() {
  const [payload, setPayload] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => subscribeToast(setPayload), []);

  if (!payload) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + SPACING.sm }]}>
      <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
        <View style={styles.textWrap}>
          <Text style={styles.title}>{payload.title}</Text>
          {payload.message ? <Text style={styles.message}>{payload.message}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    ...SHADOW,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  message: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});
