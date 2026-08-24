import { useCallback } from "react";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

// Required once so the in-app browser closes itself after the OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

// expo-auth-session throws synchronously (crashing the screen) if the client ID
// for the *current* platform is undefined, so a placeholder keeps the hook safe
// to call before real Google Cloud Console credentials are configured — the
// sign-in attempt is rejected gracefully instead of the app crashing on mount.
const UNCONFIGURED = "not-configured";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

const currentPlatformClientId =
  Platform.OS === "ios" ? iosClientId : Platform.OS === "android" ? androidClientId : webClientId;

export type GoogleSignInResult =
  | { type: "success"; idToken: string }
  | { type: "cancelled" }
  | { type: "error"; message: string };

export function useGoogleSignIn() {
  const [, , prompt] = Google.useIdTokenAuthRequest({
    webClientId: webClientId || UNCONFIGURED,
    iosClientId: iosClientId || UNCONFIGURED,
    androidClientId: androidClientId || UNCONFIGURED,
  });

  const promptGoogleSignIn = useCallback(async (): Promise<GoogleSignInResult> => {
    if (!currentPlatformClientId) {
      return {
        type: "error",
        message: "Google sign-in isn't configured yet for this platform. Add a Google OAuth client ID to mobile/.env.",
      };
    }

    const result = await prompt();

    if (result.type !== "success") {
      return result.type === "dismiss" || result.type === "cancel"
        ? { type: "cancelled" }
        : { type: "error", message: "Google sign-in failed. Please try again." };
    }

    const idToken = result.params.id_token;
    if (!idToken) {
      return { type: "error", message: "Google didn't return an ID token." };
    }

    return { type: "success", idToken };
  }, [prompt]);

  return { promptGoogleSignIn, redirectUri: AuthSession.makeRedirectUri() };
}
