import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useSwapStore } from '../../store/swapStore';
import { swapService } from '../../services/swapService';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

const FORMAT_LABELS = {
  hands_on: 'hands-on',
  visual: 'visual',
  verbal: 'verbal',
  reading: 'reading',
};

export default function SwapDetailsScreen() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const { candidates, currentIndex, setCurrentIndex } = useSwapStore();
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

  const memberYear = candidate.memberSince ? new Date(candidate.memberSince).getFullYear() : null;

  const compatTags = [
    candidate.compatPace && { key: 'pace', icon: 'speedometer-outline', label: 'Similar pace' },
    candidate.compatStructure && {
      key: 'structure',
      icon: 'list-outline',
      label: 'Same structure',
    },
    candidate.compatFormats?.length > 0 && {
      key: 'format',
      icon: 'sparkles-outline',
      label: `Shares your ${
        FORMAT_LABELS[candidate.compatFormats[0]] ?? candidate.compatFormats[0]
      } style`,
    },
  ].filter(Boolean);

  const skillTitles = Array.from(
    new Set((candidate.skills ?? []).map((skill) => skill.title).filter(Boolean)),
  );

  const wantsToLearn =
    candidate.interests?.length > 0 ? candidate.interests.join(', ') : candidate.wantsToLearn;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Swap Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <Avatar uri={candidate.photo} name={candidate.name} size={84} />
          </View>
          <Text style={styles.name}>{candidate.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={14} color={COLORS.token} />
            <Text style={styles.rating}>{candidate.rating ?? '—'}</Text>
            {candidate.reviewCount > 0 ? (
              <Text style={styles.metaText}>
                · {candidate.reviewCount} review{candidate.reviewCount === 1 ? '' : 's'}
              </Text>
            ) : null}
            {memberYear ? <Text style={styles.metaText}>· Member since {memberYear}</Text> : null}
          </View>
          {candidate.category ? (
            <View style={styles.categoryWrap}>
              <Badge label={candidate.category} tone="neutral" />
            </View>
          ) : null}
        </View>

        <View style={styles.tradeCard}>
          <TradeRow
            icon="school-outline"
            iconColor={COLORS.primary}
            iconBg={COLORS.primaryLight}
            label="Teaches"
            value={candidate.teaches}
          />
          <View style={styles.tradeDivider} />
          <TradeRow
            icon="bulb-outline"
            iconColor={COLORS.secondary}
            iconBg={COLORS.secondaryLight}
            label="Wants to learn"
            value={wantsToLearn}
          />
        </View>

        {compatTags.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why you match</Text>
            <View style={styles.tagRow}>
              {compatTags.map((tag) => (
                <View key={tag.key} style={styles.compatTag}>
                  <Ionicons name={tag.icon} size={14} color={COLORS.secondary} />
                  <Text style={styles.compatTagText}>{tag.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {skillTitles.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills offered</Text>
            <View style={styles.tagRow}>
              {skillTitles.slice(0, 6).map((title) => (
                <View key={title} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{title}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Card style={styles.aboutCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{candidate.bio?.trim() || 'No bio yet.'}</Text>
        </Card>

        <View style={styles.actions}>
          <Button
            title="Pass"
            variant="outline"
            fullWidth={false}
            style={styles.actionButton}
            icon={<Ionicons name="close" size={18} color={COLORS.primary} />}
            onPress={() => router.back()}
          />
          <Button
            title="Swap Skills"
            fullWidth={false}
            style={styles.actionButton}
            icon={<Ionicons name="swap-horizontal" size={18} color={COLORS.white} />}
            onPress={handleSwap}
            loading={submitting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TradeRow({ icon, iconColor, iconBg, label, value }) {
  return (
    <View style={styles.tradeRow}>
      <View style={[styles.tradeIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.tradeInfo}>
        <Text style={styles.tradeLabel}>{label}</Text>
        <Text style={styles.tradeValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADII.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  hero: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  avatarRing: {
    padding: 4,
    borderRadius: RADII.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  rating: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
  },
  categoryWrap: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  tradeCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tradeIcon: {
    width: 36,
    height: 36,
    borderRadius: RADII.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeInfo: {
    flex: 1,
    gap: 2,
  },
  tradeLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tradeValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  tradeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
    marginLeft: 36 + SPACING.sm,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  compatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondaryLight,
    borderRadius: RADII.round,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
  },
  compatTagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  skillChip: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADII.round,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
  },
  skillChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  aboutCard: {
    paddingBottom: SPACING.lg,
  },
  bio: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
  },
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
