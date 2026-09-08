import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CareTypeOptionRow } from "@/components/onboarding/care-type-option-row";
import { CARE_TYPE_OPTIONS, DEFAULT_CARE_TYPE_ID } from "@/constants/careTypes";
import { useThemeColors } from "@/lib/theme";

export function CareTypeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [selectedId, setSelectedId] = useState(DEFAULT_CARE_TYPE_ID);

  return (
    <SafeAreaView className="flex-1 bg-card dark:bg-surface-dark">
      <View className="flex-1 px-6 pt-2">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color={colors.content} />
        </TouchableOpacity>

        <View className="mt-4">
          <Text className="text-content dark:text-content-dark text-2xl font-bold">
            {t("careType.title")}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-sm mt-2">
            {t("careType.subtitle")}
          </Text>
        </View>

        <ScrollView
          className="mt-6"
          contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {CARE_TYPE_OPTIONS.map((option) => (
            <CareTypeOptionRow
              key={option.id}
              option={option}
              title={t(`careType.${option.id}.title`)}
              subtitle={t(`careType.${option.id}.subtitle`)}
              selected={option.id === selectedId}
              onPress={() => setSelectedId(option.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View className="px-6 pb-6">
        <TouchableOpacity
          onPress={() => router.push("/permissions")}
          activeOpacity={0.85}
          className="flex-row items-center justify-center gap-2 bg-brand-dark dark:bg-brand rounded-full py-4"
        >
          <Text className="text-white dark:text-[#052E16] text-base font-semibold">
            {t("common.next")}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.onBrand} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
