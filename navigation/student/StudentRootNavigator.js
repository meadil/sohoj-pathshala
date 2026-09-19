import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useUser } from '../../contexts/UserContext';
import StudentAuthScreen from '../../screens/student/StudentAuthScreen';
import StudentApp from './StudentApp';
import { colors } from '../../theme/theme';

export default function StudentRootNavigator() {
  const { session, loading } = useUser();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Unauthenticated -> Student Auth (Sign Up / Sign In)
  if (!session) {
    return <StudentAuthScreen />;
  }

  // Authenticated Student -> Main App Stack
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
