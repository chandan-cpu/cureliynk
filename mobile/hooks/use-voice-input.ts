import Constants from "expo-constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import type { SupportedLanguage } from "@/i18n";

// Expo Go ships a fixed set of native modules baked into its own binary and
// can never include a third-party one like this — no rebuild changes that,
// only switching to a dev client does. Same check `lib/permissions.ts` uses
// to guard `expo-notifications`.
const isExpoGo = Constants.appOwnership === "expo";

/**
 * On-device speech-to-text for the chat composer's mic button.
 *
 * On-device recognition rather than recording + a server upload: it needs no
 * network round trip, keeps a symptom description off any server before the
 * user has chosen to send it, and follows the same permission pattern as
 * `lib/notification-scheduler` — unsupported inside Expo Go, real once the dev
 * client is rebuilt with the `expo-speech-recognition` config plugin.
 *
 * The package is `require`d lazily rather than statically imported: its
 * native module is only compiled in once that rebuild has happened, and
 * `expo-speech-recognition` throws the moment it is loaded — not just when
 * it's used — anywhere that hasn't (Expo Go, web, or simply a dev-client
 * build made before this package was added, which is exactly what a plain
 * top-level `import` would crash on). Mirrors `getNotificationsModule` in
 * `lib/permissions.ts`, which guards `expo-notifications` the same way.
 */
type SpeechRecognitionExports = typeof import("expo-speech-recognition");

let cachedModule: SpeechRecognitionExports | null | undefined;

function loadSpeechRecognition(): SpeechRecognitionExports | null {
  if (cachedModule !== undefined) return cachedModule;

  if (Platform.OS === "web" || isExpoGo) {
    cachedModule = null;
    return cachedModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
    cachedModule = require("expo-speech-recognition") as SpeechRecognitionExports;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}

function isRecognitionAvailable(mod: SpeechRecognitionExports): boolean {
  try {
    return mod.ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/** BCP-47 tags, closest to how each shipped language is actually spoken here. */
const RECOGNITION_LOCALE: Record<SupportedLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  as: "as-IN",
};

export type VoiceInputState =
  | { status: "idle" }
  | { status: "listening"; transcript: string }
  | { status: "denied" }
  /** Anything the device rejected outright — e.g. `as-IN` with no matching engine. */
  | { status: "unavailable" };

export type UseVoiceInputResult = {
  state: VoiceInputState;
  /** False on web, inside Expo Go, and on a dev-client build made before this native module existed. */
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

/**
 * @param onTranscript Called with the live transcript on every recognition
 *   result. This is how the text reaches the composer: pushing it from the
 *   event is what lets the composer keep the spoken words after recognition
 *   ends, without mirroring `state.transcript` into its own state from an
 *   effect — which is a cascading render, and what `react-hooks/set-state-in-effect`
 *   exists to catch.
 */
export function useVoiceInput(
  language: SupportedLanguage,
  onTranscript?: (transcript: string) => void,
): UseVoiceInputResult {
  const [state, setState] = useState<VoiceInputState>({ status: "idle" });

  // Held in a ref so the subscription effect below does not list the callback
  // as a dependency — an unmemoised one would tear down and re-add the native
  // listeners on every render.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });
  // Lazy initialiser: the require (and its try/catch) runs once per mount,
  // never on every render.
  const [mod] = useState(loadSpeechRecognition);
  const isSupported = mod !== null && isRecognitionAvailable(mod);

  // Plain event subscriptions rather than the package's `useSpeechRecognitionEvent`
  // hook: that hook comes from `mod`, which may be null, and a hook can't be
  // called conditionally. A single always-called `useEffect` whose *body*
  // branches on `mod` has no such restriction.
  useEffect(() => {
    if (!mod) return;
    const { ExpoSpeechRecognitionModule } = mod;

    const subscriptions = [
      ExpoSpeechRecognitionModule.addListener("result", (event) => {
        const transcript = event.results[0]?.transcript ?? "";
        setState((current) =>
          current.status === "listening" ? { status: "listening", transcript } : current,
        );
        onTranscriptRef.current?.(transcript);
      }),
      ExpoSpeechRecognitionModule.addListener("end", () => {
        setState((current) => (current.status === "listening" ? { status: "idle" } : current));
      }),
      ExpoSpeechRecognitionModule.addListener("error", (event) => {
        // "no-speech"/"aborted"/"speech-timeout" are just how a tap-to-stop or
        // a pause in speech surfaces on some platforms, not a real failure.
        if (event.error === "no-speech" || event.error === "aborted" || event.error === "speech-timeout") {
          setState({ status: "idle" });
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setState({ status: "denied" });
        } else {
          setState({ status: "unavailable" });
        }
      }),
    ];

    // A screen navigated away from mid-listen should not keep the microphone
    // hot in the background.
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      ExpoSpeechRecognitionModule.abort();
    };
  }, [mod]);

  const start = useCallback(async () => {
    if (!mod || !isSupported) return;

    const permission = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setState({ status: "denied" });
      return;
    }

    setState({ status: "listening", transcript: "" });
    mod.ExpoSpeechRecognitionModule.start({
      lang: RECOGNITION_LOCALE[language],
      interimResults: true,
      continuous: true,
    });
  }, [mod, isSupported, language]);

  const stop = useCallback(() => {
    mod?.ExpoSpeechRecognitionModule.stop();
  }, [mod]);

  return { state, isSupported, start, stop };
}
