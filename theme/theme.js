// theme/theme.js
// Single source of truth for Sohoj Pathshala visual identity.
// Direction: Warm clay & gold accents, high-contrast typography, chunky rounded actions.
// Pairs Claude's editorial restraint with Duolingo's bold, energetic layout moments.

export const colors = {
  // Brand Accents
  primary: '#C2703D',          // Warm clay / terracotta — buttons, links, active states
  primaryStrong: '#A85A2B',    // Pressed + 3D button bevel terracotta (from HTML prototype)
  primaryPressed: '#A85A2B',   // Active state (matches primaryStrong)
  primarySubtle: '#F7EDE6',    // 10% clay tint for badge backgrounds & highlights

  secondary: '#EAB308',        // Gold — achievements, high-priority badges, secondary CTAs
  secondaryPressed: '#CA9A04',
  secondaryBevel: '#E3DAC8',   // Secondary button 3D bevel shadow (from HTML prototype)
  secondarySubtle: '#FEF9E7',  // Soft gold wash

  // Status & Feedback
  success: '#22C55E',          // Correct answers, confirmed payments, completed states
  successDeep: '#166534',      // Deep pressed state / legacy forest green accent (per design-system.md)
  successSubtle: '#DCFCE7',    // Light green wash for success pills

  danger: '#FF3B30',           // Errors, rejected payments, wrong answers
  dangerPressed: '#D7261C',
  dangerSubtle: '#FEE2E2',     // Light red wash for error pills

  warning: '#FF9F0A',          // Pending review states, caution notes
  warningPressed: '#D97706',
  warningSubtle: '#FEF3C7',    // Light amber wash for pending pills

  // Base Light Mode Canvas & Surfaces
  background: '#FBF7F0',       // Warm off-white canvas
  backgroundMuted: '#F3EDE2',  // Secondary container & list row background
  surface: '#FFFFFF',          // Elevated cards & modals
  surfaceMuted: '#F8F4EC',     // Slightly sunken input background
  border: '#E5E5EA',           // Standard divider & card borders
  borderSubtle: '#ECE5D8',     // Soft divider on warm canvas
  borderDeep: '#DFD5C4',       // Warm-canvas deep dividers (from HTML prototype)

  // Base Light Mode Typography
  textPrimary: '#1D1D1F',      // Primary headlines & readable body
  textSecondary: '#6E6E73',    // Subtitles, metadata & captions
  textTertiary: '#AEAEB2',     // Placeholders & disabled text
  textInverse: '#FFFFFF',
};

// Spacing scale (4px grid base)
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  huge: 48,
};

// Corner Radii (Duolingo-inspired rounded forms)
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  input: 14,
  lg: 16,
  btn: 16,
  xl: 20,
  card: 20,
  cardLg: 24,
  pill: 999,
};

// Hind Siliguri Typography (already bundled in assets/fonts/)
const FONT_REGULAR = 'HindSiliguri-Regular';
const FONT_SEMIBOLD = 'HindSiliguri-SemiBold';

export const typography = {
  // Bold & energetic headline moments (Duolingo influence)
  hero: { fontSize: 32, fontFamily: FONT_SEMIBOLD, lineHeight: 40 },
  largeTitle: { fontSize: 28, fontFamily: FONT_SEMIBOLD, lineHeight: 36 },
  title: { fontSize: 22, fontFamily: FONT_SEMIBOLD, lineHeight: 28 },
  title2: { fontSize: 20, fontFamily: FONT_SEMIBOLD, lineHeight: 26 },
  title3: { fontSize: 17, fontFamily: FONT_SEMIBOLD, lineHeight: 22 },
  headline: { fontSize: 17, fontFamily: FONT_SEMIBOLD, lineHeight: 22 },

  // Restrained, editorial content (Claude influence)
  bodyLarge: { fontSize: 17, fontFamily: FONT_REGULAR, lineHeight: 24 },
  body: { fontSize: 15, fontFamily: FONT_REGULAR, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontFamily: FONT_SEMIBOLD, lineHeight: 22 },
  subhead: { fontSize: 13, fontFamily: FONT_REGULAR, lineHeight: 18 },
  caption: { fontSize: 12, fontFamily: FONT_REGULAR, lineHeight: 16 },
  captionBold: { fontSize: 12, fontFamily: FONT_SEMIBOLD, lineHeight: 16 },

  // Button labels (Duolingo chunky full-width CTA)
  button: { fontSize: 19, fontFamily: FONT_SEMIBOLD, letterSpacing: -0.2 },
  buttonSmall: { fontSize: 14, fontFamily: FONT_SEMIBOLD },
};

// Warm organic drop shadows
export const shadow = {
  subtle: {
    shadowColor: '#1D1D1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  card: {
    shadowColor: '#1D1D1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 2,
  },
  popover: {
    shadowColor: '#1D1D1F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 4,
  },
};

