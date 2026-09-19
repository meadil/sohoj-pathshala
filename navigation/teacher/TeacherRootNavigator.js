import React from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import StatusChip from '../../components/StatusChip';
import { useUser } from '../../contexts/UserContext';
import PendingApprovalScreen from '../../screens/teacher/PendingApprovalScreen';
import RejectedApprovalScreen from '../../screens/teacher/RejectedApprovalScreen';
import TeacherAuthScreen from '../../screens/teacher/TeacherAuthScreen';
import TeacherApp from './TeacherApp';
import { colors, spacing, typography } from '../../theme/theme';

function AccessDeniedScreen({ onSignOut }) {
  return (
    <SafeAreaView style={styles.accessDeniedContainer}>
      <View style={styles.accessDeniedContent}>
        <Card variant="elevated" style={styles.accessDeniedCard}>
          <StatusChip label="Access Restricted" status="danger" size="md" />
          <Text style={styles.accessDeniedTitle}>Student Account Detected</Text>
          <Text style={styles.accessDeniedText}>
            This account is registered as a student. The Sohoj Shikkhok portal is reserved for teachers and course instructors.
          </Text>
          <Text style={styles.accessDeniedHint}>
            Please launch the Sohoj Pathshala student app to access your courses, or sign out and log in with your teacher credentials.
          </Text>
          <Button
            title="Sign Out"
            variant="primary"
            size="md"
            onPress={onSignOut}
            style={styles.signOutBtn}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

export default function TeacherRootNavigator() {
  const { session, profile, loading, isOwner, role, teacherApprovalStatus, signOut } = useUser();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Unauthenticated -> Teacher Login / Application
  if (!session) {
    return <TeacherAuthScreen />;
  }

  // Owner always has access
  if (isOwner) {
    return <TeacherApp />;
  }

  // Guard: Student credentials logged into Teacher app binary
  if (role !== 'teacher') {
    return <AccessDeniedScreen onSignOut={signOut} />;
  }

  // Teacher Approval State Guard
  if (teacherApprovalStatus === 'rejected') {
    return <RejectedApprovalScreen />;
  }

  if (teacherApprovalStatus === 'pending') {
    return <PendingApprovalScreen />;
  }

  // Approved teacher -> Main Teacher Stack
  return <TeacherApp />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessDeniedContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  accessDeniedContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  accessDeniedCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  accessDeniedTitle: {
    ...typography.title2,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  accessDeniedText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  accessDeniedHint: {
    ...typography.subhead,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  signOutBtn: {
    width: '100%',
  },
});
