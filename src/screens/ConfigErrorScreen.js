import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../utils/constants';

// Shown instead of the app whenever Supabase isn't configured. The app has
// no offline/mock mode — every screen expects a real backend, so failing
// loudly here beats a confusing null-pointer crash three screens deep.
export default function ConfigErrorScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="server-outline" size={32} color={COLORS.danger} />
        </View>
        <Text style={styles.title}>Backend not configured</Text>
        <Text style={styles.body}>
          SkillSwap needs a Supabase project to run — there's no offline or demo mode. Create a{' '}
          <Text style={styles.mono}>.env</Text> file in the project root with:
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</Text>
          <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</Text>
        </View>
        <Text style={styles.body}>
          Both values are in your Supabase dashboard under <Text style={styles.bold}>Settings → API</Text>.
          Then run <Text style={styles.mono}>schema.sql</Text> (and the numbered migrations after it) from{' '}
          <Text style={styles.mono}>supabase/migrations/</Text> in the SQL Editor, and restart the dev server
          with <Text style={styles.mono}>npx expo start --clear</Text>.
        </Text>
        <Text style={styles.hint}>See README.md for the full setup walkthrough.</Text>
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
    paddingTop: SPACING.xxl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADII.round,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  body: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  mono: {
    fontFamily: 'monospace',
    color: COLORS.text,
    fontWeight: '700',
  },
  bold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  codeBlock: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
  },
  hint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textFaint,
  },
});
