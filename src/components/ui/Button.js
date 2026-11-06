import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../../utils/constants';

const VARIANT_STYLES = {
  primary: {
    backgroundColor: COLORS.primary,
    textColor: COLORS.white,
    borderColor: 'transparent',
    rippleColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondary: {
    backgroundColor: COLORS.primaryLight,
    textColor: COLORS.primary,
    borderColor: 'transparent',
    rippleColor: 'rgba(108, 92, 231, 0.12)',
  },
  outline: {
    backgroundColor: 'transparent',
    textColor: COLORS.primary,
    borderColor: COLORS.primary,
    rippleColor: 'rgba(108, 92, 231, 0.12)',
  },
  danger: {
    backgroundColor: COLORS.dangerLight,
    textColor: COLORS.danger,
    borderColor: 'transparent',
    rippleColor: 'rgba(214, 64, 52, 0.12)',
  },
  ghost: {
    backgroundColor: 'transparent',
    textColor: COLORS.textMuted,
    borderColor: 'transparent',
    rippleColor: 'rgba(0, 0, 0, 0.06)',
  },
};

const SIZE_STYLES = {
  sm: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, fontSize: FONT_SIZES.sm },
  md: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, fontSize: FONT_SIZES.md },
  lg: {
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.lg + 8,
    fontSize: FONT_SIZES.lg,
  },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = true,
}) {
  const isDisabled = disabled || loading;
  const palette = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={6}
      android_ripple={isDisabled ? undefined : { color: palette.rippleColor }}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
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
          <Text style={[styles.text, { color: palette.textColor, fontSize: sizeStyle.fontSize }]}>
            {title}
          </Text>
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
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
  },
});
