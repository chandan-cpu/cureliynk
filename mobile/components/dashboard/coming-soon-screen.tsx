import type { ComponentProps } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ComingSoonScreenProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
};

/** Reusable stub body for every not-yet-built dashboard destination. */
export function ComingSoonScreen({ icon, title, message }: ComingSoonScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <StatusBar style="dark" />
      <View className="flex-1 px-6 pt-2">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View className="flex-1 items-center justify-center gap-4 px-4 -mt-10">
          <View className="w-20 h-20 rounded-full items-center justify-center bg-brand/10">
            <Ionicons name={icon} size={36} color="#15803D" />
          </View>
          <Text className="text-slate-900 text-xl font-bold text-center">{title}</Text>
          <Text className="text-slate-500 text-sm text-center">{message}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
