import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TeacherStudentsScreen from '../../screens/teacher/tabs/TeacherStudentsScreen';
import TeacherStudentDetailScreen from '../../screens/teacher/TeacherStudentDetailScreen';

const Stack = createNativeStackNavigator();

/**
 * TeacherStudentsStack - Students tab stack: Students →
 * StudentDetail (student object via route params). Headerless.
 */
export default function TeacherStudentsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="StudentsMain" component={TeacherStudentsScreen} />
      <Stack.Screen name="StudentDetail" component={TeacherStudentDetailScreen} />
    </Stack.Navigator>
  );
}
