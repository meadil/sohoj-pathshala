import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TeacherMoreScreen from '../../screens/teacher/tabs/TeacherMoreScreen';
import TeacherReportScreen from '../../screens/teacher/TeacherReportScreen';
import OwnerApprovalsScreen from '../../screens/teacher/OwnerApprovalsScreen';
import OwnerAnnouncementsScreen from '../../screens/teacher/OwnerAnnouncementsScreen';
import OwnerBannersScreen from '../../screens/teacher/OwnerBannersScreen';
import TeacherFreeVideosScreen from '../../screens/teacher/TeacherFreeVideosScreen';
import TeacherQuizzesScreen from '../../screens/teacher/TeacherQuizzesScreen';
import TeacherQuizEditorScreen from '../../screens/teacher/TeacherQuizEditorScreen';

const Stack = createNativeStackNavigator();

/**
 * TeacherMoreStack - More tab stack: More → Report / Approvals /
 * Announcements / FreeVideos. Headerless (screens render their own
 * headers). Legal doc param ('privacy' | 'terms') travels via route
 * params; Approvals/Announcements are owner-gated by role at the
 * menu level (rows only render for owners).
 */
export default function TeacherMoreStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MoreMain" component={TeacherMoreScreen} />
      <Stack.Screen name="Report" component={TeacherReportScreen} />
      <Stack.Screen name="Approvals" component={OwnerApprovalsScreen} />
      <Stack.Screen name="Announcements" component={OwnerAnnouncementsScreen} />
      <Stack.Screen name="Banners" component={OwnerBannersScreen} />
      <Stack.Screen name="FreeVideos" component={TeacherFreeVideosScreen} />
      <Stack.Screen name="Quizzes" component={TeacherQuizzesScreen} />
      <Stack.Screen name="QuizEditor" component={TeacherQuizEditorScreen} />
    </Stack.Navigator>
  );
}
