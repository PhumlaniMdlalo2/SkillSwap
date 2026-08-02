import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../../utils/constants';

export default function QRCodeDisplay({ session, size = 200, counterpartLabel = 'session partner' }) {
  const payload = JSON.stringify({
    sessionId: session.session_id,
    type: 'skillswap-session-checkin',
  });

  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        <QRCode value={payload} size={size} color={COLORS.text} backgroundColor={COLORS.white} />
      </View>
      <Text style={styles.hint}>Show this code to your {counterpartLabel} to check in</Text>
      <Text style={styles.code}>{session.session_id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  qrWrapper: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  code: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
    letterSpacing: 1,
  },
});
