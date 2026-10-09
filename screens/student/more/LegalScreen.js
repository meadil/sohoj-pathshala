import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const DOCS = {
  privacy: {
    titleBn: 'গোপনীয়তা নীতি',
    titleEn: 'Privacy policy',
    bodyBn: [
      'আমরা শুধু তোমার অ্যাকাউন্ট আর কোর্স চালাতে যা দরকার তা নিই — ইমেইল, ফোন নম্বর আর ক্লাস। তোমার সঠিক ঠিকানা বা অবস্থান আমরা কারো সাথে শেয়ার করি না।',
      'পেমেন্ট bKash দিয়ে হয়; আমরা শুধু TrxID দেখি যাচাইয়ের জন্য, নম্বর বা পাসওয়ার্ড নয়।',
      'যেকোনো সময় চাইলে আমাদের নোটিফিকেশন থেকে অথবা ইমেইল করে ডেটা মুছে ফেলতে বলতে পারো।',
    ],
    bodyEn: [
      'We only collect what your account and course need — email, phone number and class. We never share your exact address or location with anyone.',
      'Payment happens via bKash; we only see the TrxID for verification, never your PIN or password.',
      'You can ask us to delete your data anytime from the notification bell or by email.',
    ],
  },
  terms: {
    titleBn: 'শর্তাবলি',
    titleEn: 'Terms & conditions',
    bodyBn: [
      'কোর্স কেনা মানে তোমার একার জন্য লাইফটাইম অ্যাক্সেস — লগইন বা ভিডিও অন্যের সাথে শেয়ার করা যায় না।',
      'কনফার্মড পেমেন্টের পর কোনো কারণে কোর্স চালু না হলে আমাদের নোটিফিকেশন বেল থেকে যোগাযোগ করো।',
    ],
    bodyEn: [
      'Buying a course means lifetime access for you alone — logins or videos cannot be shared with others.',
      'If your course does not open after a confirmed payment, reach us from the notification bell.',
    ],
  },
};

/**
 * LegalScreen - In-app legal documents (scr-legal).
 * Matches index.html: gen-head (back → More, doc title), legal-box
 * with the document paragraphs. Privacy is the default doc; the More
 * menu passes doc: 'privacy' | 'terms' via route params (mirrors the
 * prototype's data-doc switch). Copy verbatim from index.html
 * (privacyTitle/privacyP1-3, termsTitle/termsP1-3).
 *
 * LEGAL CONTENT FLAG (unchanged): these are the prototype's in-app
 * texts — including termsP3, which itself says this is an interactive
 * prototype. The FINAL legal documents do not exist yet and must be
 * supplied before launch. See STATUS.md.
 */
export default function LegalScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'

  const doc = route?.params?.doc === 'terms' ? 'terms' : 'privacy';
  const isBn = lang === 'bn';
  const content = DOCS[doc];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'আরও স্ক্রিনে ফিরে যান' : 'Back to More'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>
            {isBn ? content.titleBn : content.titleEn}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Document (.legal-box) */}
        <View style={styles.legalBox}>
          <Text style={styles.docTitle}>
            {isBn ? content.titleBn : content.titleEn}
          </Text>
          {(isBn ? content.bodyBn : content.bodyEn).map((p, i) => (
            <Text key={i} style={styles.docP}>{p}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  headTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  legalBox: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    gap: 10,
  },
  docTitle: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  docP: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
});
