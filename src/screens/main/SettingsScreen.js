import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import { useAuth } from '../../store/useAppHooks';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';
import { confirmAction } from '../../utils/alert';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [sessionReminders, setSessionReminders] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  const handleLogout = () => {
    confirmAction('Log out', 'Are you sure you want to log out?', {
      confirmText: 'Log out',
      destructive: true,
      onConfirm: logout,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="notifications-outline"
            label="Session reminders"
            value={sessionReminders}
            onValueChange={setSessionReminders}
          />
          <ToggleRow
            icon="heart-outline"
            label="Swipe match alerts"
            value={matchNotifications}
            onValueChange={setMatchNotifications}
          />
        </View>

        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="eye-outline"
            label="Public profile"
            value={publicProfile}
            onValueChange={setPublicProfile}
          />
        </View>

        <Button title="Log out" variant="danger" onPress={handleLogout} style={{ marginTop: SPACING.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ icon, label, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={COLORS.text} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
        thumbColor={value ? COLORS.primary : COLORS.surface}
      />
    </View>
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
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
});
