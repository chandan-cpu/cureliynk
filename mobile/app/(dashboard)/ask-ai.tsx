import { useTranslation } from "react-i18next";

import { ComingSoonScreen } from "@/components/dashboard/coming-soon-screen";

/** Entry point only — a teammate is building the real AI chat screen separately. */
export default function AskAi() {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      icon="sparkles"
      title={t("dashboard.askAi.cardTitle")}
      message={t("dashboard.comingSoon.genericMessage")}
    />
  );
}
