import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIndicScript } from "@/components/chat/chat-text";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { resolveLanguage } from "@/lib/languages";
import { useThemeColors } from "@/lib/theme";

type ChatComposerProps = {
  /** Swaps the placeholder between "Type your symptoms…" and "Ask a follow-up…". */
  isNewChat: boolean;
  isThinking: boolean;
  onSend: (text: string, viaVoice: boolean) => void;
  onStop: () => void;
};

export function ChatComposer({ isNewChat, isThinking, onSend, onStop }: ChatComposerProps) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const indic = useIndicScript();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [draft, setDraft] = useState("");
  // Cleared the moment the user edits the transcript by hand, so a voice
  // question that was corrected before sending is no longer labelled as one.
  const [draftFromVoice, setDraftFromVoice] = useState(false);

  // Runs from the recognition event, not from an effect watching the hook's
  // state. Same visible behaviour — the field tracks speech live and keeps the
  // final words once recognition ends — without the extra render pass per
  // syllable that mirroring the transcript into state caused.
  const handleTranscript = useCallback((transcript: string) => {
    setDraft(transcript);
    setDraftFromVoice(true);
  }, []);

  const { state: voiceState, isSupported: voiceSupported, start: startVoice, stop: stopVoice } =
    useVoiceInput(resolveLanguage(i18n.language), handleTranscript);
  const isListening = voiceState.status === "listening";

  useEffect(() => {
    if (voiceState.status === "denied") {
      Alert.alert(t("chat.voice.permissionTitle"), t("chat.voice.permissionBody"));
    } else if (voiceState.status === "unavailable") {
      Alert.alert(t("chat.voice.unavailableTitle"), t("chat.voice.unavailableBody"));
    }
  }, [voiceState, t]);

  const trimmed = draft.trim();
  const canSend = trimmed.length > 0;

  function handleSend() {
    if (!canSend) return;
    onSend(trimmed, draftFromVoice);
    setDraft("");
    setDraftFromVoice(false);
  }

  function handleChangeText(text: string) {
    setDraft(text);
    setDraftFromVoice(false);
  }

  function handleMicPress() {
    if (isListening) {
      stopVoice();
    } else {
      setDraft("");
      startVoice();
    }
  }

  return (
    <View
      className="flex-row items-center gap-2.5 px-3.5 pt-2.5"
      // With the keyboard up the bar sits directly on the keys, so only the
      // design's own 12px gap applies. With it down the bar is the bottom of
      // the screen and has to clear the home indicator / gesture bar itself —
      // the screen deliberately does not reserve a bottom safe-area edge,
      // because doing so would strand that same strip above the keyboard.
      style={{ paddingBottom: keyboardVisible ? 12 : insets.bottom + 12 }}
    >
      {voiceSupported ? (
        <TouchableOpacity
          onPress={handleMicPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t(isListening ? "chat.voice.stop" : "chat.voice.start")}
          style={isListening ? { backgroundColor: colors.danger, borderColor: colors.danger } : undefined}
          className={`h-[46px] w-[46px] items-center justify-center rounded-full border ${
            isListening ? "" : "bg-field dark:bg-field-dark border-line dark:border-line-dark"
          }`}
        >
          <Ionicons name={isListening ? "stop" : "mic"} size={18} color={isListening ? "#FFFFFF" : colors.muted} />
        </TouchableOpacity>
      ) : null}

      <TextInput
        value={draft}
        onChangeText={handleChangeText}
        placeholder={t(
          isListening
            ? "chat.voice.listening"
            : isNewChat
              ? "chat.placeholderNew"
              : "chat.placeholderFollowUp",
        )}
        placeholderTextColor={colors.icon}
        onSubmitEditing={handleSend}
        // While listening, the transcript is driving the field; typing into it
        // at the same time would just be a race the user always loses.
        editable={!isListening}
        // The design's input is a single pill; long symptom descriptions grow
        // it rather than scrolling a one-line field.
        multiline
        returnKeyType="send"
        submitBehavior="submit"
        className={`h-[46px] flex-1 rounded-[23px] border border-line dark:border-line-dark bg-field dark:bg-field-dark px-[17px] text-content dark:text-content-dark ${
          indic ? "text-sm" : "text-[14.5px]"
        }`}
      />

      {isThinking ? (
        <TouchableOpacity
          onPress={onStop}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("chat.stop")}
          className="h-[46px] w-[46px] items-center justify-center rounded-full bg-field dark:bg-field-dark border border-line dark:border-line-dark"
        >
          <Ionicons name="stop" size={16} color={colors.muted} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("chat.send")}
          className={`h-[46px] w-[46px] items-center justify-center rounded-full bg-brand-dark dark:bg-brand ${
            canSend ? "" : "opacity-40"
          }`}
        >
          <Ionicons name="arrow-up" size={20} color={colors.onBrand} />
        </TouchableOpacity>
      )}
    </View>
  );
}
