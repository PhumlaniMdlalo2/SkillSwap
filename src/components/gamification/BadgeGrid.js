import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Share, Platform } from 'react-native';
import Modal from '../ui/Modal';
import { COLORS, SPACING, FONT_SIZES, RADII, ENDORSEMENT_BADGES } from '../../utils/constants';

/**
 * Badge detail modal — shows badge definition, count, and share button.
 */
function BadgeDetailModal({ visible, onClose, badge }) {
  if (!badge) return null;

  const handleShare = async () => {
    const message = `🏅 I earned the "${badge.label}" ${badge.emoji} badge ${badge.count} time${badge.count === 1 ? '' : 's'} on SkillSwap!`;
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ text: message });
        } else {
          await navigator.clipboard.writeText(message);
        }
      } else {
        await Share.share({ message });
      }
    } catch {
      // User cancelled or share failed
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Badge Details">
      <View style={modalStyles.content}>
        <View style={modalStyles.emojiCircle}>
          <Text style={modalStyles.bigEmoji}>{badge.emoji}</Text>
        </View>
        <Text style={modalStyles.badgeName}>{badge.label}</Text>
        <Text style={modalStyles.description}>{getBadgeDescription(badge.key)}</Text>

        <View style={modalStyles.statRow}>
          <View style={modalStyles.statBox}>
            <Text style={modalStyles.statValue}>×{badge.count}</Text>
            <Text style={modalStyles.statLabel}>Times earned</Text>
          </View>
          <View style={modalStyles.statBox}>
            <Text style={modalStyles.statValue}>{getBadgeRarity(badge.count)}</Text>
            <Text style={modalStyles.statLabel}>Rarity</Text>
          </View>
        </View>

        <Pressable style={modalStyles.shareButton} onPress={handleShare}>
          <Text style={modalStyles.shareButtonText}>Share Badge 🔗</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/**
 * BadgeGrid — displays all endorsement badges with counts.
 * Tapping a badge opens the detail modal.
 *
 * Props:
 *   endorsements — array of { key, label, emoji, count }
 *   showAll      — if true, shows unearned badges greyed out too
 */
export default function BadgeGrid({ endorsements = [], showAll = false }) {
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Merge endorsements with full badge catalog
  const countMap = {};
  for (const e of endorsements) {
    countMap[e.key] = e.count || 0;
  }

  const badges = ENDORSEMENT_BADGES.map((b) => ({
    ...b,
    count: countMap[b.key] || 0,
  }));

  const displayed = showAll ? badges : badges.filter((b) => b.count > 0);

  if (displayed.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>
          No badges yet. Complete sessions and get endorsements from your partners!
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.grid}>
        {displayed.map((badge) => {
          const earned = badge.count > 0;
          return (
            <Pressable
              key={badge.key}
              style={[styles.badgeCard, !earned && styles.badgeCardUnearned]}
              onPress={() => setSelectedBadge(badge)}
              accessibilityRole="button"
              accessibilityLabel={`${badge.label}: earned ${badge.count} times`}
            >
              <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiUnearned]}>
                {badge.emoji}
              </Text>
              <Text
                style={[styles.badgeLabel, !earned && styles.badgeLabelUnearned]}
                numberOfLines={2}
              >
                {badge.label}
              </Text>
              {earned ? (
                <View style={styles.countTag}>
                  <Text style={styles.countText}>×{badge.count}</Text>
                </View>
              ) : (
                <Text style={styles.lockedText}>🔒</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <BadgeDetailModal
        visible={Boolean(selectedBadge)}
        onClose={() => setSelectedBadge(null)}
        badge={selectedBadge}
      />
    </>
  );
}

// ─── Badge Descriptions ──────────────────────────────────────────────

function getBadgeDescription(key) {
  const descriptions = {
    explains_simply: 'Awarded to teachers who break down complex topics into easy, digestible explanations.',
    infinite_patience: 'Given to partners who show exceptional patience — never rushing, always encouraging.',
    super_punctual: 'For those who always show up on time, respecting everyone\'s schedule.',
    practical_exercises: 'Earned by teachers who create engaging, hands-on exercises that make learning stick.',
    conversational_pro: 'For partners who keep sessions lively, interactive, and conversational.',
    hands_on: 'Awarded to those who focus on practical, real-world applications over theory.',
  };
  return descriptions[key] || 'An endorsement badge earned from session partners.';
}

function getBadgeRarity(count) {
  if (count >= 20) return '💎 Legendary';
  if (count >= 10) return '🌟 Epic';
  if (count >= 5) return '✨ Rare';
  if (count >= 1) return '🟢 Common';
  return '⬜ Locked';
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeCard: {
    width: '30%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 4,
    minHeight: 100,
  },
  badgeCardUnearned: {
    opacity: 0.45,
    backgroundColor: COLORS.background,
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeEmojiUnearned: {
    opacity: 0.5,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  badgeLabelUnearned: {
    color: COLORS.textFaint,
  },
  countTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.round,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  lockedText: {
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: SPACING.md,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  bigEmoji: {
    fontSize: 36,
  },
  badgeName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.md,
  },
  shareButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
});
