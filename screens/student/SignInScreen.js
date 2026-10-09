import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Button from '../../components/Button';
import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { colors, radius, spacing, typography } from '../../theme/theme';

function ChevronLeftIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * SignInScreen - Dedicated returning-student authentication screen.
 * Clean, minimal layout with email and password fields on warm canvas.
 * No cards, no onboarding chrome.
 */
export default function SignInScreen({ navigation }) {
  const [lang, setLang] = useState('bn'); // 'bn' | 'en'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      alert(
        isBn ? 'তথ্য প্রয়োজন' : 'Missing Fields',
        isBn ? 'তোমার ইমেইল আর পাসওয়ার্ড দুটোই লিখো।' : 'Add both your email and password.'
      );
      return;
    }

    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (err) {
      alert(
        isBn ? 'সাইন ইন ব্যর্থ' : 'Sign In Failed',
        err.message || (isBn ? 'সাইন ইন করা যায়নি। তথ্যগুলো ঠিক আছে কিনা দেখুন।' : 'Unable to sign in. Please verify your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top navigation row */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation?.goBack?.() || navigation?.navigate?.('Landing')}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.backBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back to Landing"
            >
              <ChevronLeftIcon size={24} />
            </Pressable>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{isBn ? 'স্বাগতম' : 'Welcome Back'}</Text>
            <Text style={styles.subtitle}>
              {isBn ? 'শেখা চালিয়ে যেতে সাইন ইন করুন' : 'Sign in to continue your learning journey'}
            </Text>
            <View style={styles.langToggle}>
              <Pressable
                onPress={() => setLang('bn')}
                style={[styles.langPill, isBn && styles.langPillActive]}
              >
                <Text style={[styles.langText, isBn && styles.langTextActive]}>বাংলা</Text>
              </Pressable>
              <Pressable
                onPress={() => setLang('en')}
                style={[styles.langPill, !isBn && styles.langPillActive]}
              >
                <Text style={[styles.langText, !isBn && styles.langTextActive]}>English</Text>
              </Pressable>
            </View>
          </View>

          {/* Form Fields (directly on #FBF7F0 canvas) */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}</Text>
              <TextInput
                style={styles.input}
                placeholder="student@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'পাসওয়ার্ড' : 'Password'}</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <View style={styles.submitArea}>
              <Button
                title={isBn ? 'সাইন ইন' : 'Sign In'}
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSignIn}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #FBF7F0 warm canvas
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20, // 20px matching prototype gutters
    paddingTop: 8,
    paddingBottom: 44,
  },
  topRow: {
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  backBtnPressed: {
    backgroundColor: '#F0E7D8',
  },
  header: {
    marginBottom: 28,
    gap: 4,
  },
  title: {
    ...typography.hero,
    fontSize: 28,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  input: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 52,
    backgroundColor: colors.surface, // #FFFFFF pure crisp white
    borderWidth: 2,
    borderColor: colors.border, // #E5E5EA
    borderRadius: radius.input, // 14px radius
    paddingHorizontal: 16,
    color: colors.textPrimary,
  },
  submitArea: {
    marginTop: 12,
  },
  langToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
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
