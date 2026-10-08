import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../store/useAppHooks';
import { chatService } from '../../services/chatService';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { formatTime } from '../../utils/helpers';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';

const ICEBREAKERS = [
  '👋 Hi! Excited to swap skills!',
  '📅 What days work best for you?',
  '🎯 What is your current level with this skill?',
  '☕ Want to do a quick 15-min intro call?',
];

export default function ChatScreen() {
  const { id: matchId } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const {
    data: matchDetails,
    isPending: matchPending,
    error: matchError,
    refetch: refetchMatch,
  } = useQuery({
    queryKey: ['match-details', matchId, user?.user_id],
    queryFn: () => chatService.getMatchDetails(matchId, user?.user_id),
    enabled: Boolean(matchId && user),
  });

  const {
    data: messages = [],
    isPending: messagesPending,
    error: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['chat-messages', matchId],
    queryFn: () => chatService.fetchMessages(matchId),
    enabled: Boolean(matchId),
  });

  // Subscribe to real-time incoming messages
  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = chatService.subscribeToMessages(matchId, (newMsg) => {
      queryClient.setQueryData(['chat-messages', matchId], (old = []) => {
        if (old.some((m) => m.id === newMsg.id)) {
          return old;
        }
        return [...old, newMsg];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [matchId, queryClient]);

  const handleSend = async (contentToSend) => {
    const text = (contentToSend ?? inputText).trim();
    if (!text || sending || !user || !matchId) return;

    setInputText('');
    setSending(true);

    try {
      const savedMsg = await chatService.sendMessage(matchId, user.user_id, text);
      queryClient.setQueryData(['chat-messages', matchId], (old = []) => {
        if (old.some((m) => m.id === savedMsg.id)) {
          return old;
        }
        return [...old, savedMsg];
      });
    } catch (err) {
      setInputText(text);
      notify('Failed to send message', toUserMessage(err));
    } finally {
      setSending(false);
    }
  };

  const partner = matchDetails?.counterpart;

  if (matchPending || messagesPending) {
    return <LoadingSpinner label="Loading conversation…" />;
  }

  if (matchError || messagesError) {
    return (
      <ErrorState
        error={matchError || messagesError}
        onRetry={() => {
          refetchMatch();
          refetchMessages();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>

        <Pressable
          style={styles.headerInfo}
          onPress={() => {
            if (partner?.id) router.push(`/profile/${partner.id}`);
          }}
          accessibilityRole="button"
          accessibilityLabel={`View ${partner?.name ?? 'match'}'s profile`}
        >
          <Avatar uri={partner?.avatar} name={partner?.name} size={40} />
          <View style={styles.headerTextCol}>
            <Text style={styles.partnerName} numberOfLines={1}>
              {partner?.name ?? 'Match'}
            </Text>
            <Text style={styles.partnerStatus}>Skill Swap Partner</Text>
          </View>
        </Pressable>

        {partner?.id && (
          <Pressable
            onPress={() => router.push(`/profile/${partner.id}`)}
            accessibilityRole="button"
            accessibilityLabel="View profile"
            style={styles.headerAction}
          >
            <Ionicons name="person-circle-outline" size={28} color={COLORS.primary} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="sparkles" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>It's a Match! 🎉</Text>
              <Text style={styles.emptySubtitle}>
                Say hello to {partner?.name ?? 'your partner'} and arrange your skill swap session.
              </Text>

              {/* Icebreaker suggestions */}
              <View style={styles.icebreakersWrap}>
                <Text style={styles.icebreakersLabel}>Icebreaker ideas:</Text>
                {ICEBREAKERS.map((prompt, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.icebreakerChip}
                    onPress={() => handleSend(prompt)}
                  >
                    <Text style={styles.icebreakerText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.user_id;
            return (
              <View
                style={[
                  styles.messageRow,
                  isMine ? styles.myMessageRow : styles.theirMessageRow,
                ]}
              >
                {!isMine && (
                  <Avatar uri={partner?.avatar} name={partner?.name} size={28} />
                )}
                <View
                  style={[
                    styles.bubble,
                    isMine ? styles.myBubble : styles.theirBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMine ? styles.myMessageText : styles.theirMessageText,
                    ]}
                  >
                    {item.content}
                  </Text>
                  <Text
                    style={[
                      styles.timestamp,
                      isMine ? styles.myTimestamp : styles.theirTimestamp,
                    ]}
                  >
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Quick icebreakers bar if conversation is short */}
        {messages.length > 0 && messages.length <= 3 && (
          <View style={styles.quickPromptSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptScroll}
            >
              {ICEBREAKERS.map((prompt, idx) => (
                <Pressable
                  key={idx}
                  style={styles.quickPromptPill}
                  onPress={() => handleSend(prompt)}
                >
                  <Text style={styles.quickPromptPillText}>{prompt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={`Message ${partner?.name?.split(' ')[0] ?? 'partner'}…`}
            placeholderTextColor={COLORS.textFaint}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <Pressable
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() && !sending ? COLORS.white : COLORS.textFaint}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTextCol: {
    flex: 1,
  },
  partnerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  partnerStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  headerAction: {
    padding: SPACING.xs,
  },
  keyboardContainer: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADII.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  icebreakersWrap: {
    width: '100%',
    gap: SPACING.sm,
  },
  icebreakersLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  icebreakerChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  icebreakerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  quickPromptSection: {
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  quickPromptScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  quickPromptPill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.round,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
  },
  quickPromptPillText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.lg,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  myMessageText: {
    color: COLORS.white,
  },
  theirMessageText: {
    color: COLORS.text,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirTimestamp: {
    color: COLORS.textFaint,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs + 2,
    paddingBottom: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs + 2,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: RADII.round,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
