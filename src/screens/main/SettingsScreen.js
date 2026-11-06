import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/ui/Button';
import { useAuth } from '../../store/useAppHooks';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';
import { confirmAction } from '../../utils/alert';

export default function SettingsScreen() {
  const { logout } = useAuth();

  const handleLogout = useCallback(() => {
    confirmAction('Log out', 'Are you sure you want to log out?', {
      confirmText: 'Log out',
      destructive: true,
      onConfirm: logout,
    });
  }, [logout]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.card}>
          <Text style={styles.note}>
            Notification and privacy controls aren&apos;t available yet.
          </Text>
        </View>
        <Button title="Log out" variant="danger" onPress={handleLogout} style={styles.logout} />
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
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  note: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  logout: {
    marginTop: SPACING.lg,
  },
});
