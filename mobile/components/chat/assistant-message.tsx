import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Linking, Text, TouchableOpacity, View } from "react-native";

import { BoldMarkedText, useIndicScript } from "@/components/chat/chat-text";
import { DoctorSuggestionCard } from "@/components/chat/doctor-suggestion-card";
import { UrgencyBanner } from "@/components/chat/urgency-banner";
import type { AssistantAnswer } from "@/lib/chat";

/** India's ambulance number, shown on emergency answers. */
const AMBULANCE_NUMBER = "108";

/**
 * The reply, rendered flat on the background rather than in a bubble: the
 * backend's explanation, the specialty it routed to, the clinics it found,
 * and — on emergencies only — the red banner and the ambulance button in
 * place of the "show all" link.
 */
export function AssistantMessage({
  answer,
  showLocationHint = false,
}: {
  answer: AssistantAnswer;
  /** Explains an empty doctor list when location was never shared. */
  showLocationHint?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const indic = useIndicScript();

  const isEmergency = answer.urgency === "emergency";
  const hasDoctors = answer.doctors.length > 0;

  return (
    <View className="gap-3.5">
      {isEmergency ? <UrgencyBanner /> : null}

      {/* The backend writes this sentence; it is already in the user's
          language and is the only place the answer's substance lives. */}
      <BoldMarkedText
        className={`text-content dark:text-content-dark ${
          indic ? "text-sm leading-7" : "text-[14.5px] leading-6"
        }`}
      >
        {answer.reason}
      </BoldMarkedText>

      <Text
        className={`text-content dark:text-content-dark font-semibold ${
          indic ? "text-[13.5px] leading-6" : "text-sm leading-5"
        }`}
      >
        {t("chat.seeA", { doctorType: answer.doctorType })}
      </Text>

      {isEmergency ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${AMBULANCE_NUMBER}`)}
          activeOpacity={0.85}
          accessibilityRole="button"
          className="h-[52px] items-center justify-center rounded-[26px] bg-danger"
        >
          <Text className="text-base font-semibold text-white">{t("chat.callAmbulance")}</Text>
        </TouchableOpacity>
      ) : null}

      {hasDoctors ? (
        <>
          <Text
            className={`text-muted dark:text-muted-dark ${
              indic ? "text-[13px] leading-6" : "text-[13.5px] leading-5"
            }`}
          >
            {t("chat.doctorsIntro", { count: answer.doctors.length })}
          </Text>

          <View className="gap-[9px]">
            {answer.doctors.map((doctor) => (
              <DoctorSuggestionCard key={doctor.id} doctor={doctor} />
            ))}
          </View>
        </>
      ) : (
        <Text
          className={`text-muted dark:text-muted-dark ${
            indic ? "text-[13px] leading-6" : "text-[13.5px] leading-5"
          }`}
        >
          {t(showLocationHint ? "chat.noDoctorsNoLocation" : "chat.noDoctors")}
        </Text>
      )}

      {isEmergency ? (
        <Text
          className={`text-muted dark:text-muted-dark opacity-80 ${
            indic ? "text-xs leading-6" : "text-xs leading-5"
          }`}
        >
          {t("chat.emergencyDisclaimer")}
        </Text>
      ) : (
        <TouchableOpacity
          // Hands the department to the existing results screen, so "show all"
          // lands on the full Places search rather than these three rows. The
          // department comes from the canonical English specialty, so this
          // works identically in every language.
          onPress={() =>
            router.push({
              pathname: "/doctors-results",
              params: { department: answer.department, title: answer.specialty },
            })
          }
          activeOpacity={0.7}
          accessibilityRole="button"
          className="self-start"
        >
          <Text className="text-[13px] font-medium text-brand-dark dark:text-brand">
            {t("chat.showAllNearby", { specialty: answer.specialty })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
