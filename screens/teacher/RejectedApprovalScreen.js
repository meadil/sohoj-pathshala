import React from 'react';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Card from '../../components/Card';
import StatusChip from '../../components/StatusChip';
import { useUser } from '../../contexts/UserContext';
import { colors, spacing, typography } from '../../theme/theme';

export default function RejectedApprovalScreen() {
  const { profile, signOut } = useUser();

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@sohojpathshala.com?subject=Teacher%20Application%20Inquiry');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card variant="elevated" style={styles.card}>
          <View style={styles.chipRow}>
            <StatusChip label="Application Declined" status="rejected" size="md" />
          </View>

          <Text style={styles.title}>Application Not Approved</Text>
          <Text style={styles.subtitle}>
            Hello {profile?.nickname || profile?.name || 'Teacher'},
          </Text>

          <Text style={styles.description}>
            Thank you for your interest in teaching with Sohoj Pathshala. At this time, your application could not be approved. If you believe this is a mistake or would like to submit updated credentials, please reach out to our team.
          </Text>

          <View style={styles.actionColumn}>
            <Button
              title="Contact Support"
              variant="primary"
              size="lg"
              onPress={handleContactSupport}
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
    ...typography.largeTitle,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyBold,
    color: colors.danger,
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
