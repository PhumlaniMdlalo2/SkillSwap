import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

export default function LeaveReviewScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSessionsForUser(user.user_id).then((sessions) => {
      setSession(sessions.find((s) => s.session_id === id) ?? null);
      setLoading(false);
    });
  }, [id, user]);

  if (loading) return <LoadingSpinner label="Loading session…" />;
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  const revieweeId = session.teacher_id === user.user_id ? session.learner_id : session.teacher_id;

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
      router.back();
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
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
