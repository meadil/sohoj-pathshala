import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreScreen from '../../screens/student/tabs/MoreScreen';
import {
  LegalScreen,
  NotificationsScreen,
  PaymentHistoryScreen,
} from '../../screens/student/more';

const Stack = createNativeStackNavigator();

/**
 * MoreStackNavigator - More tab stack: More → PaymentHistory / Legal /
 * Notifications. Headerless (screens render their own headers). Legal
 * takes a doc param ('privacy' default, 'terms').
 */
export default function MoreStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MoreMain" component={MoreScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
