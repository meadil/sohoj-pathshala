import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExploreScreen from '../../screens/student/tabs/ExploreScreen';
import {
  CourseDetailScreen,
  PayIntroScreen,
  PayPendingScreen,
  PayTrxIDScreen,
  HowToPayScreen,
} from '../../screens/student/explore';

const Stack = createNativeStackNavigator();

/**
 * ExploreStackNavigator - Explore tab stack: Explore → CourseDetail →
 * PayIntro → PayTrxID → PayPending, plus HowToPay (video guide).
 * Headerless (screens render their own headers); the bottom tab bar
 * stays visible on pushed screens. courseId travels via route params
 * through the whole flow.
 */
export default function ExploreStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ExploreMain" component={ExploreScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="PayIntro" component={PayIntroScreen} />
      <Stack.Screen name="PayTrxID" component={PayTrxIDScreen} />
      <Stack.Screen name="PayPending" component={PayPendingScreen} />
      <Stack.Screen name="HowToPay" component={HowToPayScreen} />
    </Stack.Navigator>
  );
}
