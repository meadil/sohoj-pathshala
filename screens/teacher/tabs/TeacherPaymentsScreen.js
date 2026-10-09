import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useUser } from '../../../contexts/UserContext';
import TeacherPaymentsOwner from './TeacherPaymentsOwner';
import { colors } from '../../../theme/theme';

function ShieldIcon({ size = 56, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l7 3v5c0 4.6-3 7.4-7 9-4-1.6-7-4.4-7-9V6Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * TeacherPaymentsScreen - Payments tab, role-aware.
 * Teacher (teacher.html#/payments): centered info card ONLY
 * ("Payments are handled by the Owner" + lead). Copy verbatim.
 * Owner (owner.html#/payments): pending-review list with
 * Confirm/Reject (rejection modal), all-payments list, receiving
 * numbers form — built in TeacherPaymentsOwner.js (same folder) to
 * keep this file to the shared shell. This file renders the teacher
 * view for non-owners and delegates to the owner view otherwise.
 */
export default function TeacherPaymentsScreen() {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { isOwner } = useUser();

  const isBn = lang === 'bn';

  if (isOwner) {
    return <TeacherPaymentsOwner />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'পেমেন্ট' : 'Payments'}</Text>
          <Text style={styles.headSub}>
            {isBn ? 'মালিক দেখাশোনা করেন' : 'Handled by the Owner'}
          </Text>
        </View>
      </View>
      <View style={styles.centerWrap}>
        <View style={styles.icoWrap}>
          <ShieldIcon size={56} />
        </View>
        <Text style={styles.msgTitle}>
          {isBn ? 'পেমেন্ট মালিকের তরফে পরিচালিত হয়' : 'Payments are handled by the Owner'}
        </Text>
        <Text style={styles.msgLead}>
          {isBn
            ? 'মালিক পেমেন্ট নিশ্চিত করেন এবং রিসিভিং নাম্বার পরিচালনা করেন। এখানে আপনাকে কিছু করতে হবে না।'
            : "The Owner confirms payments and manages the receiving numbers. You don't need to do anything here."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headText: {
    gap: 2,
  },
  headTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  headSub: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  icoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  msgTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  msgLead: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});
