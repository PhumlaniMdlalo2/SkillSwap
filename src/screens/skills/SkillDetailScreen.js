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
import { formatDate, formatTime } from '../../utils/helpers';
import { notify } from '../../utils/alert';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const DAY_OPTIONS = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + i + 1);
  return date;
});

function formatHour(hour) {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

export default function SkillDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [skill, setSkill] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAY_OPTIONS[0]);
  const [selectedHour, setSelectedHour] = useState(HOURS[0]);
  const [addingSlot, setAddingSlot] = useState(false);

  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);

  const isOwner = Boolean(user && skill && skill.user_id === user.user_id);

  const load = () => {
    Promise.all([
      api.getSkillById(id),
      isOwner ? api.getAllAvailabilityForSkill(id) : Promise.resolve([]),
    ])
      .then(([skillData, slots]) => {
        setSkill(skillData);
        setAvailability(slots);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isOwner]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await api.requestSession({
        skillId: skill.skill_id,
        learnerId: user.user_id,
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

  const handleAddSlot = async () => {
    setAddingSlot(true);
    try {
      const start = new Date(selectedDay);
      start.setHours(selectedHour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      await api.addAvailability({
        userId: user.user_id,
        skillId: skill.skill_id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setShowAddForm(false);
      load();
    } catch (err) {
      notify('Could not add this time slot', err.message ?? 'Please try again.');
    } finally {
      setAddingSlot(false);
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
            <View style={styles.ownerHeaderRow}>
              <Text style={styles.sectionTitle}>Your availability</Text>
              <Pressable
                onPress={() => setShowAddForm((prev) => !prev)}
                hitSlop={8}
                accessibilityLabel={showAddForm ? 'Close add availability form' : 'Add availability slot'}
              >
                <Ionicons name={showAddForm ? 'close' : 'add-circle'} size={24} color={COLORS.primary} />
              </Pressable>
            </View>

            {showAddForm && (
              <View style={styles.addForm}>
                <Text style={styles.addFormLabel}>Day</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {DAY_OPTIONS.map((day) => {
                    const active = day.toDateString() === selectedDay.toDateString();
                    return (
                      <Pressable
                        key={day.toISOString()}
                        onPress={() => setSelectedDay(day)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatDate(day)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={styles.addFormLabel}>Time</Text>
                <View style={styles.chipRow}>
                  {HOURS.map((hour) => {
                    const active = hour === selectedHour;
                    return (
                      <Pressable
                        key={hour}
                        onPress={() => setSelectedHour(hour)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatHour(hour)}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Button title="Add Time Slot" onPress={handleAddSlot} loading={addingSlot} style={{ marginTop: SPACING.sm }} />
              </View>
            )}

            {availability.length === 0 ? (
              <Text style={styles.emptyText}>
                You haven't added any availability yet. Tap + to let learners know when you're free.
              </Text>
            ) : (
              <View style={styles.slotList}>
                {availability.map((slot) => (
                  <View key={slot.availability_id} style={styles.ownerSlot}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotText}>
                        {formatDate(slot.start_time)} · {formatTime(slot.start_time)}
                      </Text>
                    </View>
                    <Badge label={slot.booked ? 'Booked' : 'Open'} tone={slot.booked ? 'warning' : 'success'} />
                    {!slot.booked && (
                      <Pressable onPress={() => handleDeleteSlot(slot.availability_id)} hitSlop={8} style={{ marginLeft: SPACING.sm }}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Request this skill</Text>
            <Card style={styles.requestCard}>
              <View style={styles.requestRow}>
                <View>
                  <Text style={styles.costLabel}>Cost</Text>
                  <Text style={styles.costValue}>{DEFAULT_SESSION_TOKEN_COST} token</Text>
                </View>
                <Ionicons name="calendar-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.requestHint}>
                Send a request to {skill.teacher?.name ?? 'the teacher'}. Once they accept, you'll pick a time from
                their open availability.
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
  ownerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addForm: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  addFormLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
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
  slotList: {
    gap: SPACING.sm,
  },
  ownerSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  slotText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
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
