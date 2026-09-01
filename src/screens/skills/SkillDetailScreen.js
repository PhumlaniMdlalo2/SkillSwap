import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, RADII, DEFAULT_SESSION_TOKEN_COST } from '../../utils/constants';
import { formatTime, groupSlotsByDay } from '../../utils/helpers';
import { notify } from '../../utils/alert';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

function formatHour(hour) {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

function parseHour(timeString) {
  return parseInt(timeString.split(':')[0], 10);
}

function emptyWeeklyHours() {
  return Object.fromEntries(DAYS.map((d) => [d.value, { open: false, startHour: 9, endHour: 17 }]));
}

export default function SkillDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [skill, setSkill] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  const [weeklyHours, setWeeklyHours] = useState(emptyWeeklyHours);
  const [hoursLoaded, setHoursLoaded] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);

  const isOwner = Boolean(user && skill && skill.user_id === user.user_id);

  const load = () => {
    Promise.all([
      api.getSkillById(id),
      isOwner ? api.getAllAvailabilityForSkill(id) : Promise.resolve([]),
      isOwner ? api.getAvailabilityHours(id) : Promise.resolve([]),
    ])
      .then(([skillData, slots, hours]) => {
        setSkill(skillData);
        setAvailability(slots);
        if (isOwner) {
          const next = emptyWeeklyHours();
          hours.forEach((h) => {
            next[h.day_of_week] = {
              open: true,
              startHour: parseHour(h.start_time),
              endHour: parseHour(h.end_time),
            };
          });
          setWeeklyHours(next);
          setHoursLoaded(true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isOwner]);

  // Keeps the rolling booking window advancing every time the teacher opens
  // this page, without needing a cron job — generation is idempotent
  // (ON CONFLICT DO NOTHING server-side), so this is a cheap no-op most of
  // the time.
  useEffect(() => {
    if (!isOwner || !skill?.skill_id) return;
    api
      .generateAvailabilitySlots(skill.skill_id)
      .then(() => api.getAllAvailabilityForSkill(skill.skill_id))
      .then(setAvailability)
      .catch(() => {});
  }, [isOwner, skill?.skill_id]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await api.requestSession({
        skillId: skill.skill_id,
        message: message.trim() || undefined,
      });
      notify(
        'Request sent!',
        `${skill.teacher?.name ?? 'The teacher'} will review your request. You'll be able to pick a time once they accept.`,
        () => router.push('/requests')
      );
    } catch (err) {
      notify('Could not send request', err.message ?? 'Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const handleToggleDay = (dayValue) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], open: !prev[dayValue].open },
    }));
  };

  const handleChangeStartHour = (dayValue, hour) => {
    setWeeklyHours((prev) => {
      const day = prev[dayValue];
      const endHour = hour >= day.endHour ? Math.min(hour + 1, HOURS[HOURS.length - 1]) : day.endHour;
      return { ...prev, [dayValue]: { ...day, startHour: hour, endHour } };
    });
  };

  const handleChangeEndHour = (dayValue, hour) => {
    setWeeklyHours((prev) => {
      const day = prev[dayValue];
      if (hour <= day.startHour) return prev;
      return { ...prev, [dayValue]: { ...day, endHour: hour } };
    });
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      const hours = DAYS.filter((d) => weeklyHours[d.value].open).map((d) => ({
        day_of_week: d.value,
        start_time: `${weeklyHours[d.value].startHour}:00:00`,
        end_time: `${weeklyHours[d.value].endHour}:00:00`,
      }));
      await api.setAvailabilityHours({ skillId: skill.skill_id, hours });
      setAvailability(await api.getAllAvailabilityForSkill(skill.skill_id));
      notify('Hours saved', 'Your weekly availability has been updated.');
    } catch (err) {
      notify('Could not save your hours', err.message ?? 'Please try again.');
    } finally {
      setSavingHours(false);
    }
  };

  const handleDeleteSlot = async (availabilityId) => {
    try {
      await api.deleteAvailability(availabilityId);
      setAvailability((prev) => prev.filter((a) => a.availability_id !== availabilityId));
    } catch (err) {
      notify('Could not remove this time slot', err.message ?? 'Please try again.');
    }
  };

  if (loading) return <LoadingSpinner label="Loading skill…" />;
  if (!skill) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Skill not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Badge label={skill.category} />
        <Text style={styles.title}>{skill.title}</Text>

        {!isOwner && (
          <Card onPress={() => router.push(`/profile/${skill.teacher?.user_id}`)} style={styles.teacherCard}>
            <Avatar uri={skill.teacher?.avatar} name={skill.teacher?.name} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.teacherName}>{skill.teacher?.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={COLORS.token} />
                <Text style={styles.ratingText}>
                  {skill.teacher?.rating} ({skill.teacher?.review_count} reviews)
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
          </Card>
        )}

        <Text style={styles.sectionTitle}>About this session</Text>
        <Text style={styles.description}>{skill.description}</Text>

        {isOwner ? (
          <>
            <Text style={styles.sectionTitle}>Your weekly hours</Text>
            <View style={styles.weeklyHoursList}>
              {DAYS.map((day) => {
                const dayHours = weeklyHours[day.value];
                return (
                  <View key={day.value} style={styles.dayRow}>
                    <View style={styles.dayRowHeader}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Pressable
                        onPress={() => handleToggleDay(day.value)}
                        style={[styles.dayTogglePill, dayHours.open && styles.dayTogglePillActive]}
                      >
                        <Text style={[styles.dayToggleText, dayHours.open && styles.dayToggleTextActive]}>
                          {dayHours.open ? 'Open' : 'Closed'}
                        </Text>
                      </Pressable>
                    </View>

                    {dayHours.open && (
                      <View style={styles.dayHourPickers}>
                        <View style={styles.dayHourGroup}>
                          <Text style={styles.dayHourLabel}>Start</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                            {HOURS.map((hour) => {
                              const active = hour === dayHours.startHour;
                              return (
                                <Pressable
                                  key={hour}
                                  onPress={() => handleChangeStartHour(day.value, hour)}
                                  style={[styles.chip, active && styles.chipActive]}
                                >
                                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatHour(hour)}</Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                        <View style={styles.dayHourGroup}>
                          <Text style={styles.dayHourLabel}>End</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                            {HOURS.map((hour) => {
                              const active = hour === dayHours.endHour;
                              return (
                                <Pressable
                                  key={hour}
                                  onPress={() => handleChangeEndHour(day.value, hour)}
                                  style={[styles.chip, active && styles.chipActive]}
                                >
                                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatHour(hour)}</Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {hoursLoaded && Object.values(weeklyHours).every((d) => !d.open) && (
              <Text style={styles.emptyText}>
                You haven't set any open hours yet — toggle a day on above to get started.
              </Text>
            )}

            <Text style={styles.hintText}>
              Turning off a day won't remove times you've already opened — delete individual slots below if you no
              longer need one.
            </Text>

            <Button title="Save Hours" onPress={handleSaveHours} loading={savingHours} style={{ marginTop: SPACING.sm }} />

            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Open times</Text>
            {availability.length === 0 ? (
              <Text style={styles.emptyText}>
                You haven't added any availability yet. Set your hours above to let learners know when you're free.
              </Text>
            ) : (
              groupSlotsByDay(availability).map((group) => (
                <View key={group.key} style={styles.dayGroup}>
                  <Text style={styles.dayGroupHeader}>{group.label}</Text>
                  <View style={styles.slotChipRow}>
                    {group.slots.map((slot) => (
                      <View key={slot.availability_id} style={[styles.slotChip, slot.booked && styles.slotChipBooked]}>
                        <Text style={[styles.slotChipText, slot.booked && styles.slotChipTextBooked]}>
                          {formatTime(slot.start_time)}
                        </Text>
                        {slot.booked ? (
                          <Ionicons name="lock-closed" size={12} color={COLORS.token} style={{ marginLeft: 4 }} />
                        ) : (
                          <Pressable onPress={() => handleDeleteSlot(slot.availability_id)} hitSlop={8} style={{ marginLeft: 4 }}>
                            <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Request this skill</Text>
            <Card style={styles.requestCard}>
              <View style={styles.requestRow}>
                <View>
                  <Text style={styles.costLabel}>Cost</Text>
                  <Text style={styles.costValue}>{DEFAULT_SESSION_TOKEN_COST} token / hour</Text>
                </View>
                <Ionicons name="calendar-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.requestHint}>
                Send a request to {skill.teacher?.name ?? 'the teacher'}. Once they accept, you'll pick one or more
                consecutive hours from their open availability.
              </Text>
              <Input
                placeholder="Add a note (optional) — what would you like to focus on?"
                value={message}
                onChangeText={setMessage}
                multiline
                containerStyle={{ marginBottom: SPACING.sm, marginTop: SPACING.sm }}
              />
              <Button title="Request to Book" onPress={handleRequest} loading={requesting} />
            </Card>
          </>
        )}
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
    gap: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  teacherCard: {
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  weeklyHoursList: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dayRow: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  dayRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayTogglePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  dayTogglePillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayToggleText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  dayToggleTextActive: {
    color: COLORS.white,
  },
  dayHourPickers: {
    gap: SPACING.sm,
  },
  dayHourGroup: {
    gap: SPACING.xs,
  },
  dayHourLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  hintText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  dayGroup: {
    marginBottom: SPACING.md,
  },
  dayGroupHeader: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  slotChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.round,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  slotChipBooked: {
    borderColor: COLORS.tokenLight,
    backgroundColor: COLORS.tokenLight,
  },
  slotChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  slotChipTextBooked: {
    color: COLORS.token,
  },
  requestCard: {
    marginBottom: SPACING.md,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    lineHeight: 19,
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
  notFound: {
    padding: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
});
