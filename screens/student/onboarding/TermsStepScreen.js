import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Button from '../../../components/Button';
import OnboardingStepShell from '../../../components/OnboardingStepShell';
import { useAlert } from '../../../components/CustomAlert';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { colors, radius } from '../../../theme/theme';

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

function CheckIcon({ size = 16, color = '#FFFFFF', strokeWidth = 3 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m5 12.5 4.5 4.5L19 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DocH3({ children }) {
  return <Text style={styles.docH3}>{children}</Text>;
}

function DocP({ children }) {
  return <Text style={styles.docP}>{children}</Text>;
}

/**
 * TermsStepScreen - Onboarding Step 6 of 9 (Terms & Privacy)
 * Matches index.html#/terms exactly:
 * - OnboardingStepShell with step 6 of 9
 * - Terms/Privacy document text shown in-app (.termbox)
 * - Placeholder-disclaimer note (.tb-muted)
 * - Agreement checkbox with inline Terms/Privacy links
 * - Primary CTA "এগিয়ে যাও" / "Continue"
 * All Bangla/English strings pulled verbatim from index.html
 * (termsTitle, legalAria, termMuted, agreementsOpen, continue).
 *
 * This step is purely local/client-side: acceptance is recorded in
 * OnboardingContext (agreedToTerms) only. Neither index.html nor the
 * design docs describe a Supabase call for Terms acceptance, so none
 * is made and no table/column was invented for it.
 *
 * NOTE on document text: the prototype embeds the ToS/Privacy wording
 * inline BUT explicitly marks it placeholder via the termMuted note
 * ("প্রোটোটাইপের জন্য অস্থায়ী লিগ্যাল টেক্সট। ..."). The embedded
 * wording is reproduced verbatim below; the FINAL legal documents do
 * not exist yet as content — see STATUS.md.
 */
export default function TermsStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { data, updateData } = useOnboarding();
  const alert = useAlert();

  const [agreed, setAgreed] = useState(data.agreedToTerms || false);

  const isBn = lang === 'bn';

  const showAgreementsNote = () => {
    alert(
      '',
      isBn
        ? 'সম্পূর্ণ শর্তাবলি রিলিজ অ্যাপে খুলবে (ডেমো)।'
        : 'Full agreements open in the release app (demo).'
    );
  };

  const handleContinue = () => {
    if (!agreed) {
      alert(
        isBn ? 'সম্মতি প্রয়োজন' : 'Agreement Required',
        isBn
          ? 'এগিয়ে যেতে শর্তাবলি ও প্রাইভেসি নীতিতে সম্মত হও।'
          : 'Please agree to the Terms and Privacy Policy to continue.'
      );
      return;
    }
    // Local-only acceptance — no Supabase call for this step.
    updateData({ agreedToTerms: true });
    navigation?.navigate?.('OnboardingClass');
  };

  return (
    <OnboardingStepShell
      step={6}
      totalSteps={9}
      title={isBn ? 'শেষ একটা জিনিস পড়ে নাও' : 'One last thing to read'}
      onBack={() => navigation?.goBack?.()}
      lang={lang}
    >
      <View style={styles.stack}>
        {/* Terms / Privacy document (.termbox) */}
        <View
          style={styles.termbox}
          accessibilityRole="text"
          accessibilityLabel={
            isBn ? 'সার্ভিসের শর্তাবলি ও প্রাইভেসি নীতি' : 'Terms of Service and Privacy Policy'
          }
        >
          {isBn ? (
            <>
              <DocH3>সার্ভিসের শর্তাবলি</DocH3>
              <DocP>
                এই অস্থায়ী শর্তগুলো Sohoj Pathshala অ্যাপ ব্যবহারের ক্ষেত্রে প্রযোজ্য। অ্যাকাউন্ট খুললে
                আপনি কেবল ব্যক্তিগত ও বৈধ পড়াশোনার উদ্দেশ্যে পরিষেবাটি ব্যবহার করতে এবং নিজের লগ-ইন তথ্য
                গোপন রাখতে সম্মত হচ্ছেন।
              </DocP>
              <DocP>
                কোর্সের কনটেন্ট, পাঠ, কুইজ ও সাপ্তাহিক লাইভ প্র্যাকটিস শুধু শিক্ষার জন্য দেওয়া হয়।
                লিখিত অনুমতি ছাড়া কোর্স উপকরণ পুনঃবিক্রয়, পুনঃবিতরণ বা প্রকাশ করা যাবে না।
              </DocP>
              <DocP>
                প্রতি কোর্সে আলাদাভাবে পেমেন্ট প্রসেস করা হয় এবং অ্যাক্সেস খোলার আগে যাচাই করা হয়।
                রিফান্ড ও বাতিলকরণ প্রতিটি কোর্সের কেনার পেজে দেখানো নীতি অনুসরণ করে।
              </DocP>
              <DocH3>প্রাইভেসি নীতি</DocH3>
              <DocP>
                সাইন-আপের সময় আপনি যে ইমেইল, ফোন নম্বর, নাম ও ক্লাস লেভেল দেন, সেগুলো আমরা সংগ্রহ করি।
                লোকেশন শুধু তখনই নেওয়া হয়, যখন আপনি অনুমতি দেন — বাংলাদেশের কোন জেলাগুলোতে পড়াশোনার
                সুযোগ কম, তা বোঝার জন্য।
              </DocP>
              <DocP>
                আপনার তথ্য কখনো তৃতীয় পক্ষের কাছে বিক্রি হয় না। এটি অ্যাকাউন্ট চালাতে, পাঠ উন্নত করতে
                এবং — আপনার অনুমতি নিয়ে — পরে অভিভাবকদের অগ্রগতি জানাতে ব্যবহার হয়।
              </DocP>
            </>
          ) : (
            <>
              <DocH3>Terms of Service</DocH3>
              <DocP>
                These placeholder terms apply to your use of the Sohoj Pathshala app. By creating an
                account you agree to use the service for lawful, personal study purposes only and to
                keep your sign-in details private.
              </DocP>
              <DocP>
                Course content, lessons, quizzes and weekly live practice are provided for educational
                use. You may not resell, redistribute or publish course materials without written
                permission.
              </DocP>
              <DocP>
                Payments are processed per course and verified before access is unlocked. Refunds and
                cancellations follow the policy shown on each course&apos;s buy page.
              </DocP>
              <DocH3>Privacy Policy</DocH3>
              <DocP>
                We collect the email, phone number, name and class level you provide during sign-up.
                Location is gathered only if you allow it, to understand which districts across
                Bangladesh are underserved.
              </DocP>
              <DocP>
                Your data is never sold to third parties. It is used to run your account, improve
                lessons, and — with your permission — later to keep parents updated on progress.
              </DocP>
            </>
          )}
          {/* Placeholder disclaimer (.tb-muted) */}
          <Text style={styles.muted}>
            {isBn
              ? 'প্রোটোটাইপের জন্য অস্থায়ী লিগ্যাল টেক্সট। লঞ্চের আগে এখানে চূড়ান্ত শর্তাবলি ও প্রাইভেসি নীতি দেখানো হবে।'
              : 'Placeholder legal text for the prototype. The final Terms and Privacy Policy will be shown here before launch.'}
          </Text>
        </View>

        {/* Agreement checkbox (.sp-check) */}
        <Pressable
          onPress={() => setAgreed((v) => !v)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <CheckIcon size={16} />}
          </View>
          {isBn ? (
            <Text style={styles.checkLabel}>
              {'আমি '}
              <Text style={styles.link} onPress={showAgreementsNote}>সার্ভিসের শর্তাবলিতে</Text>
              {' এবং '}
              <Text style={styles.link} onPress={showAgreementsNote}>প্রাইভেসি নীতিতে</Text>
              {' সম্মত।'}
            </Text>
          ) : (
            <Text style={styles.checkLabel}>
              {'I agree to the '}
              <Text style={styles.link} onPress={showAgreementsNote}>Terms of Service</Text>
              {' and '}
              <Text style={styles.link} onPress={showAgreementsNote}>Privacy Policy</Text>
              {'.'}
            </Text>
          )}
        </Pressable>

        {/* Primary CTA Button (.sp-btn.primary) */}
        <View style={styles.ctaWrapper}>
          <Button
            title={isBn ? 'এগিয়ে যাও' : 'Continue'}
            variant="primary"
            size="lg"
            onPress={handleContinue}
            rightIcon={<ArrowRightIcon size={22} color="#FFFFFF" strokeWidth={2.4} />}
          />
        </View>
      </View>
    </OnboardingStepShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
    width: '100%',
  },
  termbox: {
    backgroundColor: colors.surface, // #FFFFFF
    borderWidth: 2,
    borderColor: colors.border, // #E5E5EA
    borderRadius: radius.input, // 14px
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  docH3: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
    marginTop: 2,
  },
  docP: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textTertiary,
    marginTop: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  link: {
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  ctaWrapper: {
    marginTop: 12,
  },
});
