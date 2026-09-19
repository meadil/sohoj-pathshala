import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Constants from 'expo-constants';
import StudentRootNavigator from './student/StudentRootNavigator';
import TeacherRootNavigator from './teacher/TeacherRootNavigator';

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

  return (
    <NavigationContainer>
      {isTeacherTarget ? <TeacherRootNavigator /> : <StudentRootNavigator />}
    </NavigationContainer>
  );
}
