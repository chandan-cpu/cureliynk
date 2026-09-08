import { Text, View } from "react-native";

import { useIndicScript } from "@/components/chat/chat-text";

/**
 * The only bubble on the screen. The assistant answers as plain text on the
 * background, so the bubble is what marks a line as something you said —
 * hence the squared-off bottom-right corner pointing back at the composer.
 */
export function UserMessage({ text }: { text: string }) {
  const indic = useIndicScript();

  return (
    <View
      className={`self-end rounded-[18px] rounded-br-[6px] border border-line dark:border-line-dark bg-card dark:bg-card-dark px-4 py-3 ${
        indic ? "max-w-[86%]" : "max-w-[82%]"
      }`}
    >
      <Text
        className={`text-content dark:text-content-dark ${
          indic ? "text-sm leading-7" : "text-[14.5px] leading-6"
        }`}
      >
        {text}
      </Text>
    </View>
  );
}
