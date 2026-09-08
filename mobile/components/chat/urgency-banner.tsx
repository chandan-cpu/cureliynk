import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useIndicScript } from "@/components/chat/chat-text";

/**
 * The single red element in the whole screen. It sits above the answer on
 * emergency replies only — the design deliberately keeps every other state
 * colourless so that this one reads as different at a glance.
 */
export function UrgencyBanner() {
  const { t } = useTranslation();
  const indic = useIndicScript();

  return (
    <View className="flex-row items-center gap-3 rounded-[14px] border border-danger/40 bg-danger/10 px-[15px] py-3.5">
      <View className="h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-danger">
        <Text className="text-base font-bold text-white">!</Text>
      </View>
      <Text
        className={`flex-1 font-semibold text-danger ${indic ? "text-sm leading-6" : "text-sm leading-5"}`}
      >
        {t("chat.emergencyBanner")}
      </Text>
    </View>
  );
}
