import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Linking, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DoctorListItem } from "@/components/dashboard/doctor-list-item";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { findNearbyDoctors, type Department, type Doctor } from "@/lib/doctors";

type RequestState = { status: "loading" } | { status: "error" } | { status: "success"; doctors: Doctor[] };

export function DoctorsResultsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { department, title } = useLocalSearchParams<{ department: Department; title: string }>();
  const { state: locationState, retry: retryLocation } = useCurrentLocation();
  const [requestState, setRequestState] = useState<RequestState>({ status: "loading" });

  useEffect(() => {
    if (locationState.status !== "granted") return;

    let cancelled = false;
    setRequestState({ status: "loading" });

    findNearbyDoctors(department, locationState.coords)
      .then((result) => {
        if (!cancelled) setRequestState({ status: "success", doctors: result.doctors });
      })
      .catch(() => {
        if (!cancelled) setRequestState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [department, locationState]);

  const renderBody = () => {
    if (locationState.status === "denied") {
      return (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Ionicons name="location-outline" size={40} color="#94A3B8" />
          <Text className="text-slate-900 text-base font-bold text-center">
            {t("dashboard.doctorsResults.locationDeniedTitle")}
          </Text>
          <Text className="text-slate-500 text-sm text-center">
            {t("dashboard.doctorsResults.locationDeniedMessage")}
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            className="bg-brand-dark rounded-full px-5 py-2.5 mt-2"
          >
            <Text className="text-white text-sm font-semibold">{t("dashboard.doctorsResults.openSettings")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={retryLocation} className="mt-1">
            <Text className="text-brand-dark text-sm font-semibold">{t("dashboard.doctorsResults.tryAgain")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (locationState.status === "error" || requestState.status === "error") {
      return (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Ionicons name="alert-circle-outline" size={40} color="#94A3B8" />
          <Text className="text-slate-500 text-sm text-center">{t("dashboard.doctorsResults.genericError")}</Text>
          <TouchableOpacity
            onPress={locationState.status === "error" ? retryLocation : () => setRequestState({ status: "loading" })}
            className="bg-brand-dark rounded-full px-5 py-2.5 mt-2"
          >
            <Text className="text-white text-sm font-semibold">{t("dashboard.doctorsResults.tryAgain")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (locationState.status === "loading" || requestState.status === "loading") {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#15803D" />
          <Text className="text-slate-500 text-sm mt-3">{t("dashboard.doctorsResults.loading")}</Text>
        </View>
      );
    }

    if (requestState.doctors.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="search-outline" size={40} color="#94A3B8" />
          <Text className="text-slate-500 text-sm text-center mt-3">
            {t("dashboard.doctorsResults.emptyResults")}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={requestState.doctors}
        keyExtractor={(item) => item.placeId}
        renderItem={({ item }) => <DoctorListItem doctor={item} />}
        contentContainerStyle={{ padding: 20 }}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <StatusBar style="dark" />
      <View className="flex-row items-center px-5 pt-2 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-slate-900 text-lg font-bold ml-1">{title}</Text>
      </View>
      {renderBody()}
    </SafeAreaView>
  );
}
