import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useSwapStore } from '../../store/swapStore';
import { swapService } from '../../services/swapService';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

export default function SwapDetailsScreen() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const { candidates, currentIndex, setCurrentIndex, addSwipe, addMatch } = useSwapStore();
  const candidate = candidates.find((c) => c.id === id);

  if (!candidate) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Profile not found.</Text>
      </SafeAreaView>
    );
  }

  const handleSwap = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { matched } = await swapService.swipe(candidate.id, 'right');
      addSwipe({ targetUserId: candidate.id, direction: 'right' });
      if (matched) {
        addMatch({ userId2: candidate.id, matchedAt: new Date().toISOString() });
      }
      setCurrentIndex(currentIndex + 1);

      await queryClient.invalidateQueries({ queryKey: ['swap-candidates'] });
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      await queryClient.invalidateQueries({ queryKey: ['swipe-history'] });

      if (matched) {
        router.replace({ pathname: '/swap/results', params: { candidateId: candidate.id } });
      } else {
        router.back();
      }
    } catch (err) {
      notify('Could not record this swipe', toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Avatar uri={candidate.photo} name={candidate.name} size={72} />
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{candidate.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={COLORS.token} />
                <Text style={styles.rating}>{candidate.rating}</Text>
                {candidate.distanceKm != null ? (
                  <Text style={styles.distance}>· {candidate.distanceKm} km away</Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.tradeCard}>
            <View style={styles.tradeRow}>
              <Ionicons name="school-outline" size={18} color={COLORS.primary} />
              <Text style={styles.tradeLabel}>Teaches</Text>
              <Badge label={candidate.teaches} />
            </View>
            <View style={styles.tradeRow}>
              <Ionicons name="bulb-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.tradeLabel}>Wants to learn</Text>
              <Badge label={candidate.wantsToLearn} tone="success" />
            </View>
          </View>

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{candidate.bio}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Pass"
          variant="outline"
          fullWidth={false}
          style={styles.footerButton}
          onPress={() => router.back()}
        />
        <Button
          title="Swap Skills"
          fullWidth={false}
          style={styles.footerButton}
          onPress={handleSwap}
          loading={submitting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: SPACING.xxl,
  },
  body: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rating: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  distance: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  tradeCard: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tradeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
    width: 100,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  bio: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  footerButton: {
    flex: 1,
  },
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
