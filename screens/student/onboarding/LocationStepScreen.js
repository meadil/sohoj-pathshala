import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import Button from '../../../components/Button';
import OnboardingStepShell from '../../../components/OnboardingStepShell';
import { useAlert } from '../../../components/CustomAlert';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { colors, radius } from '../../../theme/theme';

function PinIcon({ size = 44, color = '#FFFFFF', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-6.5-5.4-6.5-10a6.5 6.5 0 0 1 13 0c0 4.6-6.5 10-6.5 10Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10.7" r="2.6" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/**
 * LocationStepScreen - Onboarding Step 9 of 9 (Location Permission)
 * Matches index.html#/location exactly:
 * - OnboardingStepShell with step 9 of 9
 * - Location pin icon in gold circle (.sp-circle), centered column
 *   (.scr-loc-inner)
 * - Centered lead text, full-width primary + ghost buttons, centered note
 * All Bangla/English strings pulled verbatim from index.html
 * (locTitle, locLead, allowLoc, skipLoc, locNote).
 *
 * Context-only: Allow stores raw coords + reverse-geocoded district
 * string in OnboardingContext (locationPermission, locationCoords,
 * locationDistrict). Skip stores locationPermission: false. NO
 * updateProfile call and no columns invented — profiles has no
 * district/location column yet (see STATUS.md); persistence waits for
 * the schema decision.
 *
 * Dashboard is reached via the onboardingComplete flag (guard swaps
 * the tree) instead of navigating onward.
 */
export default function LocationStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { updateData } = useOnboarding();
  const alert = useAlert();

  const [isWorking, setIsWorking] = useState(false);

  const isBn = lang === 'bn';

  const handleAllow = async () => {
    // Balanced accuracy: Highest (the default) can hang indefinitely
    // waiting for a GPS fix and strand the button in loading state.
    setIsWorking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission denied', 'Location permission is required to continue.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      let district = '';
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        district = rev[0]?.district || rev[0]?.subregion || rev[0]?.city || '';
      } catch (geoErr) {
        console.warn('Reverse geocode failed, keeping raw coords only:', geoErr?.message);
      }
      updateData({
        locationPermission: true,
        locationCoords: { latitude, longitude },
        locationDistrict: district,
        onboardingComplete: true, // <-- this triggers the guard swap
      });
    } catch (e) {
      alert('Location error', e?.message || 'Failed to get location');
    } finally {
      setIsWorking(false);
    }
  };

  const handleSkip = () => {
    // Prototype skips straight to dashboard: record the choice locally
    // and mark complete — the guard swaps the tree (same as Allow).
    updateData({ locationPermission: false, onboardingComplete: true });
  };

  return (
    <OnboardingStepShell
      step={9}
      totalSteps={9}
      title={isBn ? 'তোমার জেলায় ক্লাস গড়তে সাহায্য করো' : 'Help us reach your district'}
      onBack={() => navigation?.goBack?.()}
      lang={lang}
    >
      <View style={styles.inner}>
        {/* Location Pin in Gold Circle (.sp-circle) */}
        <View style={styles.circle}>
          <PinIcon size={44} />
        </View>

        {/* Lead Text (.sp-lead, centered) */}
        <Text style={styles.leadText}>
          {isBn
            ? 'তোমার জেলা-স্তরের লোকেশন দিয়ে আমরা বাংলাদেশজুড়ে ক্লাস গড়তে চাই — তোমার সঠিক ঠিকানা কখনো দেখানো হবে না।'
            : 'We use district-level location to shape future classes across Bangladesh — your exact address is never shown.'}
        </Text>

        {/* Action Buttons Stack (primary + ghost, full-width) */}
        <View style={styles.actionStack}>
          <Button
            title={isBn ? 'লোকেশন অনুমতি দাও' : 'Allow location access'}
            variant="primary"
            size="lg"
            loading={isWorking}
            onPress={handleAllow}
            icon={<PinIcon size={22} color="#FFFFFF" strokeWidth={2} />}
          />
          <Button
            title={isBn ? 'এখন না — বাদ দিই' : "Not now — I'll skip this"}
            variant="ghost"
            size="lg"
            onPress={handleSkip}
          />
        </View>

        {/* Note (.sp-note, centered) */}
        <Text style={styles.note}>
          {isBn
            ? 'এই স্ক্রিনের পরে আর জিজ্ঞেস করা হবে না।'
            : "You won't be asked again after this screen."}
        </Text>
      </View>
    </OnboardingStepShell>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'column',
    alignItems: 'center', // .scr-loc-inner centers content
    gap: 20, // 20px gap from .scr-loc-inner
    width: '100%',
    paddingVertical: 12,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EAB308', // gold, from prototype confetti palette
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
  },
  actionStack: {
    gap: 12, // 12px gap from prototype
    width: '100%',
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
  },
});
