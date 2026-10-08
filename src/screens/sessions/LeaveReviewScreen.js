import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { gamificationService } from '../../services/gamificationService';
import { COLORS, SPACING, FONT_SIZES, RADII, ENDORSEMENT_BADGES } from '../../utils/constants';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';

export default function LeaveReviewScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: session,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSessionById(id),
    enabled: Boolean(user) && Boolean(id),
  });

  if (isPending) return <LoadingSpinner label="Loading session…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  const revieweeId = session.teacher_id === user.user_id ? session.learner_id : session.teacher_id;

  const toggleBadge = (badgeKey) => {
    setSelectedBadges((prev) =>
      prev.includes(badgeKey) ? prev.filter((k) => k !== badgeKey) : [...prev, badgeKey],
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.addReview({
        sessionId: session.session_id,
        reviewerId: user.user_id,
        revieweeId,
        rating,
        comment: comment.trim(),
      });

      if (selectedBadges.length > 0) {
        await gamificationService.giveEndorsements({
          sessionId: session.session_id,
          reviewerId: user.user_id,
          revieweeId,
          badgeKeys: selectedBadges,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['endorsements'] });
      notify('Review submitted! 🌟', 'Thank you for endorsing your partner!');
      router.back();
    } catch (err) {
      notify('Could not save your review', toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Leave a review</Text>
        <Text style={styles.subtitle}>How was "{session.skill_title}"?</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} onPress={() => setRating(value)} hitSlop={8}>
              <Ionicons
                name={value <= rating ? 'star' : 'star-outline'}
                size={36}
                color={COLORS.token}
              />
            </Pressable>
          ))}
        </View>

        <Input
          label="Comment (optional)"
          placeholder="Share details about your experience…"
          value={comment}
          onChangeText={setComment}
          multiline
        />

        {/* Skill Passport Badges */}
        <Text style={styles.badgeSectionTitle}>Endorse their strengths (optional)</Text>
        <View style={styles.badgesGrid}>
          {ENDORSEMENT_BADGES.map((badge) => {
            const isSelected = selectedBadges.includes(badge.key);
            return (
              <Pressable
                key={badge.key}
                onPress={() => toggleBadge(badge.key)}
                style={[styles.badgeChip, isSelected && styles.badgeChipActive]}
              >
                <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                <Text style={[styles.badgeLabel, isSelected && styles.badgeLabelActive]}>
                  {badge.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button title="Submit Review" onPress={handleSubmit} loading={submitting} />
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
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  stars: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  badgeSectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.round,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    gap: 4,
  },
  badgeChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  badgeLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});

