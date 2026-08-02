import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../../utils/constants';

const VARIANT_STYLES = {
  primary: { backgroundColor: COLORS.primary, textColor: COLORS.white, borderColor: 'transparent' },
  secondary: { backgroundColor: COLORS.primaryLight, textColor: COLORS.primary, borderColor: 'transparent' },
  outline: { backgroundColor: 'transparent', textColor: COLORS.primary, borderColor: COLORS.primary },
  danger: { backgroundColor: COLORS.dangerLight, textColor: COLORS.danger, borderColor: 'transparent' },
  ghost: { backgroundColor: 'transparent', textColor: COLORS.textMuted, borderColor: 'transparent' },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = true,
}) {
  const palette = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: palette.textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  text: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
