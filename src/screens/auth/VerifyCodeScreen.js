import React, { useState } from 'react';
import { Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../store/useAppHooks';
import { requestPasswordReset } from '../../services/auth';
import { toUserMessage } from '../../utils/errors';
import { notify } from '../../utils/alert';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

export default function VerifyCodeScreen() {
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : '';
  const { verifyResetCode } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reached without going through the login screen's forgot-password flow.
  if (!email) return <Redirect href="/(auth)/login" />;

  // GoTrue decides the code length (6–10 digits); never hard-code 6.
  const canSubmit = /^\d{6,10}$/.test(code.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      // Sets the session and the context user before navigating, so the
      // reset screen never observes a logged-out frame.
      await verifyResetCode(email, code.trim());
      router.replace('/reset-password');
    } catch (err) {
      setError(toUserMessage(err, 'That code is not valid. Check it and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      notify('Check your email', `We sent a new code to ${email}.`);
    } catch (err) {
      setError(toUserMessage(err, 'Could not send a new code. Please try again.'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Enter your code</Text>
          <Text style={styles.subtitle}>
            We emailed a code to {email}. Enter it below to choose a new password.
          </Text>

          <Input
            label="Verification code"
            placeholder="e.g. 482913"
            value={code}
            onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={10}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Verify code" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />

          <Button
            title={resendLoading ? 'Sending…' : 'Resend code'}
            variant="ghost"
            onPress={handleResend}
            disabled={resendLoading}
          />
          <Button
            title="Back to login"
            variant="ghost"
            onPress={() => router.replace('/(auth)/login')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
});
