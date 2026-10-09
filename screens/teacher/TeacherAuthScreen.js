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

import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { colors, radius, spacing, typography } from '../../theme/theme';

/**
 * TeacherAuthScreen - Teacher sign-in only.
 * Sign-up moved to TeacherSignupScreen (teacher.html#/signup is a
 * separate screen in the prototype). The "Apply to teach" toggle
 * navigates to the TeacherSignup route instead of toggling in place,
 * so no dead signup branch remains here.
 */
export default function TeacherAuthScreen({ navigation }) {
  const [lang, setLang] = useState('bn'); // 'bn' | 'en'
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { signIn } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      alert(
        isBn ? 'তথ্য প্রয়োজন' : 'Missing Fields',
        isBn ? 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড দুটোই লিখুন।' : 'Please enter both your email and password.'
      );
      return;
    }

    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (err) {
      alert(
        isBn ? 'প্রমাণীকরণ ব্যর্থ' : 'Authentication Error',
        err.message || (isBn ? 'সাইন ইন করার সময় একটি সমস্যা হয়েছে।' : 'An error occurred during sign in.')
      );
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.title}>Sohoj Shikkhok</Text>
            <Text style={styles.subtitle}>
              {isBn ? 'আপনার শিক্ষক অ্যাকাউন্টে সাইন ইন করুন' : 'Sign in to your teacher account'}
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
            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'ইমেইল ঠিকানা *' : 'Email Address *'}</Text>
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

            <Button
              title={isBn ? 'সাইন ইন' : 'Sign In'}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />

            <TouchableOpacity
              onPress={() => navigation?.navigate?.('TeacherSignup')}
              style={styles.toggleRow}
            >
              <Text style={styles.toggleText}>
                {isBn ? 'শিক্ষক অ্যাকাউন্ট নেই? পড়াতে আবেদন করুন' : "Don't have a teacher account? Apply to teach"}
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
    paddingBottom: 44, // 44px bottom padding
    flexGrow: 1,
    justifyContent: 'center',
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
    marginBottom: 16,
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
    minHeight: 52,
    backgroundColor: colors.surface, // #FFFFFF pure white
    borderWidth: 2, // 2px border
    borderColor: colors.border, // #E5E5EA
    borderRadius: radius.input, // 14px radius
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
});
