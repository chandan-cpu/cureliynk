import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AssistantMessage } from "@/components/chat/assistant-message";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatErrorMessage } from "@/components/chat/chat-error-message";
import { ChatHeader } from "@/components/chat/chat-header";
import { ThinkingIndicator } from "@/components/chat/thinking-indicator";
import { UserMessage } from "@/components/chat/user-message";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import { askMedicalAssistant, type ChatMessage } from "@/lib/chat";
import { resolveLanguage } from "@/lib/languages";
import { MedicalApiError } from "@/lib/medical-api";

/**
 * Ask AI — symptom description in, specialty and nearby clinics out.
 *
 * Answers come from the Python medical assistant; see `lib/chat` for the
 * request and `lib/medical-api` for the transport.
 */
export function MedicalChatScreen() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const keyboardVisible = useKeyboardVisible();

  // Location is optional. A user who declined the permission still gets a
  // specialty and an urgency — only the nearby-doctor list is missing — so
  // this never blocks a question.
  const { state: locationState } = useCurrentLocation();

  // Held so "stop" can cancel a request that has not landed yet.
  const inFlight = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  // Guards against a late response updating an unmounted screen.
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      inFlight.current?.abort();
    };
  }, []);

  // Opening the keyboard shortens the transcript; without this the last turn
  // slides up out of view behind the composer instead of staying put.
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });

    return () => subscription.remove();
  }, []);

  const makeId = () => `m${nextId.current++}`;

  const send = useCallback(
    async (text: string, viaVoice = false) => {
      // One question at a time: the previous request is abandoned rather than
      // left running to spend rate-limit budget on an answer nobody wants.
      inFlight.current?.abort();

      const controller = new AbortController();
      inFlight.current = controller;

      setMessages((current) => [...current, { id: makeId(), role: "user", text, viaVoice }]);
      setIsThinking(true);

      try {
        const answer = await askMedicalAssistant(text, {
          coords: locationState.status === "granted" ? locationState.coords : null,
          // The backend only accepts the four languages the app ships.
          language: resolveLanguage(i18n.language),
          signal: controller.signal,
        });

        if (!isMounted.current || controller.signal.aborted) return;

        setMessages((current) => [...current, { id: makeId(), role: "assistant", answer }]);
      } catch (error) {
        // The user pressing stop is not a failure — say nothing.
        if (controller.signal.aborted || !isMounted.current) return;

        setMessages((current) => [
          ...current,
          { id: makeId(), role: "error", ...describeError(error) },
        ]);
      } finally {
        if (inFlight.current === controller) inFlight.current = null;
        if (isMounted.current && !controller.signal.aborted) setIsThinking(false);
      }
    },
    [i18n.language, locationState],
  );

  const stop = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    setIsThinking(false);
  }, []);

  /** Re-sends the most recent question after a failure. */
  const retry = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (!lastUserMessage || lastUserMessage.role !== "user") return;

    // Drop the failed turn so the retry does not stack under an error that no
    // longer applies.
    setMessages((current) => current.filter((message) => message.role !== "error"));
    send(lastUserMessage.text);
  }, [messages, send]);

  const isNewChat = messages.length === 0;

  return (
    // The avoider is the outermost element on purpose. It positions itself by
    // measuring its own frame against the keyboard's, and that frame is read
    // relative to its parent — so anything that insets it first (a SafeAreaView,
    // a visible tab bar) makes it under-shoot by exactly that inset. Spanning
    // the whole window keeps the arithmetic honest and needs no
    // `keyboardVerticalOffset` fudge. `padding` is right on both platforms:
    // where Android does resize the window for the keyboard, the re-measured
    // frame no longer overlaps and the padding computes to zero on its own.
    <KeyboardAvoidingView className="flex-1 bg-surface dark:bg-surface-dark" behavior="padding">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ChatHeader />

        {isNewChat ? (
          <ChatEmptyState onPickExample={(prompt) => send(prompt)} />
        ) : (
          <ScrollView
            ref={scrollRef}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            contentContainerClassName="gap-4 px-4 pb-2 pt-2"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => {
              if (message.role === "user")
                return <UserMessage key={message.id} text={message.text} viaVoice={message.viaVoice} />;
              if (message.role === "assistant")
                return (
                  <AssistantMessage
                    key={message.id}
                    answer={message.answer}
                    // Only worth suggesting when it would actually change the
                    // answer — i.e. the permission is the reason there are no
                    // clinics listed.
                    showLocationHint={
                      locationState.status !== "granted" && message.answer.doctors.length === 0
                    }
                  />
                );
              return (
                <ChatErrorMessage
                  key={message.id}
                  messageKey={message.messageKey}
                  onRetry={message.canRetry ? retry : undefined}
                />
              );
            })}
            {isThinking ? <ThinkingIndicator /> : null}
          </ScrollView>
        )}

        <ChatComposer
          isNewChat={isNewChat}
          isThinking={isThinking}
          onSend={(text, viaVoice) => send(text, viaVoice)}
          onStop={stop}
        />

        {isNewChat && !keyboardVisible ? (
          // Only the empty state carries the standing disclaimer; once there
          // is an answer on screen the emergency ones carry their own. It also
          // steps aside while typing rather than wedging itself between the
          // composer and the keyboard.
          <View className="px-6 pb-3">
            <Text className="text-center text-[11px] leading-4 text-muted dark:text-muted-dark opacity-80">
              {t("chat.disclaimer")}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/**
 * Turns a thrown error into a translation key.
 *
 * Retry is offered only where retrying could plausibly work: a network blip or
 * an overloaded backend, not an expired session or a rejected question.
 */
function describeError(error: unknown): { messageKey: string; canRetry: boolean } {
  if (!(error instanceof MedicalApiError)) {
    return { messageKey: "chat.errors.generic", canRetry: true };
  }

  if (error.status === 0) return { messageKey: "chat.errors.network", canRetry: true };
  if (error.status === 401) return { messageKey: "chat.errors.session", canRetry: false };
  if (error.status === 429) return { messageKey: "chat.errors.rateLimit", canRetry: false };
  if (error.status === 422) return { messageKey: "chat.errors.rejected", canRetry: false };
  if (error.status >= 500) return { messageKey: "chat.errors.unavailable", canRetry: true };

  return { messageKey: "chat.errors.generic", canRetry: true };
}
