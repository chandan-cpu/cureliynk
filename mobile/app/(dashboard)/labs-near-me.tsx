import { useTranslation } from "react-i18next";

import { ComingSoonScreen } from "@/components/dashboard/coming-soon-screen";

export default function LabsNearMe() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      icon="flask"
      title={t("dashboard.features.labsNearMe.title")}
      message={t("dashboard.comingSoon.genericMessage")}
    />
  );
}
