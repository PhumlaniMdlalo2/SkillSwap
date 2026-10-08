import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

/**
 * A reusable, animated XP progress bar.
 *
 * Props:
 *   xp          – current total XP
 *   levelInfo   – { level, title, minXp, nextXp, progress }
 *   compact     – smaller variant for inline use (default false)
 */
export default function XPProgressBar({ xp = 0, levelInfo, compact = false }) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const progress = levelInfo?.progress ?? 0;
  const progressPercent = Math.round(progress * 100);

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, animatedWidth]);

  const barHeight = compact ? 6 : 10;
  const xpNeeded = (levelInfo?.nextXp ?? 200) - xp;
  const isMax = levelInfo?.level === 5 && progress >= 1;

  return (
    <View style={compact ? styles.wrapCompact : styles.wrap}>
      {!compact && (
        <View style={styles.header}>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>Lvl {levelInfo?.level ?? 1}</Text>
          </View>
          <Text style={styles.titleText}>{levelInfo?.title ?? 'Novice'}</Text>
        </View>
      )}

      <View style={[styles.barBg, { height: barHeight }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              height: barHeight,
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={compact ? styles.xpTextCompact : styles.xpText}>
          {xp.toLocaleString()} XP
        </Text>
        <Text style={compact ? styles.xpTextCompact : styles.xpText}>
          {isMax ? '🏆 Max Level' : `${xpNeeded.toLocaleString()} XP to next level`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.md,
  },
  wrapCompact: {
    marginBottom: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  levelPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADII.round,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  titleText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  barBg: {
    backgroundColor: COLORS.border,
    borderRadius: RADII.round,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.round,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  xpText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  xpTextCompact: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textFaint,
  },
});
