import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '../theme/theme';

/**
 * Shared subject-icon + locale helpers (single source of truth).
 * Extracted from 10+ copies across course/report/explore/tab screens
 * (CODE_AUDIT fix). Icon path data is verbatim from index.html SUBICON.
 */

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBn(n) {
  return String(n).replace(/[0-9]/g, (d) => BENGALI_DIGITS[parseInt(d, 10)]);
}

export const MONTHS = {
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const DAYL = {
  bn: ['সো', 'ম', 'বু', 'বৃ', 'শু', 'শ', 'র'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

// Avatar preset colors (solid approximations of the prototype's
// .ava-opt c1-c4 gradients — RN has no gradient lib in this project).
// Index doubles as the avatar_preset DB value (smallint 0-3).
export const AVATAR_PRESETS = [
  { bg: '#D98E57' }, // 0 terracotta (default)
  { bg: '#F4D03F' }, // 1 gold
  { bg: '#34C469' }, // 2 green
  { bg: '#7A8696' }, // 3 slate
];

export const DEFAULT_AVATAR_BG = '#D98E57';

// Prototype SUBJECTS-map keys ('physics' | 'chemistry' | 'biology' |
// 'math' | 'highmath') → SUBICON key.
export function iconForSubjectKey(key) {
  if (key === 'chemistry') return 'flask';
  if (key === 'biology') return 'leaf';
  if (key === 'math' || key === 'highmath') return 'sigma';
  return 'atom';
}

// Live DB subject names → SUBICON key (icon column exists on subjects
// but seed values are unverified, so match by name).
export function iconForSubjectName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('chem') || n.includes('রসায়ন')) return 'flask';
  if (n.includes('bio') || n.includes('জীব')) return 'leaf';
  if (n.includes('math') || n.includes('গণিত')) return 'sigma';
  return 'atom';
}

export function SubjectIcon({ icon, size = 26, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {icon === 'atom' && (
        <>
          <Circle cx="12" cy="12" r="1.7" stroke={color} strokeWidth={1.8} />
          <Ellipse cx="12" cy="12" rx="9.5" ry="3.8" stroke={color} strokeWidth={1.5} />
          <Ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)" stroke={color} strokeWidth={1.5} />
          <Ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)" stroke={color} strokeWidth={1.5} />
        </>
      )}
      {icon === 'flask' && (
        <>
          <Path d="M9.5 3.5h5M10.5 3.5v4.8L7.2 14.8a3.4 3.4 0 0 0 3 5.2h3.6a3.4 3.4 0 0 0 3-5.2l-3.3-6.5V3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M7.4 14.8h9.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {icon === 'leaf' && (
        <>
          <Path d="M5.5 18.5C5.5 10.6 10.4 5.5 18.5 5.5c0 8.1-4.9 13-12.9 13Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="m5.5 18.5 8-8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {icon === 'sigma' && (
        <Path d="M6 4.5h12l-7.5 7.5 7.5 7.5H6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}
