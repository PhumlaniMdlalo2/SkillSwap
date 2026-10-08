import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import useFocusRefetch from '../../hooks/useFocusRefetch';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';

const STATUS_TONE = {
  pending: 'warning',
  accepted: 'success',
  declined: 'danger',
  scheduled: 'success',
};

const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted — pick a time',
  declined: 'Declined',
  scheduled: 'Scheduled',
};

// The teacher never picks a time themselves — they publish open slots on the
// skill once, and the learner picks one. Reuse the shared label except for
// "accepted", where the generic wording wrongly implies the teacher has an
// action to take here.
const TEACHER_STATUS_LABEL = {
  ...STATUS_LABEL,
  accepted: 'Accepted — waiting on them',
};

export default function RequestsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: requests = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['requests', user?.user_id],
    queryFn: () => api.getRequestsForUser(user.user_id),
    enabled: Boolean(user),
  });
  useFocusRefetch(refetch, Boolean(user));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isPending) return <LoadingSpinner label="Loading requests…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const toReview = requests.filter((r) => r.teacher_id === user.user_id);
  const sent = requests.filter((r) => r.learner_id === user.user_id);

  const handleRespond = async (requestId, accept) => {
    setRespondingId(requestId);
    try {
      await api.respondToRequest({ requestId, accept });
      await queryClient.invalidateQueries({ queryKey: ['requests'] });
    } catch (err) {
      notify('Could not respond to this request', toUserMessage(err));
    } finally {
      setRespondingId(null);
    }
  };

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
        <Text style={styles.title} accessibilityRole="header">
          Requests
        </Text>

        <Text style={styles.sectionTitle}>Requests to review</Text>
        {toReview.length === 0 ? (
          <Text style={styles.emptyText} accessible>
            No one has requested to book your skills yet.
          </Text>
        ) : (
          toReview.map((request) => (
            <Card key={request.request_id} style={styles.requestCard}>
              <View style={styles.headerRow}>
                <Avatar uri={request.learner?.avatar} name={request.learner?.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {request.learner?.name ?? 'A learner'}
                  </Text>
                  <Text style={styles.skillTitle} numberOfLines={1}>
                    {request.skill?.title}
                  </Text>
                </View>
              </View>
              <Badge
                label={TEACHER_STATUS_LABEL[request.status]}
                tone={STATUS_TONE[request.status]}
              />
              {request.message ? <Text style={styles.message}>"{request.message}"</Text> : null}
              <Text style={styles.time}>{timeAgo(request.created_at)}</Text>

              {request.status === 'pending' && (
                <View style={styles.actionsRow}>
                  <Button
                    title="Decline"
                    variant="outline"
                    fullWidth={false}
                    style={{ flex: 1 }}
                    onPress={() => handleRespond(request.request_id, false)}
                    loading={respondingId === request.request_id}
                  />
                  <Button
                    title="Accept"
                    fullWidth={false}
                    style={{ flex: 1 }}
                    onPress={() => handleRespond(request.request_id, true)}
                    loading={respondingId === request.request_id}
                  />
                </View>
              )}
              {request.status === 'accepted' && (
                <Button
                  title="Manage Availability"
                  variant="outline"
                  fullWidth={false}
                  style={{ marginTop: SPACING.sm }}
                  onPress={() => router.push(`/skills/${request.skill_id}`)}
                />
              )}
            </Card>
          ))
        )}

        <Text style={styles.sectionTitle}>Your requests</Text>
        {sent.length === 0 ? (
          <Text style={styles.emptyText} accessible>
            You haven't requested to book anything yet.
          </Text>
        ) : (
          sent.map((request) => (
            <Card
              key={request.request_id}
              style={styles.requestCard}
              onPress={
                request.status === 'accepted'
                  ? () => router.push(`/requests/${request.request_id}/schedule`)
                  : undefined
              }
            >
              <View style={styles.headerRow}>
                <Avatar uri={request.teacher?.avatar} name={request.teacher?.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {request.teacher?.name ?? 'A teacher'}
                  </Text>
                  <Text style={styles.skillTitle} numberOfLines={1}>
                    {request.skill?.title}
                  </Text>
                </View>
              </View>
              <Badge label={STATUS_LABEL[request.status]} tone={STATUS_TONE[request.status]} />
              <Text style={styles.time}>{timeAgo(request.created_at)}</Text>
              {request.status === 'accepted' && (
                <Button
                  title="Pick a Time"
                  fullWidth={false}
                  style={{ marginTop: SPACING.sm }}
                  onPress={() => router.push(`/requests/${request.request_id}/schedule`)}
                />
              )}
            </Card>
          ))
        )}
      </ScrollView>
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
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  requestCard: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  skillTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  message: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  time: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
});
