import { useState, useRef, useEffect } from "react";
import { useLang } from "../../i18n/LanguageContext";

const LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "as", label: "Assamese", native: "অসমীয়া", flag: "🇮🇳" },
];

export default function LanguageSwitcher({ compact = false }) {
  const { lang, switchLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={t("selectLanguage")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: compact ? "6px 10px" : "7px 13px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "20px",
          cursor: "pointer",
          color: "white",
          fontSize: "13px",
          fontWeight: "600",
          fontFamily: "inherit",
          transition: "all 0.18s",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "15px" }}>{current.flag}</span>
        {!compact && (
          <span style={{ maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis" }}>
            {current.native}
          </span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.18s", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "white",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            zIndex: 200,
            minWidth: "170px",
            animation: "fadeSlideIn 0.15s ease",
          }}
        >
          <div
            style={{
              padding: "10px 14px 6px",
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            {t("selectLanguage")}
          </div>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { switchLang(l.code); setOpen(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                background: lang === l.code ? "#f0fdf4" : "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: "18px" }}>{l.flag}</span>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: "600", color: lang === l.code ? "#16a34a" : "#0f172a" }}>
                  {l.native}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{l.label}</div>
              </div>
              {lang === l.code && (
                <span style={{ marginLeft: "auto", color: "#16a34a" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
