import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import QRCodeDisplay from '../../components/sessions/QRCodeDisplay';
import { useAuth, useWallet } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, SESSION_STATUS_LABELS } from '../../utils/constants';
import { formatDate, formatTime, formatDuration } from '../../utils/helpers';
import { notify } from '../../utils/alert';

const STATUS_TONE = { pending: 'warning', completed: 'success', cancelled: 'danger' };

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { refresh: refreshWallet } = useWallet();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const sessions = await api.getSessionsForUser(user.user_id);
    setSession(sessions.find((s) => s.session_id === id) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading session…" />;
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  const isTeacher = session.teacher_id === user.user_id;

  const handleComplete = async () => {
    setBusy(true);
    try {
      await api.completeSession(session.session_id);
      await refreshWallet();
      await load();
      notify('Session completed', 'You just earned a time token!');
    } catch (err) {
      notify('Could not complete session', err.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await api.cancelSession(session.session_id);
      await load();
    } catch (err) {
      notify('Could not cancel session', err.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Badge label={SESSION_STATUS_LABELS[session.status] ?? session.status} tone={STATUS_TONE[session.status]} />
        <Text style={styles.title}>{session.skill_title}</Text>
        <Text style={styles.meta}>
          {formatDate(session.session_date)} · {formatTime(session.session_date)} · {formatDuration(session.duration)}
        </Text>
        <Text style={styles.role}>You are the {isTeacher ? 'teacher' : 'learner'} for this session.</Text>

        {session.status === 'pending' && (
          <View style={styles.qrSection}>
            <QRCodeDisplay session={session} counterpartLabel={isTeacher ? 'learner' : 'teacher'} />
          </View>
        )}

        {session.status === 'pending' && (
          <View style={styles.actions}>
            {isTeacher && (
              <Button title="Mark as Completed" onPress={handleComplete} loading={busy} />
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
  actions: {
    gap: SPACING.sm,
  },
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
