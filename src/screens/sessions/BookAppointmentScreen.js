import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useWallet } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';
import { formatTime, groupSlotsByDay } from '../../utils/helpers';
import { notify } from '../../utils/alert';

export default function BookAppointmentScreen() {
  const { id } = useLocalSearchParams();
  const { balance, refresh: refreshWallet } = useWallet();

  const [request, setRequest] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  const groupedSlots = useMemo(() => groupSlotsByDay(slots), [slots]);

  // Tap a slot to start a run, tap the hour right before/after it to
  // extend that run — this is how a 2-3 hour session gets booked as one
  // contiguous block instead of picking a single hour.
  const handleSelectSlot = (slot, daySlots) => {
    setSelectedSlots((prev) => {
      const sameDay = prev.length > 0 && daySlots.some((s) => s.availability_id === prev[0].availability_id);
      if (!sameDay) return [slot];

      const alreadySelected = prev.some((s) => s.availability_id === slot.availability_id);
      if (alreadySelected) return [slot];

      const first = prev[0];
      const last = prev[prev.length - 1];
      if (slot.end_time === first.start_time) return [slot, ...prev];
      if (slot.start_time === last.end_time) return [...prev, slot];
      return [slot];
    });
  };

  useEffect(() => {
    api.getRequestById(id).then((requestData) => {
      setRequest(requestData);
      if (requestData) {
        api.getAvailabilityForSkill(requestData.skill_id).then((data) => {
          setSlots(data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [id]);

  const handleSchedule = async () => {
    if (selectedSlots.length === 0) return;
    if (balance < selectedSlots.length) {
      notify('Not enough tokens', "You don't have enough time tokens to book this session.");
      return;
    }
    setScheduling(true);
    try {
      await api.scheduleSession({
        requestId: request.request_id,
        availabilityIds: selectedSlots.map((s) => s.availability_id),
      });
      await refreshWallet();
      notify('Session confirmed!', `Your session for "${request.skill?.title}" is booked.`, () => router.replace('/(tabs)'));
    } catch (err) {
      notify('Could not confirm this time', err.message ?? 'Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading available times…" />;

  if (!request || request.status !== 'accepted') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>
          {request ? 'This request is not ready to schedule yet.' : 'Request not found.'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Pick a time</Text>

        <View style={styles.teacherRow}>
          <Avatar uri={request.teacher?.avatar} name={request.teacher?.name} size={40} />
          <View>
            <Text style={styles.teacherName}>{request.teacher?.name}</Text>
            <Text style={styles.skillTitle}>{request.skill?.title}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Open times</Text>
        {slots.length === 0 ? (
          <Text style={styles.emptyText}>
            {request.teacher?.name ?? 'They'} haven't published any open times yet — check back soon.
          </Text>
        ) : (
          <>
            <Text style={styles.hintText}>
              Tap a time to start, then tap the next hour to extend your session.
            </Text>
            {groupedSlots.map((group) => (
              <View key={group.key} style={styles.dayGroup}>
                <Text style={styles.dayGroupHeader}>{group.label}</Text>
                <View style={styles.slotList}>
                  {group.slots.map((slot) => {
                    const isSelected = selectedSlots.some((s) => s.availability_id === slot.availability_id);
                    return (
                      <Pressable
                        key={slot.availability_id}
                        onPress={() => handleSelectSlot(slot, group.slots)}
                        style={[styles.slot, isSelected && styles.slotSelected]}
                      >
                        <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                          {formatTime(slot.start_time)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.costLabel}>Cost</Text>
          <Text style={styles.costValue}>
            {selectedSlots.length > 0 ? `${selectedSlots.length} token${selectedSlots.length === 1 ? '' : 's'}` : '—'}
          </Text>
        </View>
        <Button
          title="Confirm Session"
          onPress={handleSchedule}
          disabled={selectedSlots.length === 0}
          loading={scheduling}
          fullWidth={false}
          style={styles.confirmButton}
        />
      </View>
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
    marginBottom: SPACING.md,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  teacherName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  skillTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  dayGroup: {
    marginBottom: SPACING.md,
  },
  dayGroupHeader: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  hintText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
    marginBottom: SPACING.md,
  },
  slotList: {
    gap: SPACING.sm,
  },
  slot: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  slotSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  slotText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  slotTextSelected: {
    color: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  costLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  costValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  confirmButton: {
    paddingHorizontal: SPACING.xl,
  },
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
