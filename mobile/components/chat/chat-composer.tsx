import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput, TouchableOpacity, View } from "react-native";

import { useIndicScript } from "@/components/chat/chat-text";
import { useThemeColors } from "@/lib/theme";

type ChatComposerProps = {
  /** Swaps the placeholder between "Type your symptoms…" and "Ask a follow-up…". */
  isNewChat: boolean;
  isThinking: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

export function ChatComposer({ isNewChat, isThinking, onSend, onStop }: ChatComposerProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const indic = useIndicScript();
  const [draft, setDraft] = useState("");

  const trimmed = draft.trim();
  const canSend = trimmed.length > 0;

  function handleSend() {
    if (!canSend) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <View className="flex-row items-center gap-2.5 px-3.5 pb-3 pt-2.5">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={t(isNewChat ? "chat.placeholderNew" : "chat.placeholderFollowUp")}
        placeholderTextColor={colors.icon}
        onSubmitEditing={handleSend}
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
