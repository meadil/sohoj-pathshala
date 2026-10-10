import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Constants from 'expo-constants';
import StudentRootNavigator from './student/StudentRootNavigator';
import TeacherRootNavigator from './teacher/TeacherRootNavigator';
import { linking } from '../lib/linking';
// Push is optional. NotificationsService performs native work at module scope,
// so a top-level import here could abort the entire navigation tree at startup
// (an uncaught error in a release build closes the app silently — no redbox).
// Import it defensively and fall back to no-op stubs.
let navigationRef = null;
let setupNotificationListeners = () => () => {};
try {
  // eslint-disable-next-line global-require
  ({ navigationRef, setupNotificationListeners } = require('../services/NotificationsService'));
} catch (err) {
  console.warn('Push: NotificationsService unavailable — push disabled.', err?.message);
}

/**
 * RootNavigator - Top-level build target router.
 * Target is decided strictly at build-time via app.config.js (extra.appTarget)
 * or EXPO_PUBLIC_APP_TARGET.
 * - 'teacher': Bundles and routes the Teacher & Owner navigation hierarchy
 * - 'student' (default): Bundles and routes the Student navigation hierarchy
 *
 * Screens themselves never contain cross-target role branches.
 */
export default function RootNavigator() {
  const target =
    Constants.expoConfig?.extra?.appTarget ||
    process.env.EXPO_PUBLIC_APP_TARGET ||
    process.env.APP_TARGET ||
    'student';

  const isTeacherTarget = target === 'teacher';

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = setupNotificationListeners();
    } catch (err) {
      console.warn('Push: listener setup failed — push disabled.', err?.message);
      return undefined;
    }
    return typeof unsubscribe === 'function' ? unsubscribe : undefined;
  }, []);

  return (
    <NavigationContainer ref={navigationRef || undefined} linking={linking}>
      {isTeacherTarget ? <TeacherRootNavigator /> : <StudentRootNavigator />}
    </NavigationContainer>
  );
}
