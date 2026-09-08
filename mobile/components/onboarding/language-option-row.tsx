import { Text, TouchableOpacity, View } from "react-native";

import type { LanguageOption } from "@/constants/languages";

type LanguageOptionRowProps = {
  option: LanguageOption;
  selected: boolean;
  onPress: () => void;
};

export function LanguageOptionRow({
  option,
  selected,
  onPress,
}: LanguageOptionRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={
        selected
          ? "flex-row items-center rounded-2xl border-2 border-brand bg-brand/5 px-4 py-3.5"
          : "flex-row items-center rounded-2xl border border-line dark:border-line-dark bg-card dark:bg-card-dark px-4 py-3.5"
      }
    >
      <View
        className="w-11 h-11 rounded-full items-center justify-center"
        style={{ backgroundColor: option.badgeColor }}
      >
        <Text className="text-white text-sm font-bold">
          {option.badgeLetters}
        </Text>
      </View>

      <View className="flex-1 ml-3">
        <Text className="text-content dark:text-content-dark text-base font-semibold">
          {option.nativeLabel}
          {option.englishLabel ? (
            <Text className="text-muted dark:text-muted-dark font-normal"> ({option.englishLabel})</Text>
          ) : null}
        </Text>
        <Text className="text-muted dark:text-muted-dark text-xs mt-0.5" numberOfLines={1}>
          {option.subtitle}
        </Text>
      </View>

      <View
        className={
          selected
            ? "w-6 h-6 rounded-full bg-brand items-center justify-center"
            : "w-6 h-6 rounded-full border-2 border-line dark:border-line-dark"
        }
      >
        {selected ? <Text className="text-white text-xs font-bold">✓</Text> : null}
      </View>
    </TouchableOpacity>
  );
}
