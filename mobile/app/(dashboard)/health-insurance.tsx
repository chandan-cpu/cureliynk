import { useTranslation } from "react-i18next";

import { ComingSoonScreen } from "@/components/dashboard/coming-soon-screen";

export default function HealthInsurance() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      icon="shield-checkmark"
      title={t("dashboard.features.healthInsurance.title")}
      message={t("dashboard.comingSoon.genericMessage")}
    />
  );
}
