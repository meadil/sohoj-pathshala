import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../../screens/student/tabs/DashboardScreen';
import {
  CourseHomeScreen,
  CQListScreen,
  CQSubjectScreen,
  CQVideosScreen,
  CQWatchScreen,
  MCQListScreen,
  MCQSubjectScreen,
  MCQDeckPlayerScreen,
  WeeklyQuizScreen,
  FreeVideosScreen,
  FreeWatchScreen,
} from '../../screens/student/course';

const Stack = createNativeStackNavigator();

/**
 * CourseStackNavigator - Dashboard tab stack: Dashboard → CourseHome →
 * CQList → CQSubject → CQVideos → CQWatch, plus MCQList → MCQSubject
 * → MCQDeck (deck/quiz player), plus WeeklyQuiz (live quiz list) and
 * FreeVideos (free classes page).
 * Headerless (screens render their own headers); courseId/subjectId/
 * chapterId travel via route params. Entry points: Dashboard Continue
 * cards (real confirmed purchases, plus a marked bypass preview) and
 * CourseDetail "open" for confirmed buyers (cross-tab navigate).
 */
export default function CourseStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DashboardMain" component={DashboardScreen} />
      <Stack.Screen name="CourseHome" component={CourseHomeScreen} />
      <Stack.Screen name="CQList" component={CQListScreen} />
      <Stack.Screen name="CQSubject" component={CQSubjectScreen} />
      <Stack.Screen name="CQVideos" component={CQVideosScreen} />
      <Stack.Screen name="CQWatch" component={CQWatchScreen} />
      <Stack.Screen name="MCQList" component={MCQListScreen} />
      <Stack.Screen name="MCQSubject" component={MCQSubjectScreen} />
      <Stack.Screen name="MCQDeck" component={MCQDeckPlayerScreen} />
      <Stack.Screen name="WeeklyQuiz" component={WeeklyQuizScreen} />
      <Stack.Screen name="FreeVideos" component={FreeVideosScreen} />
      <Stack.Screen name="FreeWatch" component={FreeWatchScreen} />
    </Stack.Navigator>
  );
}
