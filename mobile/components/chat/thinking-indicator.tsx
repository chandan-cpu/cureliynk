import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, Text, View } from "react-native";

import { useIndicScript } from "@/components/chat/chat-text";

/**
 * One line explaining the wait. The design's whole point here is that a
 * pipeline diagram would be worse than a sentence, so this stays a dot and
 * a caption — the dot pulses only to show the screen is still alive.
 */
export function ThinkingIndicator() {
  const { t } = useTranslation();
  const indic = useIndicScript();
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View className="flex-row items-center gap-3">
      <Animated.View
        style={{ opacity: pulse }}
        className="h-[9px] w-[9px] rounded-full bg-brand-dark dark:bg-brand"
      />
      <Text className={`text-muted dark:text-muted-dark ${indic ? "text-sm leading-6" : "text-sm leading-5"}`}>
        {t("chat.thinking")}
      </Text>
    </View>
  );
}
