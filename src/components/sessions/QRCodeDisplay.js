import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../../utils/constants';
import * as api from '../../services/api';

const REFRESH_MS = 15000;

export default function QRCodeDisplay({
  session,
  size = 200,
  counterpartLabel = 'session partner',
}) {
  const [codeData, setCodeData] = useState(null);

  const loadCode = useCallback(async () => {
    try {
      setCodeData(await api.createCheckInCode(session.session_id));
    } catch (_err) {
      setCodeData(null);
    }
  }, [session.session_id]);

  useEffect(() => {
    loadCode();
    const timer = setInterval(loadCode, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadCode]);

  const payload = codeData
    ? JSON.stringify({
        sessionId: session.session_id,
        ownerRole: codeData.owner_role,
        type: 'skillswap-session-checkin',
        code: codeData.code,
      })
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        {payload ? (
          <QRCode value={payload} size={size} color={COLORS.text} backgroundColor={COLORS.white} />
        ) : (
          <Text style={styles.footnote}>Generating a secure code…</Text>
        )}
      </View>
      <Text style={styles.hint}>Show this code to your {counterpartLabel} to check in</Text>
      <Text style={styles.footnote}>
        The code refreshes automatically — a screenshot expires after 90 seconds.
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
