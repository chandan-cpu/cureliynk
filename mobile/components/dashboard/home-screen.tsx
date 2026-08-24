import { StatusBar } from "expo-status-bar";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AskAiCard } from "@/components/dashboard/ask-ai-card";
import { BabyCareDoctorsCard } from "@/components/dashboard/baby-care-doctors-card";
import { DisclaimerBanner } from "@/components/dashboard/disclaimer-banner";
import { EmergencyHelpRow } from "@/components/dashboard/emergency-help-row";
import { FeatureTileRow } from "@/components/dashboard/feature-tile-row";
import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { HealthReminderCard } from "@/components/dashboard/health-reminder-card";
import { NearbyCareSection } from "@/components/dashboard/nearby-care-section";
import { PregnancyCareCard } from "@/components/dashboard/pregnancy-care-card";
import { UpcomingMedicineCard } from "@/components/dashboard/upcoming-medicine-card";

export function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <GreetingHeader />
        <DisclaimerBanner />
        <AskAiCard />

        <View className="flex-row gap-3 mx-5 mt-4">
          <PregnancyCareCard />
          <BabyCareDoctorsCard />
        </View>

        <EmergencyHelpRow />
        <NearbyCareSection />
        <HealthReminderCard />
        <FeatureTileRow />
        <UpcomingMedicineCard />
      </ScrollView>
    </SafeAreaView>
  );
}
