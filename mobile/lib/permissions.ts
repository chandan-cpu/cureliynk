import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from "expo-audio";

export type DevicePermissionId = "location" | "camera" | "notifications" | "microphone";

// expo-notifications throws at import time under Expo Go (push-token
// auto-registration was removed from Expo Go in SDK 53), so it's `require`d
// lazily and only outside Expo Go. See https://expo.fyi/dev-client
const isExpoGo = Constants.appOwnership === "expo";

function getNotificationsModule(): typeof import("expo-notifications") | null {
  if (isExpoGo) return null;
  return require("expo-notifications") as typeof import("expo-notifications");
}

async function getNotificationStatus() {
  const Notifications = getNotificationsModule();
  return Notifications ? Notifications.getPermissionsAsync() : { granted: false };
}

async function requestNotificationStatus() {
  const Notifications = getNotificationsModule();
  return Notifications ? Notifications.requestPermissionsAsync() : { granted: false };
}

const HANDLERS: Record<
  DevicePermissionId,
  {
    getStatus: () => Promise<{ granted: boolean }>;
    request: () => Promise<{ granted: boolean }>;
  }
> = {
  location: {
    getStatus: Location.getForegroundPermissionsAsync,
    request: Location.requestForegroundPermissionsAsync,
  },
  camera: {
    getStatus: ImagePicker.getCameraPermissionsAsync,
    request: ImagePicker.requestCameraPermissionsAsync,
  },
  notifications: {
    getStatus: getNotificationStatus,
    request: requestNotificationStatus,
  },
  microphone: {
    getStatus: getRecordingPermissionsAsync,
    request: requestRecordingPermissionsAsync,
  },
};

export async function getPermissionGranted(id: DevicePermissionId): Promise<boolean> {
  const { granted } = await HANDLERS[id].getStatus();
  return granted;
}

export async function requestPermissionGranted(id: DevicePermissionId): Promise<boolean> {
  const { granted } = await HANDLERS[id].request();
  return granted;
}
