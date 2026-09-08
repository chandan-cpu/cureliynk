import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Linking, Text, TouchableOpacity, View } from "react-native";

import { useIndicScript } from "@/components/chat/chat-text";
import type { SuggestedDoctor } from "@/lib/chat";
import { useThemeColors } from "@/lib/theme";

/**
 * A recommendation inside the answer, not a directory row — deliberately
 * lighter than `dashboard/doctor-list-item`, which carries ratings and review
 * counts.
 *
 * The backend returns no phone number, so the action here is "open in maps"
 * rather than "call". Results that came from the local doctor database have
 * neither a distance nor a maps link, so both are conditional.
 */
export function DoctorSuggestionCard({ doctor }: { doctor: SuggestedDoctor }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const indic = useIndicScript();

  const meta = [
    doctor.distanceKm !== null ? t("chat.kmAway", { distance: doctor.distanceKm.toFixed(1) }) : null,
    doctor.doctorType,
    doctor.location,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="flex-row items-center gap-[13px] rounded-[14px] border border-line dark:border-line-dark bg-card dark:bg-card-dark px-3.5 py-3">
      <View className="flex-1 min-w-0">
        {/* Clinic names are proper nouns and stay as the provider wrote them
            in every locale. */}
        <Text className="text-sm font-semibold text-content dark:text-content-dark">
          {doctor.name}
        </Text>
        <Text
          numberOfLines={2}
          className={`mt-[3px] text-muted dark:text-muted-dark ${
            indic ? "text-[12.5px] leading-6" : "text-[12.5px] leading-5"
          }`}
        >
          {meta}
        </Text>
      </View>

      {doctor.mapsUrl ? (
        <TouchableOpacity
          // Opens the place in the device's maps app. It never starts
          // navigation on its own, so a mis-tap costs nothing.
          onPress={() => Linking.openURL(doctor.mapsUrl as string)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("chat.openInMaps", { name: doctor.name })}
          className="h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand-dark/10 dark:bg-brand/15"
        >
          <Ionicons name="navigate" size={16} color={colors.brand} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
