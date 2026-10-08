import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: profile,
    isPending: profilePending,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.getUserById(id),
    enabled: Boolean(id),
  });

  const {
    data: skills = [],
    isPending: skillsPending,
    error: skillsError,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: ['skills', id],
    queryFn: () => api.getSkillsByUser(id),
    enabled: Boolean(id),
  });

  const {
    data: reviews = [],
    isPending: reviewsPending,
    error: reviewsError,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api.getReviewsForUser(id),
    enabled: Boolean(id),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchProfile(), refetchSkills(), refetchReviews()]);
    } finally {
      setRefreshing(false);
    }
  };

  if (profilePending || skillsPending || reviewsPending)
    return <LoadingSpinner label="Loading profile…" />;
  if (profileError || skillsError || reviewsError) {
    const retryFailed = () => {
      if (profileError) refetchProfile();
      if (skillsError) refetchSkills();
      if (reviewsError) refetchReviews();
    };
    return <ErrorState error={profileError ?? skillsError ?? reviewsError} onRetry={retryFailed} />;
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>This person couldn't be found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          )
        }
      >
        <View style={styles.header}>
          <Avatar uri={profile.avatar} name={profile.name} size={84} />
          <Text style={styles.name} accessibilityRole="header">
            {profile.name}
          </Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <Stat value={profile.rating ?? '—'} label="Rating" icon="star" />
          <Stat value={reviews.length} label="Reviews" icon="chatbubble-ellipses" />
          <Stat value={skills.length} label="Skills taught" icon="ribbon" />
        </View>

        <Text style={styles.sectionTitle}>Skills</Text>
        {skills.length === 0 ? (
          <Text style={styles.emptyText} accessible>
            Hasn't listed any skills yet.
          </Text>
        ) : (
          skills.map((skill) => (
            <Card
              key={skill.skill_id}
              onPress={() => router.push(`/skills/${skill.skill_id}`)}
              style={styles.skillCard}
            >
              <Badge label={skill.category} />
              <Text style={styles.skillTitle}>{skill.title}</Text>
            </Card>
          ))
        )}

        <Text style={styles.sectionTitle}>Reviews</Text>
        {reviews.length === 0 ? (
          <Text style={styles.emptyText} accessible>
            No reviews yet.
          </Text>
        ) : (
          reviews.map((review) => (
            <Card key={review.review_id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Avatar uri={review.reviewer?.avatar} name={review.reviewer?.name} size={28} />
                <Text style={styles.reviewerName}>
                  {review.reviewer?.name ?? 'SkillSwap member'}
                </Text>
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={12} color={COLORS.token} />
                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                </View>
              </View>
              {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
              <Text style={styles.reviewTime}>{timeAgo(review.created_at)}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, icon }) {
  return (
    <Card style={styles.statCard}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  bio: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
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
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  skillCard: {
    marginBottom: SPACING.sm,
    gap: 6,
  },
  skillTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewCard: {
    marginBottom: SPACING.sm,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reviewerName: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewComment: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  reviewTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
  },
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
