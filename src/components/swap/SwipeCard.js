import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import Badge from '../ui/Badge';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOW } from '../../utils/constants';

export default function SwipeCard({
  candidate,
  onPress,
  cardWidth,
  cardHeight,
  disabled = false,
  gesture,
  animatedStyle,
  likeOpacityStyle,
  nopeOpacityStyle,
}) {
  const dimensionStyle = { width: cardWidth, height: cardHeight };
  const photoHeight = cardHeight * 0.4;

  const content = (
    <Pressable onPress={disabled ? undefined : onPress} style={styles.pressable}>
      <View style={[styles.photoWrap, { height: photoHeight }]}>
        <Image source={{ uri: candidate.photo }} style={styles.photo} />
        <View style={styles.photoTopRow}>
          <Badge label={candidate.category} tone="neutral" />
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color={COLORS.token} />
            <Text style={styles.rating}>{candidate.rating}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{candidate.name}</Text>
          {candidate.distanceKm != null ? (
            <Text style={styles.distance}>{candidate.distanceKm} km away</Text>
          ) : null}
        </View>

        <View style={styles.tradeRow}>
          <Ionicons name="school-outline" size={16} color={COLORS.primary} />
          <Text style={styles.tradeLabel}>Teaches</Text>
          <Text style={styles.tradeValue} numberOfLines={1}>{candidate.teaches}</Text>
        </View>
        <View style={styles.tradeRow}>
          <Ionicons name="bulb-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.tradeLabel}>Wants to learn</Text>
          <Text style={styles.tradeValue} numberOfLines={1}>{candidate.wantsToLearn}</Text>
        </View>

        {candidate.bio ? (
          <Text style={styles.bio} numberOfLines={3}>{candidate.bio}</Text>
        ) : null}
      </View>

      {!disabled && (
        <>
          <Animated.View style={[styles.stamp, styles.swapStamp, likeOpacityStyle]}>
            <Ionicons name="swap-horizontal" size={18} color={COLORS.secondary} />
            <Text style={[styles.stampText, { color: COLORS.secondary }]}>SWAP</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.passStamp, nopeOpacityStyle]}>
            <Text style={[styles.stampText, { color: COLORS.danger }]}>PASS</Text>
          </Animated.View>
        </>
      )}
    </Pressable>
  );

  if (disabled || !gesture) {
    return <View style={[styles.card, dimensionStyle]}>{content}</View>;
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, dimensionStyle, animatedStyle]}>
        {content}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADII.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...SHADOW,
  },
  pressable: {
    flex: 1,
  },
  photoWrap: {
    width: '100%',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoTopRow: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(26,26,26,0.55)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADII.round,
  },
  rating: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZES.xs,
  },
  body: {
    flex: 1,
    padding: SPACING.md,
    gap: SPACING.xs + 2,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    flexShrink: 1,
  },
  distance: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tradeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
    width: 92,
  },
  tradeValue: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '700',
  },
  bio: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 19,
  },
  stamp: {
    position: 'absolute',
    top: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 3,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  swapStamp: {
    left: SPACING.lg,
    borderColor: COLORS.secondary,
    transform: [{ rotate: '-12deg' }],
  },
  passStamp: {
    right: SPACING.lg,
    borderColor: COLORS.danger,
    transform: [{ rotate: '12deg' }],
  },
  stampText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
