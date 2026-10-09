import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TeacherCoursesScreen from '../../screens/teacher/tabs/TeacherCoursesScreen';
import TeacherCourseEditorScreen from '../../screens/teacher/TeacherCourseEditorScreen';
import TeacherSubjectDetailScreen from '../../screens/teacher/TeacherSubjectDetailScreen';
import TeacherChapterDetailScreen from '../../screens/teacher/TeacherChapterDetailScreen';
import TeacherMCQEditorScreen from '../../screens/teacher/TeacherMCQEditorScreen';
import TeacherVideoNotesScreen from '../../screens/teacher/TeacherVideoNotesScreen';
import TeacherFreeVideosScreen from '../../screens/teacher/TeacherFreeVideosScreen';

const Stack = createNativeStackNavigator();

/**
 * TeacherCoursesStack - Courses tab stack: Courses → CourseEditor,
 * Courses → FreeVideos. Headerless (screens render their own
 * headers); courseId travels via route params.
 */
export default function TeacherCoursesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CoursesMain" component={TeacherCoursesScreen} />
      <Stack.Screen name="CourseEditor" component={TeacherCourseEditorScreen} />
      <Stack.Screen name="SubjectDetail" component={TeacherSubjectDetailScreen} />
      <Stack.Screen name="ChapterDetail" component={TeacherChapterDetailScreen} />
      <Stack.Screen name="MCQEditor" component={TeacherMCQEditorScreen} />
      <Stack.Screen name="VideoNotes" component={TeacherVideoNotesScreen} />
      <Stack.Screen name="FreeVideos" component={TeacherFreeVideosScreen} />
    </Stack.Navigator>
  );
}
