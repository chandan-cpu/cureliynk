import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

import { useThemeColors } from "@/lib/theme";

/** Persistent shortcut into the Ask AI stub, mounted once in the tabs layout so it floats above every tab. */
export function FloatingAiButton() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={() => router.push("/ask-ai")}
      activeOpacity={0.85}
      hitSlop={8}
      className="absolute bottom-24 right-5 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      style={{ backgroundColor: colors.brand }}
    >
      <Ionicons name="sparkles" size={24} color={colors.onBrand} />
    </TouchableOpacity>
  );
}
