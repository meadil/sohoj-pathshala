import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReportScreen from '../../screens/student/tabs/ReportScreen';
import { ReportDetailScreen } from '../../screens/student/report';

const Stack = createNativeStackNavigator();

/**
 * ReportStackNavigator - Report tab stack: Report → ReportDetail.
 * Headerless (screens render their own headers).
 */
export default function ReportStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ReportMain" component={ReportScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
    </Stack.Navigator>
  );
}
