import { useTranslation } from "react-i18next";

import { ComingSoonScreen } from "@/components/dashboard/coming-soon-screen";

export default function MedicineReminder() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      icon="alarm"
      title={t("dashboard.features.medicineReminder.title")}
      message={t("dashboard.comingSoon.genericMessage")}
    />
  );
}
