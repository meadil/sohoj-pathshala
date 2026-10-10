import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { createNavigationContainerRef } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

// Remote push was removed from Expo Go (SDK 53+) and merely importing
// expo-notifications there throws at load time. Require lazily so the
// whole app doesn't red-screen in Expo Go; every function below no-ops
// when Notifications is null. Real push still works in the dev build.
let Notifications = null;
try {
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
} catch (err) {
  console.warn('Push: expo-notifications unavailable (Expo Go?) — push disabled.');
  Notifications = null;
}

/**
 * NotificationsService - Expo push registration + tap routing.
 * Push tokens require ALL of: physical device, user permission, an
 * EAS projectId, AND (for delivery) APNs/FCM server credentials on
 * the Expo dashboard. Every unavailable piece degrades to a warn —
 * nothing here throws, so the app boots fine without push.
 *
 * HUMAN PREREQUISITES (not done — see STATUS.md):
 * 1. SQL: ALTER TABLE public.profiles ADD COLUMN push_token TEXT;
 *    (without it the persist step fails honestly and warns)
 * 2. Link an EAS project (no projectId exists in eas.json yet) so
 *    getExpoPushTokenAsync can mint tokens.
 * 3. Upload APNs key / FCM server key on the Expo dashboard.
 */
export const navigationRef = createNavigationContainerRef();

if (Notifications) {
  // This runs at MODULE SCOPE, before React renders. In Expo Go the require()
  // above fails so this block never executes — but in a standalone APK
  // expo-notifications loads, and this unguarded native call was the one
  // code path that could take the whole app down at launch. Push is optional,
  // so it must never be able to kill startup.
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('Push: setNotificationHandler failed — push disabled.', err?.message);
    Notifications = null;
  }
}

async function ensureAndroidChannel() {
  if (!Notifications) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

function resolveProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    null
  );
}

/**
 * Acquire an Expo push token and persist it to the user's profile row.
 * Returns the token string, or null when push is unavailable for any
 * reason (simulator, denied permission, no projectId, missing column).
 * Call after a session exists; safe to call without one (no-ops).
 */
export async function registerForPushNotifications(userId) {
  try {
    if (!Notifications) {
      return null;
    }
    if (!userId) {
      return null;
    }
    if (!Device.isDevice) {
      console.warn('Push: simulators cannot receive push tokens — skipping.');
      return null;
    }
    await ensureAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } =
      existing === 'granted'
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Push: permission denied — skipping token registration.');
      return null;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      console.warn(
        'Push: no EAS projectId found (eas.json / EXPO_PUBLIC_EAS_PROJECT_ID) — cannot mint a token.'
      );
      return null;
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) {
      return null;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
      if (error) throw error;
    } catch (err) {
      console.warn(
        'Push: could not store token (profiles.push_token likely missing — run: ALTER TABLE public.profiles ADD COLUMN push_token TEXT):',
        err?.message
      );
    }
    return token;
  } catch (err) {
    console.warn('Push: registration failed:', err?.message);
    return null;
  }
}

/**
 * Fire-and-forget token sync for auth handlers. Never rejects.
 */
export function syncPushTokenForUser(userId) {
  registerForPushNotifications(userId).catch((err) => {
    console.warn('Push: background sync failed:', err?.message);
  });
}

/**
 * Route a tapped notification by its data payload. Student routes
 * only — push triggers notify students, and teacher binaries have no
 * matching routes (guarded: unknown/unmounted targets warn, never
 * crash).
 */
export function handleNotificationResponse(response) {
  try {
    const data = response?.notification?.request?.content?.data || {};
    if (!navigationRef.isReady()) {
      console.warn('Push: tap arrived before navigation was ready — dropped.', data);
      return;
    }
    switch (data.type) {
      case 'free_video':
        if (data.courseId) {
          navigationRef.navigate('Dashboard', {
            screen: 'CourseHome',
            params: { courseId: data.courseId },
          });
        } else {
          navigationRef.navigate('Dashboard');
        }
        break;
      case 'payment_status':
        navigationRef.navigate('More', { screen: 'PaymentHistory' });
        break;
      case 'announcement':
        navigationRef.navigate('More', { screen: 'Notifications' });
        break;
      default:
        console.warn('Push: unknown notification type — opening Dashboard.', data);
        navigationRef.navigate('Dashboard');
        break;
    }
  } catch (err) {
    console.warn('Push: tap routing failed:', err?.message);
  }
}

/**
 * Attach foreground + tap listeners. Returns an unsubscribe function.
 * Safe to call once at the root navigator mount.
 */
export function setupNotificationListeners() {
  if (!Notifications) {
    return () => {};
  }
  const received = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification?.request?.content?.data || {};
    console.log('Push: foreground notification received.', data);
  });
  const tapped = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );
  return () => {
    received.remove();
    tapped.remove();
  };
}
