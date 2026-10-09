import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../../utils/constants';

const CODE_TTL_SECONDS = 60;
const REFRESH_MS = 15000;

function payloadFor(sessionId, role) {
  return JSON.stringify({
    sessionId,
    ownerRole: role,
    type: 'skillswap-session-checkin',
    codeExp: Math.floor(Date.now() / 1000) + CODE_TTL_SECONDS,
  });
}

export default function QRCodeDisplay({
  session,
  role,
  size = 200,
  counterpartLabel = 'session partner',
}) {
  const [, refreshQr] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => refreshQr((n) => n + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const payload = payloadFor(session.session_id, role);

  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        <QRCode value={payload} size={size} color={COLORS.text} backgroundColor={COLORS.white} />
      </View>
      <Text style={styles.hint}>Show this code to your {counterpartLabel} to check in</Text>
      <Text style={styles.footnote}>
        The code refreshes automatically — a screenshot expires in {CODE_TTL_SECONDS}s.
      </Text>
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
  footnote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
    textAlign: 'center',
  },
  code: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
    letterSpacing: 1,
  },
});
