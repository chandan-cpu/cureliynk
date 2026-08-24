import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CurelinkLogo } from "@/components/onboarding/curelink-logo";
import { HeartbeatPulse } from "@/components/onboarding/heartbeat-pulse";
import { PaginationDots } from "@/components/onboarding/pagination-dots";
import { useAuth } from "@/lib/auth-context";

const TOTAL_ONBOARDING_STEPS = 4;
const SPLASH_STEP_INDEX = 0;
const SPLASH_DURATION_MS = 1000;

/**
 * First screen of the onboarding flow: brand mark, tagline, ECG motif,
 * and the trust badges shown before the user picks a language.
 */
export function SplashScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { status } = useAuth();
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Waits for both the minimum splash display time and the auth bootstrap
  // (SecureStore read + token validation) to finish, so a returning signed-in
  // user is sent straight to the dashboard instead of flashing the language
  // screen first.
  useEffect(() => {
    if (!minDurationElapsed || status === "loading") return;
    router.replace(status === "authenticated" ? "/home" : "/language");
  }, [minDurationElapsed, status, router]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        <CurelinkLogo size={112} />

        <View className="items-center mt-6">
          <Text className="text-ink-primary text-4xl font-bold">
            Cureliynk
          </Text>
          <Text className="text-brand-light text-base mt-2">
            {t("splash.tagline")}
          </Text>
        </View>

        <View className="w-full mt-10">
          <HeartbeatPulse />
        </View>
      </View>

      <View className="items-center px-8 pb-10 gap-5">
        <View className="items-center gap-1.5">
          <Text className="text-ink-muted text-xs tracking-wide">
            {t("splash.badgeAiPowered")}  ·  {t("splash.badgeTrusted")}  ·  {t("splash.badgeSecure")}
          </Text>
          <Text className="text-ink-muted text-xs">
            {t("splash.companion")}
          </Text>
          <Text className="text-ink-muted text-xs">{t("splash.availability")}</Text>
        </View>

        <PaginationDots
          total={TOTAL_ONBOARDING_STEPS}
          activeIndex={SPLASH_STEP_INDEX}
        />
      </View>
    </SafeAreaView>
  );
}
