import { useTranslation } from "react-i18next";

import { ComingSoonScreen } from "@/components/dashboard/coming-soon-screen";

export default function FirstAidGuide() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      icon="medkit"
      title={t("dashboard.emergency.firstAidGuide")}
      message={t("dashboard.comingSoon.genericMessage")}
    />
  );
}
