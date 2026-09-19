import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import StatusChip from '../../components/StatusChip';
import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function TeacherAuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Email confirmation state
  const [submittedEmail, setSubmittedEmail] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { signIn, signUpTeacher, resendConfirmationEmail } = useUser();
  const alert = useAlert();

  const handleResend = async () => {
    if (!submittedEmail) return;
    setResending(true);
    try {
      await resendConfirmationEmail(submittedEmail);
      alert('Email Resent', 'A fresh confirmation link has been sent to your inbox.');
    } catch (err) {
      alert('Resend Failed', err.message || 'Unable to resend email at this time.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Missing Fields', 'Please enter both your email and password.');
      return;
    }

    if (isSignUp) {
      if (!name.trim() || !phone.trim()) {
        alert('Missing Fields', 'Full name and contact phone number are required for teacher accounts.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const res = await signUpTeacher({
          email: email.trim(),
          password,
          name: name.trim(),
          nickname: nickname.trim() || name.trim(),
          phone: phone.trim(),
        });

        if (res.needsEmailConfirmation) {
          setSubmittedEmail(email.trim());
        }
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (err) {
      alert('Authentication Error', err.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  // Dedicated "Check Your Email" State
  if (submittedEmail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmContent}>
          <Card variant="elevated" style={styles.confirmCard}>
            <StatusChip label="Verification Sent" status="gold" size="md" />
            <Text style={styles.title}>Confirm your email</Text>
            <Text style={styles.confirmEmail}>{submittedEmail}</Text>
            <Text style={styles.confirmText}>
              We sent a verification link to your email. Click the link to confirm your address. Once confirmed, your application will be reviewed by the Owner.
            </Text>

            <View style={styles.actionColumn}>
              <Button
                title={resending ? 'Resending...' : 'Resend Email'}
                variant="outline"
                size="md"
                loading={resending}
                onPress={handleResend}
              />
              <Button
                title="Back to Sign In"
                variant="ghost"
                size="md"
                onPress={() => {
                  setSubmittedEmail(null);
                  setIsSignUp(false);
                }}
              />
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <StatusChip label="Teacher Portal" status="gold" size="md" />
            <Text style={styles.title}>Sohoj Shikkhok</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Apply as an instructor' : 'Sign in to your teacher account'}
            </Text>
          </View>

          <Card variant="elevated" style={styles.card}>
            {isSignUp && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rafiq Ahmed"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Display Nickname</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rafiq"
                    placeholderTextColor={colors.textTertiary}
                    value={nickname}
                    onChangeText={setNickname}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="01XXXXXXXXX"
                    placeholderTextColor={colors.textTertiary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="teacher@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Button
              title={isSignUp ? 'Submit Teacher Application' : 'Sign In'}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />

            <TouchableOpacity
              onPress={() => setIsSignUp((prev) => !prev)}
              style={styles.toggleRow}
            >
              <Text style={styles.toggleText}>
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have a teacher account? Apply to teach"}
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  confirmContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  confirmCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  confirmEmail: {
    ...typography.bodyBold,
    color: colors.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  confirmText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.subhead,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  toggleRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    ...typography.subhead,
    color: colors.primary,
  },
  actionColumn: {
    width: '100%',
    gap: spacing.sm,
  },
});
