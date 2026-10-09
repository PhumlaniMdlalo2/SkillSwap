import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';

export default function CheckInScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const handledRef = useRef(false);

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
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  const myRole = session.teacher_id === user.user_id ? 'teacher' : 'learner';
  const partnerLabel = myRole === 'teacher' ? 'learner' : 'teacher';

  const handleScanned = async ({ data }) => {
    if (busy || handledRef.current) return;

    let payload;
    try {
      payload = JSON.parse(data);
    } catch (_err) {
      return; // not one of our codes — keep scanning
    }
    if (payload?.type !== 'skillswap-session-checkin' || !payload.sessionId) return;

    if (payload.sessionId !== id) {
      handledRef.current = true;
      notify('Wrong code', 'That check-in code belongs to a different session.');
      setTimeout(() => {
        handledRef.current = false;
      }, 1500);
      return;
    }

    if (
      typeof payload.codeExp !== 'number' ||
      Math.floor(Date.now() / 1000) - payload.codeExp > 15
    ) {
      notify('Expired code', 'That code has expired. Ask your partner to show a fresh one.');
      return;
    }

    if (payload.ownerRole !== partnerLabel) {
      handledRef.current = true;
      notify('That is your own code', `Ask your ${partnerLabel} to show their code instead.`);
      setTimeout(() => {
        handledRef.current = false;
      }, 1500);
      return;
    }

    handledRef.current = true;
    setBusy(true);
    try {
      await api.checkInSession({ sessionId: id, ownerRole: payload.ownerRole, codeExp: payload.codeExp });
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      notify('Checked in', 'Your attendance has been recorded.');
      router.back();
    } catch (err) {
      notify('Could not check in', toUserMessage(err));
      handledRef.current = false;
    } finally {
      setBusy(false);
    }
  };

  if (!permission) return <LoadingSpinner label="Preparing camera…" />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.muted}>
          SkillSwap uses your camera to scan your {partnerLabel}&apos;s check-in code.
        </Text>
        <Button title="Allow camera" onPress={requestPermission} style={styles.button} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : handleScanned}
      />
      <SafeAreaView style={styles.overlay} edges={['bottom']}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Point the camera at your {partnerLabel}&apos;s QR code</Text>
        {busy && <ActivityIndicator color={COLORS.white} style={styles.spinner} />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: SPACING.lg,
  },
  frame: {
    width: 220,
    height: 220,
    borderRadius: RADII.lg,
    borderWidth: 3,
    borderColor: COLORS.white,
    marginBottom: SPACING.xl,
  },
  hint: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  spinner: {
    marginTop: SPACING.md,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  muted: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: SPACING.lg,
  },
});
