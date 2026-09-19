import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import StatusChip from '../../components/StatusChip';
import { useUser } from '../../contexts/UserContext';
import { colors, spacing, typography } from '../../theme/theme';

export default function PendingApprovalScreen() {
  const { profile, refreshProfile, signOut } = useUser();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card variant="elevated" style={styles.card}>
          <View style={styles.chipRow}>
            <StatusChip label="Under Review" status="pending" size="md" />
          </View>

          <Text style={styles.title}>Application Pending</Text>
          <Text style={styles.subtitle}>
            Hello {profile?.nickname || profile?.name || 'Teacher'}, your application is under review.
          </Text>

          <Text style={styles.description}>
            The owner will verify your credentials and approve your account shortly. Once approved, you will have full access to course creation, CQ video management, and MCQ quizzes.
          </Text>

          <View style={styles.actionColumn}>
            <Button
              title="Check Status"
              variant="primary"
              size="lg"
              onPress={refreshProfile}
              style={styles.button}
            />
            <Button
              title="Sign Out"
              variant="ghost"
              size="md"
              onPress={signOut}
            />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  chipRow: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyBold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  actionColumn: {
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    marginBottom: spacing.xs,
  },
});
