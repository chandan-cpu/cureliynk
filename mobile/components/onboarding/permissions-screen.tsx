import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PermissionOptionRow } from "@/components/onboarding/permission-option-row";
import { PERMISSION_OPTIONS } from "@/constants/permissions";
import {
  type DevicePermissionId,
  getPermissionGranted,
  requestPermissionGranted,
} from "@/lib/permissions";

type GrantedMap = Partial<Record<DevicePermissionId, boolean>>;

export function PermissionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [granted, setGranted] = useState<GrantedMap>({});
  const [pendingId, setPendingId] = useState<DevicePermissionId | null>(null);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        PERMISSION_OPTIONS.map(
          async (option) => [option.id, await getPermissionGranted(option.id)] as const,
        ),
      );
      setGranted(Object.fromEntries(entries));
    })();
  }, []);

  const handleRequest = async (id: DevicePermissionId) => {
    if (pendingId) return;
    setPendingId(id);
    const isGranted = await requestPermissionGranted(id);
    setGranted((prev) => ({ ...prev, [id]: isGranted }));
    setPendingId(null);
  };

  const handleContinue = async () => {
    for (const option of PERMISSION_OPTIONS) {
      const isGranted = await requestPermissionGranted(option.id);
      setGranted((prev) => ({ ...prev, [option.id]: isGranted }));
    }
    router.push("/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-2">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View className="mt-4">
          <Text className="text-slate-900 text-2xl font-bold">
            {t("permissions.title")}
          </Text>
          <Text className="text-slate-500 text-sm mt-2">
            {t("permissions.subtitle")}
          </Text>
        </View>

        <ScrollView
          className="mt-6"
          contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {PERMISSION_OPTIONS.map((option) => (
            <PermissionOptionRow
              key={option.id}
              option={option}
              title={t(`permissions.${option.id}.title`)}
              subtitle={t(`permissions.${option.id}.subtitle`)}
              granted={granted[option.id] ?? false}
              pending={pendingId === option.id}
              onPress={() => handleRequest(option.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View className="px-6 pb-6">
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.85}
          className="items-center justify-center bg-brand-dark rounded-full py-4"
        >
          <Text className="text-white text-base font-semibold">
            {t("common.continue")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
