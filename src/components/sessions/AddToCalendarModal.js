import React from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import {
  openGoogleCalendar,
  openOutlookCalendar,
  generateIcsContent,
} from '../../utils/calendar';
import { notify } from '../../utils/alert';

export default function AddToCalendarModal({
  visible,
  onClose,
  session,
  isTeacher,
}) {
  if (!session) return null;

  const handleGoogle = async () => {
    try {
      await openGoogleCalendar(session, isTeacher);
      onClose();
    } catch (_err) {
      notify('Error', 'Could not open Google Calendar.');
    }
  };

  const handleOutlook = async () => {
    try {
      await openOutlookCalendar(session, isTeacher);
      onClose();
    } catch (_err) {
      notify('Error', 'Could not open Outlook Calendar.');
    }
  };

  const handleIcsDownload = () => {
    try {
      const ics = generateIcsContent(session, isTeacher);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const cleanTitle = (session.skill_title || 'session').replace(/[^a-zA-Z0-9]/g, '_');
        link.setAttribute('download', `${cleanTitle}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        notify('Downloaded! 📅', '.ics calendar file downloaded.');
      } else {
        // Fallback to Google Calendar on mobile if file system write is not needed
        handleGoogle();
      }
      onClose();
    } catch (_err) {
      notify('Error', 'Could not download calendar file.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Add to Calendar 📅</Text>
            <Text style={styles.subtitle}>Never miss your upcoming skill exchange.</Text>
          </View>

          <View style={styles.optionsList}>
            <Pressable
              style={styles.optionRow}
              onPress={handleGoogle}
              accessibilityRole="button"
            >
              <View style={[styles.iconWrap, { backgroundColor: '#E8F0FE' }]}>
                <Ionicons name="logo-google" size={20} color="#1A73E8" />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>Google Calendar</Text>
                <Text style={styles.optionSubtitle}>Open in Google Calendar app or browser</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
            </Pressable>

            <Pressable
              style={styles.optionRow}
              onPress={handleOutlook}
              accessibilityRole="button"
            >
              <View style={[styles.iconWrap, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="calendar-outline" size={20} color="#0078D4" />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>Outlook Calendar</Text>
                <Text style={styles.optionSubtitle}>Open in Outlook Online</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
            </Pressable>

            {Platform.OS === 'web' && (
              <Pressable
                style={styles.optionRow}
                onPress={handleIcsDownload}
                accessibilityRole="button"
              >
                <View style={[styles.iconWrap, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="download-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionTitle}>Apple / iCal (.ics)</Text>
                  <Text style={styles.optionSubtitle}>Download standard calendar file</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
              </Pressable>
            )}
          </View>

          <Pressable style={styles.cancelBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  optionsList: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADII.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  cancelBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
