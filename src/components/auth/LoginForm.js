import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

export default function LoginForm({ onSubmit, loading, error }) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
});
