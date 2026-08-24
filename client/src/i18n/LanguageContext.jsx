// src/i18n/LanguageContext.jsx
import { createContext, useContext, useState, useCallback } from "react";
import translations from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem("cl_lang") || "en"
  );

  const switchLang = useCallback((code) => {
    setLang(code);
    localStorage.setItem("cl_lang", code);
  }, []);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations["en"]?.[key] ?? key,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider>");
  return ctx;
}
