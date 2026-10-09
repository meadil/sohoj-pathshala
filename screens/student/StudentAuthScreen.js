import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import StatusChip from '../../components/StatusChip';
import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function StudentAuthScreen({ onCompleteRegistration }) {
  const [lang, setLang] = useState('bn'); // 'bn' | 'en'
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Email confirmation state
  const [submittedEmail, setSubmittedEmail] = useState(null);

  // Registration & Auth state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { signIn, signUpStudent, resendConfirmationEmail } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const handleResend = async () => {
    if (!submittedEmail) return;
    setResending(true);
    try {
      await resendConfirmationEmail(submittedEmail);
      alert(
        isBn ? 'ইমেইল পাঠানো হয়েছে' : 'Email Resent',
        isBn ? 'আপনার ইনবক্সে একটি নতুন নিশ্চিতকরণ লিংক পাঠানো হয়েছে।' : 'A fresh confirmation link has been sent to your inbox.'
      );
    } catch (err) {
      alert(
        isBn ? 'পুনরায় পাঠানো ব্যর্থ' : 'Resend Failed',
        err.message || (isBn ? 'এই মুহূর্তে ইমেইল পাঠানো যাচ্ছে না।' : 'Unable to resend email at this time.')
      );
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      alert(
        isBn ? 'তথ্য প্রয়োজন' : 'Missing Information',
        isBn ? 'তোমার ইমেইল আর পাসওয়ার্ড দুটোই লিখো।' : 'Add both your email and password.'
      );
      return;
    }

    if (isSignUp) {
      if (!name.trim() || !phone.trim()) {
        alert(
          isBn ? 'তথ্য প্রয়োজন' : 'Missing Information',
          isBn ? 'তোমার আসল নাম আর ফোন নম্বর লিখো।' : 'Add your real name and phone number.'
        );
        return;
      }
      if (password !== confirmPassword) {
        alert(
          isBn ? 'পাসওয়ার্ড মিলছে না' : 'Password Mismatch',
          isBn ? 'পাসওয়ার্ড দুটো মিলছে না। আবার লিখুন।' : 'Passwords do not match. Please re-enter.'
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const res = await signUpStudent({
          email: email.trim(),
          password,
          name: name.trim(),
          nickname: nickname.trim() || name.trim(),
          phone: phone.trim(),
        });

        if (res.needsEmailConfirmation) {
          setSubmittedEmail(email.trim());
        } else if (onCompleteRegistration) {
          onCompleteRegistration();
        }
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (err) {
      alert(
        isBn ? 'প্রমাণীকরণ ব্যর্থ' : 'Authentication Failed',
        err.message || (isBn ? 'প্রমাণীকরণ করা যায়নি। তথ্যগুলো ঠিক আছে কিনা দেখুন।' : 'Unable to authenticate. Please check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  // Dedicated "Check Your Email" State
  if (submittedEmail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmContent}>
          <View style={styles.confirmBox}>
            <StatusChip label={isBn ? 'যাচাইকরণ পাঠানো হয়েছে' : 'Verification Sent'} status="warning" size="md" />
            <Text style={styles.title}>{isBn ? 'ইমেইল দেখুন' : 'Check your email'}</Text>
            <Text style={styles.confirmEmail}>{submittedEmail}</Text>
            <Text style={styles.confirmText}>
              {isBn
                ? 'আপনার ইনবক্সে একটি নিশ্চিতকরণ লিংক পাঠিয়েছি। অ্যাকাউন্ট চালু করে শেখা শুরু করতে ইমেইলের লিংকে চাপ দিন।'
                : 'We sent a confirmation link to your inbox. Tap the link in the email to activate your account and start learning.'}
            </Text>

            <View style={styles.actionColumn}>
              <Button
                title={resending ? (isBn ? 'পাঠানো হচ্ছে...' : 'Resending...') : (isBn ? 'আবার পাঠান' : 'Resend Email')}
                variant="outline"
                size="md"
                loading={resending}
                onPress={handleResend}
              />
              <Button
                title={isBn ? 'সাইন ইনে ফিরে যান' : 'Back to Sign In'}
                variant="ghost"
                size="md"
                onPress={() => {
                  setSubmittedEmail(null);
                  setIsSignUp(false);
                }}
              />
            </View>
          </View>
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <StatusChip label="Sohoj Pathshala" status="primary" size="md" />
            <Text style={styles.title}>
              {isSignUp ? (isBn ? 'অ্যাকাউন্ট খুলুন' : 'Create Account') : (isBn ? 'স্বাগতম' : 'Welcome Back')}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? (isBn ? 'হাজারো SSC ও HSC শিক্ষার্থীর সাথে যোগ দিন' : 'Join thousands of SSC & HSC students')
                : (isBn ? 'শেখা চালিয়ে যেতে সাইন ইন করুন' : 'Sign in to continue your learning journey')}
            </Text>
            <View style={styles.langToggle}>
              <TouchableOpacity
                onPress={() => setLang('bn')}
                style={[styles.langPill, isBn && styles.langPillActive]}
              >
                <Text style={[styles.langText, isBn && styles.langTextActive]}>বাংলা</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLang('en')}
                style={[styles.langPill, !isBn && styles.langPillActive]}
              >
                <Text style={[styles.langText, !isBn && styles.langTextActive]}>English</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formContainer}>
            {isSignUp && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>{isBn ? 'আসল নাম (স্থায়ী) *' : 'Real Name (Permanent) *'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={isBn ? 'যেমন আদিল চৌধুরী' : 'e.g. Adil Chowdhury'}
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>{isBn ? 'ডাকনাম (অ্যাপে সম্বোধনের জন্য)' : 'Nickname (for in-app greetings)'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={isBn ? 'যেমন আদিল' : 'e.g. Adil'}
                    placeholderTextColor={colors.textTertiary}
                    value={nickname}
                    onChangeText={setNickname}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>{isBn ? 'ফোন নম্বর *' : 'Phone Number *'}</Text>
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
              <Text style={styles.label}>{isBn ? 'ইমেইল ঠিকানা *' : 'Email Address *'}</Text>
              <TextInput
                style={styles.input}
                placeholder="student@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'পাসওয়ার্ড *' : 'Password *'}</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {isSignUp && (
              <View style={styles.field}>
                <Text style={styles.label}>{isBn ? 'পাসওয়ার্ড আবার লেখো *' : 'Password again *'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            )}

            <Button
              title={isSignUp ? (isBn ? 'অ্যাকাউন্ট খুলুন' : 'Create Account') : (isBn ? 'সাইন ইন' : 'Sign In')}
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
                  ? (isBn ? 'অ্যাকাউন্ট আছে? সাইন ইন করুন' : 'Already have an account? Sign In')
                  : (isBn ? 'অ্যাকাউন্ট নেই? সাইন আপ করুন' : "Don't have an account? Sign Up")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // #FBF7F0 warm canvas
  },
  scroll: {
    paddingHorizontal: 20, // 20px matching prototype .sp-body
    paddingTop: spacing.xl,
    paddingBottom: 44, // 44px bottom padding matching .sp-body
    flexGrow: 1,
    justifyContent: 'center',
  },
  confirmContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  confirmBox: {
    alignItems: 'center',
    gap: spacing.sm,
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
    marginBottom: 28,
    gap: spacing.xs,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  formContainer: {
    width: '100%',
  },
  field: {
    marginBottom: 16, // --od-gap: 16px from prototype form
  },
  label: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 52, // 52px height from prototype
    backgroundColor: colors.surface, // #FFFFFF pure white
    borderWidth: 2, // 2px border from prototype
    borderColor: colors.border, // #E5E5EA
    borderRadius: radius.input, // 14px radius from prototype
    paddingHorizontal: 16,
    color: colors.textPrimary,
  },
  submitBtn: {
    marginTop: 12,
  },
  toggleRow: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
    marginTop: spacing.sm,
  },
  langPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  langPillActive: {
    backgroundColor: colors.primary,
  },
  langText: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  actionColumn: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
