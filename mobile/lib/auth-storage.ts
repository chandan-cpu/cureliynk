import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "cureliynk.accessToken";
const REFRESH_TOKEN_KEY = "cureliynk.refreshToken";

// expo-secure-store has no web implementation (there's no OS-level secure
// enclave in a browser) — calling it there throws. Fall back to AsyncStorage
// on web; native platforms keep using the real Keychain/Keystore-backed store.
const isWeb = Platform.OS === "web";

function getItem(key: string): Promise<string | null> {
  return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) await AsyncStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) await AsyncStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([setItem(ACCESS_TOKEN_KEY, accessToken), setItem(REFRESH_TOKEN_KEY, refreshToken)]);
}

/**
 * Replaces just the access token, leaving the refresh token in place.
 *
 * `POST /api/v1/auth/refresh-token` returns only a new access token — the
 * refresh token is not rotated — so writing both back would mean writing the
 * refresh token over itself.
 */
export async function saveAccessToken(accessToken: string): Promise<void> {
  await setItem(ACCESS_TOKEN_KEY, accessToken);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
}
