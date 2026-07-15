// Push notifications (Expo Notifications — Session 12).
//
// Permission policy (Agent 04 charter): we NEVER prompt on launch. On launch we
// only register the device IF permission was already granted. The permission
// prompt is triggered once, AFTER the customer's first order. If they deny, the
// caller shows an in-app explainer linking to OS settings.
//
// Token lifecycle: registered with the API on every launch (Expo tokens can
// rotate) and deleted on logout. Sending happens server-side (pushService.js)
// when an admin changes an order's status.
//
// EAS projectId note: minting an Expo push token needs an EAS projectId, which
// arrives when the owner runs `eas init` in S13. Until then this module degrades
// gracefully — it still creates the Android channel and can request permission,
// but skips token minting (and logs why) instead of crashing.
import { useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { authState, deviceTokenApi } from '@joy-curry/core';

const ORDERS_CHANNEL = 'orders';
const PROMPTED_KEY = 'jc_push_prompted';

// Foreground presentation: show the banner + list entry, play a sound. (SDK 57
// handler shape — shouldShowBanner/shouldShowList replaced shouldShowAlert.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let cachedToken: string | null = null;

function platformTag(): 'ios' | 'android' | 'unknown' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'unknown';
}

function getProjectId(): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extra = (Constants.expoConfig?.extra as any)?.eas?.projectId;
  return extra ?? Constants.easConfig?.projectId ?? undefined;
}

// Android 13+ shows the OS permission prompt only once at least one channel
// exists — so the channel must be created before requesting permission.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL, {
    name: 'Order updates',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function mintExpoToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators/emulators can't get a push token
  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[push] no EAS projectId yet — token minting deferred to S13 (eas init)');
    return null;
  }
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn('[push] getExpoPushTokenAsync failed:', err);
    return null;
  }
}

// Mint the token and register it with the API (requires an auth session).
async function syncTokenToApi(): Promise<void> {
  const authToken = authState.get().token;
  if (!authToken) return;
  await ensureAndroidChannel();
  const token = await mintExpoToken();
  if (!token) return;
  cachedToken = token;
  try {
    await deviceTokenApi.register(token, platformTag(), authToken);
  } catch (err) {
    console.warn('[push] device-token register failed:', err);
  }
}

/**
 * Launch-time registration. Registers the device ONLY if the user already
 * granted notification permission — never prompts. No-ops when signed out.
 */
export async function ensurePushRegistered(): Promise<void> {
  if (!authState.get().token) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await syncTokenToApi();
}

export type PushPromptResult = 'granted' | 'denied' | 'unsupported' | 'already';

/**
 * Ask for notification permission, then register. Call this AFTER the first
 * order. Returns 'denied' if the user declines (caller shows the settings
 * explainer) and 'already' if permission was granted before.
 */
export async function promptAndRegisterPush(): Promise<PushPromptResult> {
  if (!Device.isDevice) return 'unsupported';
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') {
    await syncTokenToApi();
    return 'already';
  }
  if (!existing.canAskAgain) return 'denied'; // previously denied at OS level

  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (req.status !== 'granted') return 'denied';

  await syncTokenToApi();
  return 'granted';
}

/**
 * Prompt for notification permission exactly once, AFTER the first order.
 * Persists a flag so we never nag on subsequent orders. On denial, shows an
 * in-app explainer that links to OS settings (Agent 04 charter).
 */
export async function maybePromptAfterFirstOrder(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(PROMPTED_KEY)) return; // asked once already
    await AsyncStorage.setItem(PROMPTED_KEY, '1');

    const result = await promptAndRegisterPush();
    if (result === 'denied') {
      Alert.alert(
        'Get order updates',
        'Turn on notifications and we\'ll ping you when your order is confirmed, ready, and on its way. You can enable them anytime in Settings.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  } catch (err) {
    console.warn('[push] maybePromptAfterFirstOrder error:', err);
  }
}

/**
 * Delete this device's token on logout. MUST be called BEFORE clearAuth() —
 * it needs the still-valid auth token to authorize the delete.
 */
export async function unregisterPush(): Promise<void> {
  const authToken = authState.get().token;
  if (!cachedToken || !authToken) return;
  try {
    await deviceTokenApi.remove(cachedToken, authToken);
  } catch {
    /* best-effort — logout proceeds regardless */
  }
  cachedToken = null;
}

/**
 * Mount once in the root layout. Handles a notification TAP (both while running
 * and cold-start) by deep-linking into the order tracker. The push payload sets
 * data.orderId (see services/pushService.js).
 */
export function usePushTapHandler(): void {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!lastResponse) return;
    const req = lastResponse.notification.request;
    // Guard: useLastNotificationResponse holds the value across renders, so only
    // act on each response once.
    if (handledId.current === req.identifier) return;
    handledId.current = req.identifier;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = req.content.data as any;
    const orderId = data?.orderId;
    if (orderId) {
      router.push({ pathname: '/track', params: { id: String(orderId) } });
    }
  }, [lastResponse, router]);
}
