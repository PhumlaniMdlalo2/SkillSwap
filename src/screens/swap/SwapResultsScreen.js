import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import Button from '../../components/ui/Button';
import { useSwapStore } from '../../store/swapStore';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

export default function SwapResultsScreen() {
  const { candidateId } = useLocalSearchParams();
  const { candidates } = useSwapStore();
  const candidate = candidates.find((c) => c.id === candidateId);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconWrap, animatedStyle]}>
          <Ionicons name="swap-horizontal" size={48} color={COLORS.white} />
        </Animated.View>

        <Text style={styles.title}>You've got a swap!</Text>
        <Text style={styles.subtitle}>
          You and {candidate?.name ?? 'this member'} both want to trade skills. Time to plan a session.
        </Text>

        {candidate?.photo ? <Image source={{ uri: candidate.photo }} style={styles.photo} /> : null}

        {candidate ? (
          <View style={styles.tradeCard}>
            <View style={styles.tradeRow}>
              <Ionicons name="school-outline" size={16} color={COLORS.white} />
              <Text style={styles.tradeText}>They teach {candidate.teaches}</Text>
            </View>
            <View style={styles.tradeRow}>
              <Ionicons name="bulb-outline" size={16} color={COLORS.white} />
              <Text style={styles.tradeText}>They want to learn {candidate.wantsToLearn}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button title="Keep Browsing" variant="secondary" onPress={() => router.back()} />
          <Button
            title="View Profile"
            variant="secondary"
            style={{ backgroundColor: COLORS.white }}
            onPress={() => router.replace(`/swap/${candidate?.id}`)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: RADII.round,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primaryLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: RADII.round,
    borderWidth: 4,
    borderColor: COLORS.white,
    marginBottom: SPACING.lg,
  },
  tradeCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADII.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tradeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
  actions: {
    width: '100%',
    gap: SPACING.sm,
  },
});
