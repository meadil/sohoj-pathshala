import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUser } from '../../contexts/UserContext';
import { OnboardingProvider, useOnboarding } from '../../contexts/OnboardingContext';
import LandingScreen from '../../screens/student/LandingScreen';
import SignInScreen from '../../screens/student/SignInScreen';
import AccountStepScreen from '../../screens/student/onboarding/AccountStepScreen';
import OtpStepScreen from '../../screens/student/onboarding/OtpStepScreen';
import PasswordStepScreen from '../../screens/student/onboarding/PasswordStepScreen';
import NameStepScreen from '../../screens/student/onboarding/NameStepScreen';
import PhotoStepScreen from '../../screens/student/onboarding/PhotoStepScreen';
import TermsStepScreen from '../../screens/student/onboarding/TermsStepScreen';
import ClassStepScreen from '../../screens/student/onboarding/ClassStepScreen';
import RevealStepScreen from '../../screens/student/onboarding/RevealStepScreen';
import LocationStepScreen from '../../screens/student/onboarding/LocationStepScreen';
import StudentApp from './StudentApp';
import { colors } from '../../theme/theme';

const Stack = createNativeStackNavigator();

function OnboardingStack({ initialRouteName }) {
  // NOTE: OnboardingProvider lives ABOVE StudentRootNavigator (see the
  // default export below), so the routing guard and these screens share
  // one onboarding state. Do NOT wrap another provider here — a nested
  // provider would shadow the outer state and the guard below would
  // never see classLevelName.
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="OnboardingAccount" component={AccountStepScreen} />
      <Stack.Screen name="OnboardingOtp" component={OtpStepScreen} />
      <Stack.Screen name="OnboardingPassword" component={PasswordStepScreen} />
      <Stack.Screen name="OnboardingName" component={NameStepScreen} />
      <Stack.Screen name="OnboardingPhoto" component={PhotoStepScreen} />
      <Stack.Screen name="OnboardingTerms" component={TermsStepScreen} />
      <Stack.Screen name="OnboardingClass" component={ClassStepScreen} />
      <Stack.Screen name="OnboardingReveal" component={RevealStepScreen} />
      <Stack.Screen name="OnboardingLocation" component={LocationStepScreen} />
    </Stack.Navigator>
  );
}

export default function StudentRootNavigator() {
  return (
    <OnboardingProvider>
      <StudentRootNavigatorInner />
    </OnboardingProvider>
  );
}

function StudentRootNavigatorInner() {
  const { session, loading } = useUser();
  const { data: onboardingData } = useOnboarding();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Unauthenticated -> Landing Screen -> Onboarding / Sign In Stack.
  // NOTE: the onboardingComplete check comes FIRST — in bypass mode
  // there is never a session, so anything below the !session branch is
  // dead code for bypassed users.
  if (onboardingData?.onboardingComplete) {
    return <StudentApp />;
  }

  if (!session) {
    // key forces a remount when switching branches — without it React
    // keeps the mounted navigator and ignores the new initialRouteName,
    // stranding logged-out users on Step 2 (OnboardingOtp).
    return <OnboardingStack key="landing" initialRouteName="Landing" />;
  }

  // A signed-in user always goes to the app. This branch used to check
  // `!profile?.class_level_id` and route to OnboardingOtp, which was a
  // dead end for two reasons:
  //   1. UserContext's getSession() and onAuthStateChange both run on cold
  //      start and race, so `loading` can flip false while `profile` is still
  //      null — a returning user with a valid class level looked like they
  //      had none and landed on step 2.
  //   2. OnboardingContext is in-memory only, so there is no persisted
  //      progress to resume; a signed-in user restarted mid-onboarding has
  //      nothing to resume and cannot complete an OTP step they never started.
  // A session means the account exists, which is the only thing this needs.
  return <StudentApp />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
