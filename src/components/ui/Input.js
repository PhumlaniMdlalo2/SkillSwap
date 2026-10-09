import React, { useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../../utils/constants';

export default function Input({
  label,
  error,
  containerStyle,
  multiline = false,
  secureTextEntry = false,
  ...textInputProps
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          multiline && styles.multilineWrap,
          focused && styles.inputWrapFocused,
          error && styles.inputWrapError,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={COLORS.textFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          secureTextEntry={secureTextEntry && hidden}
          style={[styles.input, multiline && styles.multiline]}
          {...textInputProps}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={8}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye' : 'eye-off'} size={20} color={COLORS.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  multilineWrap: {
    alignItems: 'flex-start',
  },
  inputWrapFocused: {
    borderColor: COLORS.primary,
  },
  inputWrapError: {
    borderColor: COLORS.danger,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  toggle: {
    paddingHorizontal: SPACING.sm + 2,
  },
  error: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
  },
});
