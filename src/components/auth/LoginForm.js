import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

export default function LoginForm({ onSubmit, loading, error, onForgotPassword, forgotLoading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <View>
      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        label="Password"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Log In"
        onPress={() => onSubmit({ email: email.trim(), password })}
        disabled={!canSubmit}
        loading={loading}
        style={{ marginTop: SPACING.sm }}
      />
      {onForgotPassword ? (
        <Pressable
          onPress={() => onForgotPassword(email.trim())}
          disabled={forgotLoading}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          style={styles.forgotWrap}
        >
          <Text style={styles.forgotText}>
            {forgotLoading ? 'Sending code…' : 'Forgot password?'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  forgotWrap: {
    alignSelf: 'center',
    marginTop: SPACING.sm + 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
