import { useEffect, useState } from "react";
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
  // useState rather than useRef: reading a ref during render is what the
  // React Compiler lint rules forbid, and `useRef(new Animated.Value(…))`
  // also built a throwaway Animated.Value on every single render. A lazy
  // useState initialiser runs exactly once, which is what was always meant.
  const [pulse] = useState(() => new Animated.Value(0.35));

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
