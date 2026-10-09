import React, { useState } from 'react';
import { Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../store/useAppHooks';
import { updatePassword } from '../../services/auth';
import { toUserMessage } from '../../utils/errors';
import { notify } from '../../utils/alert';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

export default function ResetPasswordScreen() {
  const { isAuthenticated, initializing } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // The recovery deep link may still be resolving into a session — hold on
  // the spinner rather than bouncing to login before that finishes.
  if (initializing) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  const canSubmit = password.length >= 6 && password === confirmPassword;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await updatePassword(password);
      notify('Password updated', 'Your new password is active from now on.');
      router.replace('/(tabs)');
    } catch (err) {
      setError(toUserMessage(err, 'Could not update your password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.subtitle}>Pick something you haven't used here before.</Text>

          <Input
            label="New password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Input
            label="Confirm password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={
              confirmPassword.length > 0 && confirmPassword !== password
                ? 'Passwords do not match'
                : undefined
            }
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Save new password"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
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
