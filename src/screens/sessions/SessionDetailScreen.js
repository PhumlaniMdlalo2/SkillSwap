import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import QRCodeDisplay from '../../components/sessions/QRCodeDisplay';
import AddToCalendarModal from '../../components/sessions/AddToCalendarModal';
import { useAuth, useWallet } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { gamificationService } from '../../services/gamificationService';
import { COLORS, SPACING, FONT_SIZES, SESSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate, formatTime, formatDuration } from '../../utils/helpers';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';

const STATUS_TONE = { pending: 'warning', completed: 'success', cancelled: 'danger' };

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { refresh: refreshWallet } = useWallet();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const finalizedIdsRef = useRef(new Set());

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

  // Lazy 72h sweep: any pending session whose confirmation deadline has passed
  // auto-completes the moment someone opens it, so the ghosted partner can't
  // stall the eager side indefinitely. Runs once per session id.
  useEffect(() => {
    if (!user || !session || session.status !== 'pending') return;
    if (finalizedIdsRef.current.has(id)) return;
    finalizedIdsRef.current.add(id);
    let cancelled = false;
    api
      .finalizeStaleSessions()
      .then(() => {
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          queryClient.invalidateQueries({ queryKey: ['session', id] });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, session, id, queryClient]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isPending) return <LoadingSpinner label="Loading session…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  const isTeacher = session.teacher_id === user.user_id;
  const myCheckedIn = isTeacher
    ? Boolean(session.teacher_checked_in_at)
    : Boolean(session.learner_checked_in_at);
  const partnerCheckedIn = isTeacher
    ? Boolean(session.learner_checked_in_at)
    : Boolean(session.teacher_checked_in_at);
  const bothCheckedIn =
    Boolean(session.teacher_checked_in_at) && Boolean(session.learner_checked_in_at);
  const myConfirmed = isTeacher
    ? Boolean(session.teacher_confirmed_at)
    : Boolean(session.learner_confirmed_at);
  const partnerConfirmed = isTeacher
    ? Boolean(session.learner_confirmed_at)
    : Boolean(session.teacher_confirmed_at);
  const bothConfirmed = myConfirmed && partnerConfirmed;
  const partnerLabel = isTeacher ? 'learner' : 'teacher';

  const handleConfirmTrade = async () => {
    setBusy(true);
    try {
      await api.confirmSessionSide(session.session_id);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      notify('Trade confirmed 🤝', 'Your partner still needs to confirm for the session to complete.');
    } catch (err) {
      notify('Could not confirm trade', toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    setBusy(true);
    try {
      await api.completeSession(session.session_id);
      try {
        await gamificationService.awardXpAndStreak(user.user_id, 100);
      } catch (_xpErr) {
        // Non-blocking gamification award
      }
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      await queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      await refreshWallet();
      notify(
        'Session completed! 🎉',
        'You earned +100 XP, extended your weekly streak, and earned a time token!',
      );
    } catch (err) {
      notify('Could not complete session', toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await api.cancelSession(session.session_id);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      await refreshWallet();
    } catch (err) {
      notify('Could not cancel session', toUserMessage(err));
    } finally {
      setBusy(false);
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
        <Badge
          label={SESSION_STATUS_LABELS[session.status] ?? session.status}
          tone={STATUS_TONE[session.status]}
        />
        <Text style={styles.title} accessibilityRole="header">
          {session.skill_title}
        </Text>
        <Text style={styles.meta}>
          {formatDate(session.session_date)} · {formatTime(session.session_date)} ·{' '}
          {formatDuration(session.duration)}
        </Text>
        <Text style={styles.role}>
          You are the {isTeacher ? 'teacher' : 'learner'} for this session.
        </Text>

        {session.status === 'pending' && (
          <View style={styles.qrSection}>
            <QRCodeDisplay
              session={session}
              role={isTeacher ? 'teacher' : 'learner'}
              counterpartLabel={partnerLabel}
            />
          </View>
        )}

        {session.status === 'pending' && (
          <View style={styles.checkin}>
            <Text style={styles.checkinTitle}>Check in</Text>
            <Text style={styles.checkinRow}>
              You: {myCheckedIn ? '✅ Checked in' : 'Not checked in yet'}
            </Text>
            <Text style={styles.checkinRow}>
              Your {partnerLabel}: {partnerCheckedIn ? '✅ Checked in' : 'Not checked in yet'}
            </Text>
          </View>
        )}

        {session.status === 'pending' && (
          <View style={styles.checkin}>
            <Text style={styles.checkinTitle}>Confirm the skill trade</Text>
            <Text style={styles.checkinRow}>
              You: {myConfirmed ? '✅ Confirmed' : 'Not confirmed yet'}
            </Text>
            <Text style={styles.checkinRow}>
              Your {partnerLabel}: {partnerConfirmed ? '✅ Confirmed' : 'Not confirmed yet'}
            </Text>
            {!myCheckedIn ? (
              <Text style={styles.checkinHint}>Check in first, then confirm the trade.</Text>
            ) : !myConfirmed ? (
              <Button
                title="I confirm the trade happened 🤝"
                onPress={handleConfirmTrade}
                loading={busy}
              />
            ) : partnerConfirmed ? (
              <Text style={styles.checkinHint}>
                Trade confirmed by both sides — ready to complete.
              </Text>
            ) : (
              <Text style={styles.checkinHint}>
                Waiting for your {partnerLabel} to confirm. If they never do, this
                auto-completes 72h after check-in.
              </Text>
            )}
          </View>
        )}

        {session.status === 'pending' && (
          <View style={styles.actions}>
            <Button
              title={`Scan your ${partnerLabel}'s code 📷`}
              onPress={() => router.push(`/sessions/${session.session_id}/check-in`)}
            />
            <Button
              title="Add to Calendar 📅"
              variant="secondary"
              onPress={() => setShowCalendarModal(true)}
            />
            {isTeacher && (
              <>
                <Button
                  title={
                    bothCheckedIn && bothConfirmed
                      ? 'Mark as Completed'
                      : bothCheckedIn
                        ? 'Waiting for both confirmations…'
                        : 'Waiting for both check-ins…'
                  }
                  onPress={handleComplete}
                  loading={busy}
                  disabled={!(bothCheckedIn && bothConfirmed)}
                />
                {!(bothCheckedIn && bothConfirmed) && (
                  <Text style={styles.checkinHint}>
                    {bothCheckedIn
                      ? 'Both of you must confirm the trade before completion (auto-completes 72h after check-in).'
                      : 'Both of you must scan each other&apos;s code before this session can be completed.'}
                  </Text>
                )}
              </>
            )}
            <Button title="Cancel Session" variant="danger" onPress={handleCancel} loading={busy} />
          </View>
        )}

        {session.status === 'completed' && (
          <Button
            title="Leave a Review"
            onPress={() => router.push(`/sessions/${session.session_id}/review`)}
            style={{ marginTop: SPACING.lg }}
          />
        )}
      </ScrollView>

      <AddToCalendarModal
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        session={session}
        isTeacher={isTeacher}
      />
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
    marginTop: SPACING.sm,
  },
  meta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  role: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.lg,
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  checkin: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 4,
    marginBottom: SPACING.lg,
  },
  checkinTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  checkinRow: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  checkinHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: -SPACING.xs,
  },
  actions: {
    gap: SPACING.sm,
  },
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
