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
import { colors, radius, spacing } from '../../theme/theme';

function ArrowLeftIcon({ size = 24, color = '#1D1D1F', strokeWidth = 2.2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CreateIcon({ size = 22, color = '#FFFFFF', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v16M5 11l7-7 7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * TeacherSignupScreen - Teacher account application (teacher.html#/signup).
 * Matches the prototype exactly: gen-head (title + lead + Bn/En pills),
 * four fields in order (name, email, phone, password), Create CTA,
 * approval note. No back button in the prototype — return to sign-in
 * is via the stack's system back gesture.
 * All Bangla/English strings pulled verbatim from teacher.html
 * (signupTitle, signupLead, fName/fNamePh, fEmail/fEmailPh,
 * fPhone/fPhonePh, fPassword/fPasswordPh, btnCreate, signupNote).
 *
 * Submit calls the REAL signUpTeacher({email, password, name, nickname,
 * phone}) PKCE flow (see UserContext — never the OTP shape). Password
 * minimum 8 enforced client-side per the prototype placeholder.
 * Success with needsEmailConfirmation → PendingApproval (the guard
 * routes there again post-link-click once the profile exists).
 */
export default function TeacherSignupScreen({ navigation }) {
  const [lang, setLang] = useState('bn'); // 'bn' (default) | 'en'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUpTeacher } = useUser();
  const alert = useAlert();

  const isBn = lang === 'bn';

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !password) {
      alert(
        isBn ? 'তথ্য প্রয়োজন' : 'Information Required',
        isBn
          ? 'অনুগ্রহ করে সবগুলো ঘর পূরণ করো।'
          : 'Please fill in all fields.'
      );
      return;
    }

    if (password.length < 8) {
      alert(
        isBn ? 'পাসওয়ার্ড ছোট' : 'Password Too Short',
        isBn
          ? 'অনুগ্রহ করে কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দাও।'
          : 'Please use a password with at least 8 characters.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await signUpTeacher({
        email: trimmedEmail,
        password,
        name: trimmedName,
        nickname: trimmedName,
        phone: trimmedPhone,
      });
      if (res.needsEmailConfirmation) {
        navigation?.navigate?.('PendingApproval');
      }
    } catch (err) {
      alert(
        isBn ? 'সাইনআপ ব্যর্থ' : 'Sign Up Failed',
        err?.message || 'Could not create the account. Please try again.'
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
          showsVerticalScrollIndicator={false}
        >
{/* Header (.gen-head with language toggle) */}
           <View style={styles.header}>
             <Pressable
               onPress={() => navigation?.goBack?.()}
               style={styles.backBtn}
               accessibilityLabel={isBn ? 'ফিরে যান' : 'Go back'}
             >
               <ArrowLeftIcon size={24} color={colors.textPrimary} />
             </Pressable>
             <View style={styles.titleBlock}>
               <Text style={styles.title}>
                 {isBn ? 'সহজ পাঠশালায় যোগ দিন' : 'Join Sohoj Pathshala'}
               </Text>
               <Text style={styles.lead}>
                 {isBn
                   ? 'আপনার শিক্ষক অ্যাকাউন্ট তৈরি করুন। নতুন সাইনআপ কনটেন্ট তৈরি করার আগে মালিক পর্যালোচনা করেন।'
                   : 'Create your teacher account. An Owner reviews new signups before they can create content.'}
               </Text>
             </View>
             <View style={styles.langToggle}>
              <Pressable
                onPress={() => setLang('bn')}
                style={[styles.langPill, isBn && styles.langPillActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isBn }}
              >
                <Text style={[styles.langText, isBn && styles.langTextActive]}>বাংলা</Text>
              </Pressable>
              <Pressable
                onPress={() => setLang('en')}
                style={[styles.langPill, !isBn && styles.langPillActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: !isBn }}
              >
                <Text style={[styles.langText, !isBn && styles.langTextActive]}>English</Text>
              </Pressable>
            </View>
          </View>

          {/* Form (.sp-body) */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'পুরো নাম' : 'Full name'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isBn ? 'যেমন করিম উদ্দিন' : 'e.g. Karim Uddin'}
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'ইমেইল' : 'Email'}</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'ফোন' : 'Phone'}</Text>
              <TextInput
                style={styles.input}
                placeholder="01712 345678"
                placeholderTextColor={colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'পাসওয়ার্ড' : 'Password'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isBn ? 'অন্তত ৮ অক্ষর' : 'At least 8 characters'}
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.ctaWrapper}>
              <Button
                title={isBn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create account'}
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSubmit}
                rightIcon={<CreateIcon size={22} color="#FFFFFF" />}
              />
            </View>

            <Text style={styles.note}>
              {isBn
                ? 'যে কেউ সাইনআপ করতে পারেন। কনটেন্ট তৈরি করার আগে একজন মালিক নতুন শিক্ষকদের অনুমোদন দেন।'
                : 'Anyone can sign up. An Owner approves new teachers before they can create content.'}
            </Text>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 44,
    flexGrow: 1,
  },
  header: {
    gap: 12,
    marginBottom: 20,
  },
  titleBlock: {
    gap: 2,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  langToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
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
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    color: colors.textPrimary,
  },
  ctaWrapper: {
    marginTop: 12,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backBtn: {
    padding: 8,
  },
});
