import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Button from '../../components/Button';
import { colors, radius, spacing } from '../../theme/theme';

/**
 * Open Book SVG Icon matching index.html sp-brand-mark
 */
function BookIcon({ size = 44, color = '#FFFFFF', strokeWidth = 2.4 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5.5C9.6 3.7 6.5 3 3 3.2V18c3.5-.2 6.6.5 9 2.3 2.4-1.8 5.5-2.5 9-2.3V3.2C17.5 3 14.4 3.7 12 5.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 5.5v14.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Right Arrow SVG Icon matching index.html CTA icon
 */
function ArrowRightIcon({ size = 22, color = '#FFFFFF', strokeWidth = 2.4 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * LandingScreen - matches index.html#/landing exactly.
 * Single source of truth for unauthenticated initial presentation.
 */
export default function LandingScreen({ onStart, navigation }) {
  const [lang, setLang] = useState('bn'); // 'bn' (default) | 'en'

  const handleStart = () => {
    if (onStart) {
      onStart();
    } else if (navigation?.navigate) {
      navigation.navigate('OnboardingAccount');
    }
  };

  const handleSignIn = () => {
    if (navigation?.navigate) {
      navigation.navigate('SignIn');
    }
  };

  const isBn = lang === 'bn';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: Language Toggle Pill */}
        <View style={styles.topBar}>
          <View style={styles.langToggle}>
            <Pressable
              onPress={() => setLang('bn')}
              style={[styles.langPill, isBn && styles.langPillActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isBn }}
            >
              <Text style={[styles.langText, isBn && styles.langTextActive]}>
                বাংলা
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLang('en')}
              style={[styles.langPill, !isBn && styles.langPillActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: !isBn }}
            >
              <Text style={[styles.langText, !isBn && styles.langTextActive]}>
                English
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Center content container */}
        <View style={styles.centerContent}>
          {/* Brand Mark & App Name */}
          <View style={styles.brandBlock}>
            <View style={styles.logoShadowWrapper}>
              <View style={styles.logoMark}>
                <BookIcon size={44} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </View>
            <Text style={styles.brandName}>Sohoj Pathshala</Text>
            <Text style={styles.brandSub}>সহজ পাঠশালা</Text>
          </View>

          {/* Display Headline */}
          <Text style={styles.displayTitle}>
            {isBn ? (
              <>
                {'SSC ও HSC বিজ্ঞান হোক '}
                <Text style={styles.highlightText}>সহজ</Text>
                {'।'}
              </>
            ) : (
              <>
                {'Make SSC & HSC Science '}
                <Text style={styles.highlightText}>sohoj</Text>
                {'.'}
              </>
            )}
          </Text>

          {/* Subtitle / Description */}
          <Text style={styles.description}>
            {isBn
              ? 'বাংলাদেশের বিজ্ঞান শিক্ষার্থীদের জন্য ছোট ছোট পাঠ, কুইজ আর সাপ্তাহিক লাইভ প্র্যাকটিস।'
              : "Bite-sized lessons, quizzes and weekly live practice for Bangladesh's Science students."}
          </Text>

          {/* Subject line */}
          <Text style={styles.subjectLine}>
            {isBn
              ? 'পদার্থবিজ্ঞান · রসায়ন · জীববিজ্ঞান · গণিত'
              : 'Physics · Chemistry · Biology · Mathematics'}
          </Text>
        </View>

        {/* Bottom CTA Button & Returning User Link */}
        <View style={styles.ctaArea}>
          <Button
            title={isBn ? 'শুরু করো — এটা ফ্রি' : "Start learning — it's free"}
            variant="primary"
            size="lg"
            onPress={handleStart}
            rightIcon={<ArrowRightIcon size={22} color="#FFFFFF" strokeWidth={2.4} />}
          />

          <TouchableOpacity
            onPress={handleSignIn}
            style={styles.signInRow}
            activeOpacity={0.7}
          >
            <Text style={styles.signInText}>
              {isBn
                ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? সাইন ইন করুন'
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #FBF7F0 warm canvas
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24, // 24px horizontal padding from prototype
    paddingTop: 16,
    paddingBottom: 32, // 32px bottom padding
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface, // #FFFFFF
    borderWidth: 2,
    borderColor: colors.border, // #E5E5EA
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
    backgroundColor: colors.primary, // #C2703D
  },
  langText: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary, // #6E6E73
    includeFontPadding: false,
  },
  langTextActive: {
    color: '#FFFFFF',
  },

  centerContent: {
    width: '100%',
    alignItems: 'center',
    gap: 22,
    paddingVertical: spacing.md,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  logoShadowWrapper: {
    borderRadius: 28,
    backgroundColor: colors.primaryStrong, // #A85A2B 3D bottom bevel
    paddingBottom: 5,
    shadowColor: colors.primaryStrong,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primary, // #C2703D
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 26,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
    letterSpacing: -0.4,
  },
  brandSub: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primaryStrong, // #A85A2B
    marginTop: -8,
  },

  displayTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingHorizontal: 8,
  },
  highlightText: {
    color: colors.primaryStrong, // #A85A2B accent color
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  subjectLine: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
  },

  ctaArea: {
    width: '100%',
    marginTop: 24,
    gap: 14,
    alignItems: 'center',
  },
  signInRow: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signInText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
    textAlign: 'center',
  },
});
