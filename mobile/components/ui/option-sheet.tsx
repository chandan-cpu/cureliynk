import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

export type SheetOption = {
  id: string;
  label: string;
  /** Optional second line, used by the appearance picker. */
  description?: string;
};

type OptionSheetProps = {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

/**
 * Bottom sheet for picking one of a short list — language, appearance.
 *
 * Shared so the chat header and the profile screen present the same choice in
 * the same way; the design shows both as a value on a row rather than a
 * separate destination.
 */
export function OptionSheet({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: OptionSheetProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        {/* Swallows taps on the sheet itself so only the scrim dismisses. */}
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="rounded-t-3xl bg-card dark:bg-card-dark px-5 pb-8 pt-3"
        >
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-line dark:bg-line-dark" />
          <Text className="mb-2 text-base font-semibold text-content dark:text-content-dark">
            {title}
          </Text>

          <View accessibilityRole="radiogroup">
            {options.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => onSelect(option.id)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  // Named explicitly so the accessible name stays the option
                  // itself rather than option plus description.
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  className={`flex-row items-center gap-3 rounded-2xl px-4 py-3.5 ${
                    isSelected ? "bg-brand-dark/10 dark:bg-brand/15" : ""
                  }`}
                >
                  <View className="flex-1 min-w-0">
                    <Text
                      className={`text-base ${
                        isSelected
                          ? "font-semibold text-brand-dark dark:text-brand"
                          : "text-content dark:text-content-dark"
                      }`}
                    >
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? <Ionicons name="checkmark" size={18} color={colors.brand} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
