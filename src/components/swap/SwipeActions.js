import React from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SPACING, SHADOW } from '../../utils/constants';

export default function SwipeActions({ onDecline, onMaybe, onAccept, isLoading }) {
  return (
    <View style={styles.row}>
      <ActionButton icon="close" color={COLORS.danger} onPress={onDecline} disabled={isLoading} />
      <ActionButton icon="bookmark" color={COLORS.token} onPress={onMaybe} disabled={isLoading} small />
      <ActionButton icon="swap-horizontal" color={COLORS.secondary} onPress={onAccept} disabled={isLoading} />
      {isLoading ? <ActivityIndicator style={styles.spinner} color={COLORS.primary} /> : null}
    </View>
  );
}

function ActionButton({ icon, color, onPress, disabled, small }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={icon} size={small ? 22 : 28} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: RADII.round,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  buttonSmall: {
    width: 46,
    height: 46,
  },
  spinner: {
    position: 'absolute',
    bottom: -24,
  },
});
