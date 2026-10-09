# Sohoj Pathshala — Codebase README

> **What this is:** a full inventory of this repository. Every folder, every file, what
> it does, which Supabase objects it touches, and which parts are known-broken or
> deliberately temporary.
>
> **Last verified against source:** 2026-10-07 (Expo SDK 57 / RN 0.86 / React 19.2).
> This README is generated from a full read of the tree. Where the code disagrees with
> the project's own docs (`STATUS.md`, `learn.md`, in-code docblocks), the **code is
> treated as truth and the disagreement is called out** in [Known drift](#11-known-drift--doc-vs-code).

---

## Table of contents

1. [What the product is](#1-what-the-product-is)
2. [The one architectural idea: two apps, one codebase](#2-the-one-architectural-idea-two-apps-one-codebase)
3. [Tech stack](#3-tech-stack)
4. [Repository map](#4-repository-map)
5. [Root-level files](#5-root-level-files)
6. [`theme/` — design tokens](#6-theme--design-tokens)
7. [`components/` — shared UI](#7-components--shared-ui)
8. [`contexts/` — global state](#8-contexts--global-state)
9. [`lib/` — shared helpers](#9-lib--shared-helpers)
10. [`services/` — push notifications](#10-services--push-notifications)
11. [`navigation/` — the router tree](#11-navigation--the-router-tree)
12. [`screens/student/` — student app](#12-screensstudent--student-app)
13. [`screens/teacher/` — teacher/owner app](#13-screensteacher--teacherapp)
14. [Supabase schema surface](#14-supabase-schema-surface)
15. [Build, run, environment](#15-build-run-environment)
16. [Conventions and working rules](#16-conventions-and-working-rules)
17. [Temporary / deferred work](#17-temporary--deferred-work)
18. [Known drift: doc vs code](#18-known-drift--doc-vs-code)
19. [Dead code & duplication](#19-dead-code--duplication)

---

## 1. What the product is

**Sohoj Pathshala** (সহজ পাঠশালা, "easy learning") is a Bengali-language educational app for
Bangladesh's SSC (secondary) and HSC (higher secondary) Science students, built by the
Sohoj Pathshala team.

A student buys a course (manually, via bKash transaction ID), then works through:

- **CQ** (Creative Questions — বিষয় মূল্যায়ন) video lessons, organised subject → chapter → video,
  with a continuous playlist player and watch tracking.
- **MCQ practice decks** — multiple-choice decks, played through a swipe/deck card player that
  submits answers to Postgres RPCs and shows a scored review.
- **Live weekly quizzes** — time-windowed quizzes with live countdowns and a "one attempt
  per quiz" lock.
- **Free videos** — ungated preview lessons.
- A **report** tab with streaks, accuracy and per-subject breakdown, computed client-side
  from the student's own rows.

Teachers and owners manage the other side: course authoring, roster, payment review,
announcements, and teacher approval.

Backend is **Supabase** (Postgres + GoTrue Auth + RLS). No Edge Functions, no storage
buckets, no realtime subscriptions are used anywhere in the codebase.

---

## 2. The one architectural idea: two apps, one codebase

This is the single most important thing to understand about this repository.

There are **two distinct shipped applications** built from **one** Expo project. The split is
decided **at build time**, not at runtime:

```
APP_TARGET=student  →  "Sohoj Pathshala"  scheme sohojpathshala://  com.sohojpathshala.student
APP_TARGET=teacher  →  "Sohoj Shikkhok"   scheme sohojshikkhok://   com.sohojpathshala.teacher
```

Three consequences:

1. **`app.config.js`** returns a different `name`, `slug`, `scheme` and bundle/package
   identifier per target. EAS build profiles bake in `APP_TARGET` as an env var.
2. **`RootNavigator`** reads that target and mounts *either* the student navigator *or* the
   teacher navigator. Only one tree is ever mounted.
3. **Screen code contains no cross-target role branches.** Teacher code and student code are
   structurally isolated (`screens/student` vs `screens/teacher`, `navigation/student` vs
   `navigation/teacher`). Standing rule: never touch one while working in the other.

Note the terminology trap: `isOwner` (a *runtime* profile flag) is **different** from
`APP_TARGET=teacher` (a *build-time* flag). The teacher binary contains owner and
non-owner experiences, switched at runtime by `profile.is_owner`.

Also note `app.config.js` currently **defaults to `teacher`** (`process.env.APP_TARGET || 'teacher'`),
while `RootNavigator` **defaults to `student`** if no target is resolvable. So an unset env
var produces a mismatched pair — worth knowing before debugging build-target confusion.

---

## 3. Tech stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Expo (managed, with prebuild `android/`) | `~57.0.24` |
| Runtime | React Native | `0.86.3` |
| UI | React | `19.2.3` |
| Language | JavaScript (no TypeScript) | — |
| Navigation | React Navigation 7 (bottom-tabs + native-stack) | `^7.4.1` |
| Backend | `@supabase/supabase-js` (PKCE auth, AsyncStorage session) | `^2.116.0` |
| Fonts | `expo-font` — Hind Siliguri Regular + SemiBold, bundled | `~57.0.4` |
| Video | `react-native-youtube-iframe` (WebView), `react-native-webview` | `^2.4.1` / `13.16.1` |
| Gestures / anim | `react-native-gesture-handler`, `react-native-reanimated` 4 + worklets | `~2.32.0` / `4.5.1` |
| Drag reorder | `react-native-draggable-flatlist` — **currently abandoned, see §18** | `^4.0.3` |
| Icons | `@expo/vector-icons` (MaterialCommunityIcons) + hand-rolled `react-native-svg` | `^15.0.2` |
| Vector art | `react-native-svg` | `15.15.4` |
| Device | `expo-device`, `expo-constants`, `expo-linking`, `expo-location`, `expo-notifications`, `expo-splash-screen`, `expo-status-bar` | SDK 57 line |
| Storage | `@react-native-async-storage/async-storage` | `2.2.0` |
| Celebration | `react-native-confetti-cannon` | `^1.5.2` |
| Polyfill | `react-native-url-polyfill` (required by Supabase auth) | `^4.0.0` |
| Build | EAS Build, Gradle `9.3.1`, New Architecture **on**, Hermes **on** | — |

**Lint / test / CI: none.** There is no ESLint config, no test runner, no CI workflow. The
de-facto quality gate is a manual Babel parse check (see [§16](#16-conventions-and-working-rules))
plus a human reload on a physical Android device.

---

## 4. Repository map

```
sohoj-pathshala/
├── App.js, index.js, app.config.js, babel.config.js, eas.json, package.json
├── AGENTS.md, CLAUDE.md, STATUS.md, learn.md, CODE_AUDIT.md      ← project memory docs
├── .env.example (+ .env, gitignored), .gitignore
├── google-services.json                                           ← ⚠ must stay untracked
├── assets/                     brand art + bundled Hind Siliguri fonts
├── android/                    prebuilt native Android project (student-flavored)
├── components/                 7 shared UI components
├── contexts/                   UserContext (auth+profile), OnboardingContext (wizard state)
├── lib/                        supabase client, deep links, class levels, icons/locale
├── navigation/                 RootNavigator + student/ and teacher/ subtrees
├── screens/
│   ├── student/                42 screens: onboarding, tabs, course, explore, more, report
│   └── teacher/                26 screens: auth, tabs, course editor, owner tools
├── services/                   NotificationsService (push registration + tap routing)
└── theme/theme.js              the design system
```

Source-file count (excluding `node_modules`, `.git`, and build output): **~105**.

---

## 5. Root-level files

| File | Purpose |
|---|---|
| **`index.js`** | 8-line Expo entry. `registerRootComponent(App)`. |
| **`App.js`** | Root component. Loads the two Hind Siliguri fonts via `useFonts`; shows a spinner until loaded. Then mounts, in order: `GestureHandlerRootView` → `SafeAreaProvider` → `AlertProvider` → `UserProvider` → `StatusBar` → `RootNavigator`. The `GestureHandlerRootView` is mandatory for the gesture/animation libraries. |
| **`app.config.js`** | Dynamic Expo config (function form). Returns a different app identity per `APP_TARGET`. Sets portrait lock, light UI style, terracotta splash, adaptive icon, `googleServicesFile`, `expo-font` + `expo-splash-screen` plugins, and `extra.appTarget` + `extra.eas.projectId`. |
| **`babel.config.js`** | `babel-preset-expo` plus **`react-native-worklets/plugin` as the last plugin** — required by Reanimated 4; order matters. |
| **`eas.json`** | Six build profiles: `development-{student,teacher}` (dev client, internal), `preview-{student,teacher}` (internal release), `production-{student,teacher}` (auto-increment). Each sets `APP_TARGET` + `EXPO_PUBLIC_APP_TARGET`. |
| **`package.json`** | Deps above. Scripts: `start` (expo start), `android` (`expo run:android`), `ios`, `web`. `private: true`. |
| **`.env.example`** | The only two required vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. |
| **`.gitignore`** | Ignores `node_modules`, `.expo`, `/ios`, `/android`, `.env`, keystores. **Problem: `/android` is ignored yet the Android project is committed** (see §18). |
| **`AGENTS.md`** | Agent rules: read the versioned Expo v57 docs before writing code; read `learn.md` + `STATUS.md` before touching the teacher CourseEditor; append outcomes to `learn.md` after each fix session. |
| **`CLAUDE.md`** | One line: `@AGENTS.md`. |
| **`STATUS.md`** | The project's main handoff doc: end goal, file locations, standing rules, what's built and verified, what's deferred, the CourseEditor architecture, the open scroll bug, the not-done list, and pending human decisions. **Dated end of 2026-09-27; partly superseded by `learn.md` — see §18.** |
| **`learn.md`** | A mistakes log, 7 numbered entries from 2026-10-01 plus a "what works" section. Read this before CourseEditor work. **Newer than `STATUS.md` and more accurate about the current state of the content tab.** |
| **`CODE_AUDIT.md`** | A 2026-09-23 audit of the student app against the schema reference and HTML prototypes. Records Critical / High / Medium / Low findings, what was fixed, what is carried as tech debt, and what needs a live backend probe rather than a code change. |
| **`google-services.json`** | Firebase config for FCM. Present in the repo root and duplicated in `android/app/`. **Contains project identifiers and is not gitignored — must be kept out of version control.** |
| **`LICENSE`** | MIT, `Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)` — the stock Expo template license, unmodified. Worth replacing with the company's own license before release. |

### `assets/`

- `icon.png`, `splash-icon.png`, `favicon.png` — the terracotta Sohoj Pathshala logo (all the same artwork).
- `android-icon-foreground.png` — transparent glyph for the adaptive icon.
- `android-icon-background.png`, `android-icon-monochrome.png` — themed-icon layers (monochrome is currently unused by `app.config.js`).
- `fonts/HindSiliguri-Regular.ttf`, `fonts/HindSiliguri-SemiBold.ttf` — the two weights bundled into the app. Both are referenced by `useFonts` in `App.js` and by name in `theme/theme.js`.

### `android/`

A **prebuilt (bare) Expo Android project**, currently configured for the **student** package.

| Path | Notes |
|---|---|
| `settings.gradle` | Standard Expo autolinking; resolves the RN Gradle plugin and `expo-modules-autolinking` from `node_modules`. `rootProject.name = 'Sohoj Pathshala'`. |
| `build.gradle` | Top-level. Adds the `google-services` 4.4.4 classpath and applies `expo-root-project` + `com.facebook.react.rootproject`. |
| `gradle.properties` | **`newArchEnabled=true`**, `hermesEnabled=true`, `edgeToEdgeEnabled=true`, parallel builds, 2 GB heap, all four ABIs, gif + static-webp enabled, animated webp disabled, dev-client network inspector on. |
| `gradle/wrapper/` | Gradle **9.3.1**. |
| `app/build.gradle` | `namespace`/`applicationId` = **`com.sohojpathshala.student`** (hardcoded — the teacher package is only produced by an EAS prebuild, not by editing this file). `versionCode 1`, `versionName 1.0.0`. Release builds **still sign with the debug keystore** — flagged in-file as not production-ready. Applies `com.google.gms.google-services` last. |
| `app/debug.keystore` | Standard RN debug keystore, committed. |
| `app/proguard-rules.pro` | Keep rules for Reanimated + TurboModules. |
| `app/google-services.json` | Copy of the root Firebase config. |
| `app/src/main/java/com/sohojpathshala/student/MainApplication.kt` | Expo `ReactHost` setup with autolinking and New Architecture release level from `BuildConfig`. |
| `app/src/main/java/com/sohojpathshala/student/MainActivity.kt` | Single-activity host; sets `AppTheme` before `super.onCreate` for the splash screen; Android-S-aware back behaviour. |
| `app/src/main/AndroidManifest.xml` | Permissions: coarse + fine location, internet, vibrate, read/write external storage (capped at SDK 32), `SYSTEM_ALERT_WINDOW` (dev client). **The `sohojpathshala://` deep-link intent-filter is hardcoded here** — the teacher build's `sohojshikkhok://` scheme comes from the EAS prebuild, not this file. Expo Updates metadata is present but `ENABLED=false`. |
| `app/src/debug/AndroidManifest.xml`, `app/src/debugOptimized/AndroidManifest.xml` | Debug overlays: cleartext traffic enabled, overlay permission. |
| `app/src/main/res/values/` | `colors.xml` (a stock template `colorPrimary` `#023c69` that does **not** match the brand — the app's actual brand colour comes from `theme/theme.js` and `app.config.js`); `strings.xml` (`app_name = "Sohoj Pathshala"`); `styles.xml` (`AppTheme` + `Theme.App.SplashScreen`). |
| `app/src/main/res/mipmap-*/` | Launcher icons at five densities (adaptive + legacy + foreground + round). |
| `app/src/main/res/drawable*/` | `splashscreen_logo.png` at four densities, `ic_launcher_background.xml`, `rn_edit_text_material.xml`. |
| `android/.gradle/`, `android/app/.cxx/` | **Build output present on disk** (~10 MB of CMake/Ninja state). Ignored by `android/.gitignore`; delete to reclaim space. |

There is **no committed `ios/` directory** — iOS is EAS-build only.

---

## 6. `theme/theme.js`

The single source of truth for visual identity — 124 lines, five exports, and it is
documented as *"warm clay & gold accents, high-contrast typography, chunky rounded actions,
pairing Claude's editorial restraint with Duolingo's bold, energetic layout moments."*

- **`colors`** — flat tokens only, grouped and commented: brand (`primary #C2703D`,
  `primaryStrong/#A85A2B`, `secondary` gold `#EAB308`), status (`success`, `danger`, `warning`
  with `*Pressed`/`*Subtle` triplets), canvas (`background #FBF7F0`, `surface`, four border
  greys), and typography (`textPrimary` … `textInverse`).
- **`spacing`** — 4px grid: `xxs` 2 → `huge` 48.
- **`radius`** — 4 → `pill` 999, including semantic entries (`input`, `btn`, `card`, `cardLg`).
- **`typography`** — Hind Siliguri, with two named registers: `hero`…`headline` (SemiBold,
  "bold and energetic") and `bodyLarge`…`captionBold` (Regular, "restrained, editorial"),
  plus button sizes.
- **`shadow`** — three warm organic shadows: `subtle`, `card`, `popover`.

Standing rule from `STATUS.md`: **flat colour tokens only**; brand primary `#C2703D`,
background `#FBF7F0`. Note that several components still hardcode hex values inline
(e.g. `#EAE1D0` progress segments, `#F0E7D8` pressed states in `OnboardingStepShell`,
`#B45309`/`#92400E` chip text in `StatusChip`) — so the tokens are the convention, not an
enforced one.

---

## 7. `components/`

Seven shared components. All are theme-driven and Bangla/English aware.

| File | What it is |
|---|---|
| **`Button.js`** (208 ln) | The signature "chunky 3D" button. Variants `primary`/`secondary`/`outline`/`ghost`/`danger`, sizes `lg`/`md`/`sm`. Implemented as an outer `Pressable` (the bevel) wrapping an inner `View` (the face) that translates down 3px when pressed — 16px radius, not a pill. Supports `loading` (spinner), `disabled`, `icon`, `rightIcon`, `fullWidth`, and sets `accessibilityRole`/`accessibilityState`. |
| **`CustomAlert.js`** (131 ln) | **The project's mandated alert system.** A `Modal`-based alert driven by `AlertProvider` + `useAlert()`. Signature is `alert(title, message, buttons)` where each button is `{text, style, onPress}`. Supports `destructive` / `cancel` styles. Standing rule: **never use React Native's `Alert.alert`** — `CODE_AUDIT.md` confirms zero occurrences. |
| **`Card.js`** (83 ln) | Elevated container, variants `elevated`/`flat`/`muted`. Renders a `Pressable` when `onPress` is supplied, otherwise a `View`, so it stays accessible either way. 20px radius, `spacing.lg` inner padding. |
| **`ProgressBar.js`** (90 ln) | Animated 0→1 progress bar. `Animated.timing` over 450ms with `useNativeDriver: false` (it animates `width`). Variants `primary`/`success`/`gold`. Carries `accessibilityRole="progressbar"`. |
| **`StatusChip.js`** (117 ln) | Pill badge mapping a status string to a bg/text/border triple: `paid`/`approved`/`success`, `pending`/`warning`, `rejected`/`danger`, `gold`/`owner`, `primary`, `neutral`/`draft`. Sizes `sm`/`md`, optional icon. |
| **`OnboardingStepShell.js`** (219 ln) | The chrome every onboarding step shares: safe area, keyboard-avoiding wrapper, back chevron, step title, "ধাপ ৩ / ৯" indicator, and the 9-segment progress bar (14px pills, 5px gaps). Props: `step`, `totalSteps`, `title`, `onBack`, `lang`. Converts step numbers to Bengali digits. Contains a local `toBnDigit` and an inline `ChevronLeftIcon`. |
| **`SignOutButton.js`** (73 ln) | Two exports: `askSignOut({alert, signOut, isBn})` — a promise-wrapped confirm dialog, so any caller can await "did they confirm?" — and the default `SignOutButton`, a ready-made confirm+sign-out button. After signing out it performs **no navigation**: the root guards re-route automatically. |

---

## 8. `contexts/`

### `UserContext.js` (242 ln) — auth and identity

`UserProvider` + `useUser()`. State: `session`, `profile`, `loading`.

- On mount it wires three things: a **deep-link PKCE handler** (`Linking.getInitialURL` +
  `addEventListener('url')` → `supabase.auth.exchangeCodeForSession`), the initial
  `getSession()` read, and `onAuthStateChange`. Any authenticated transition calls
  `fetchProfile(userId)` and fire-and-forgets `syncPushTokenForUser(userId)`.
- `fetchProfile` selects `*` from `profiles` by `id`.
- Auth methods: `signUpStudent` (no `role` in metadata — a DB trigger defaults it to
  `student`), `signUpTeacher` (`role: 'teacher'` in metadata — the trigger sets
  `teacher_approval_status = 'pending'`), `resendConfirmationEmail`, `signInWithOtp`
  (with `data.phone` and `shouldCreateUser: true`), `verifyOtp` (`type: 'email'`),
  `signIn`, `signOut`, `updateProfile`, `refreshProfile`.
- **Student signup is a three-step OTP chain:** `signInWithOtp` → `verifyOtp` →
  `updateUser({password})`. Both signup methods set `emailRedirectTo:
  Linking.createURL('confirm')` and return `needsEmailConfirmation` when no session came back.
- `signOut` uses `scope: 'local'` and clears `profile`/`session` in a `finally` block —
  both choices are commented as fixes for zombie sessions that resurrected on every cold boot.
- Derived role flags: `role` (default `'student'`), `isOwner`, `teacherApprovalStatus`,
  `isApprovedTeacher`.

### `OnboardingContext.js` (63 ln) — wizard scratch state

`OnboardingProvider` + `useOnboarding()`. A single flat object of 16 fields
(`email`, `phone`, `otp`, `password`, `confirmPassword`, `name`, `nickname`, `avatarPreset`,
`agreedToTerms`, `classLevelId`, `classLevelName`, `locationPermission`, `locationCoords`,
`locationDistrict`, `onboardingComplete`, `schoolName`) with `updateData(fields)` (shallow
merge) and `resetOnboarding()`.

**Important:** this state is **in memory only** — nothing is persisted. `onboardingComplete`
lives here, not in the database, which is why the root guard treats it as the primary gate.
`schoolName` is declared but unused by any screen.

---

## 9. `lib/`

Four modules. All are documented as deliberate extractions that replaced 10+ duplicated
copies across screens (a `CODE_AUDIT.md` medium-severity fix).

### `supabase.js` (20 ln)
Creates the single client. **Imports `react-native-url-polyfill/auto` first** (Supabase auth
needs `URL`), uses AsyncStorage for session persistence with `autoRefreshToken: true`,
`persistSession: true`, `detectSessionInUrl: false`, and **`flowType: 'pkce'`**. Reads
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` and warns (rather than
throwing) if either is missing.

### `classLevel.js` (40 ln)
The only sanctioned way to touch `class_levels`. `getClassLevelId(name)` throws on failure;
`getClassLevelName(id)` returns `null` for unreadable or unexpected values so callers fall
back to a default. **UUIDs are never hardcoded** anywhere in the codebase — a re-audited
invariant in `CODE_AUDIT.md`.

### `linking.js` (89 ln) — the deep-link map
A React Navigation `linking` config with **both** schemes registered
(`sohojpathshala://` and `sohojshikkhok://`), so one config serves either binary and only
the mounted tree can match. It maps the four student tab stacks (with paths like
`course/:courseId`, `cq/:courseId/:subjectId/:chapterId`, `payment/:trxId`) and — by
design — **only the teacher-unique tab routes** (`t-courses`, `t-students`, `t-payments`),
because teacher tabs reuse the route names `Dashboard` and `More` and those have no link
targets.

The header comment explicitly documents four deliberate omissions: PKCE auth links (handled
by `UserContext`, no route), teacher `course/:id/content` (lands on the Page tab instead),
`StudentDetail` (takes a whole student object, so a link cannot reconstruct it), and links
resolved while logged out (ignored with a warning).

### `subjectIcons.js` (86 ln)
Shared SVG subject icons plus locale helpers. Exports `SubjectIcon` (four hand-drawn
24×24 `react-native-svg` glyphs: `atom`, `flask`, `leaf`, `sigma` — path data copied verbatim
from the HTML prototype), `iconForSubjectKey(key)`, `iconForSubjectName(name)` (matches
English *and* Bengali substrings), `toBn(n)` (ASCII digits → ০১২৩৪৫৬৭৮৯), `MONTHS`, `DAYL`, and
`AVATAR_PRESETS` — four solid-colour avatar presets whose **array index doubles as the
`avatar_preset` smallint stored in the DB**.

---

## 10. `services/`

### `NotificationsService.js` (195 ln) — push registration and tap routing

Five exports plus one module-level `navigationRef`.

- **`expo-notifications` is `require`d lazily inside a try/catch.** Remote push was removed
  from Expo Go (SDK 53+), and a static import throws at load time and red-screens the whole
  app. Every function below no-ops when the module is `null`, so the app boots fine without
  push. This is a deliberate, commented safety design.
- `registerForPushNotifications(userId)` — the full chain, each step degrading to a `warn`:
  real device check → Android `default` notification channel → permission request → EAS
  `projectId` resolution (`Constants.expoConfig.extra.eas.projectId` →
  `Constants.easConfig.projectId` → `EXPO_PUBLIC_EAS_PROJECT_ID`) → `getExpoPushTokenAsync`
  → persist to `profiles.push_token`. Returns the token or `null`, never throws.
- `syncPushTokenForUser(userId)` — fire-and-forget wrapper used by `UserContext`.
- `handleNotificationResponse(response)` — routes a tapped notification by `data.type`:
  `free_video` → Dashboard→CourseHome, `payment_status` → More→PaymentHistory,
  `announcement` → More→Notifications, unknown → Dashboard. **Student routes only**; a tap
  before `navigationRef.isReady()` is dropped with a warning, never a crash.
- `setupNotificationListeners()` — attaches foreground + tap listeners, returns an
  unsubscribe function. Called once from `RootNavigator`'s `useEffect`.

The header comment lists three human prerequisites; per `STATUS.md` the SQL column and the
FCM **legacy server key** upload are the remaining blockers for end-to-end push.

---

## 11. `navigation/`

```
RootNavigator                    ← build-target router + NavigationContainer + push listeners
├── student/StudentRootNavigator.js   ← auth/onboarding/app guard
│   └── student/StudentApp.js         ← 4 bottom tabs
│       ├── CourseStackNavigator.js
│       ├── ExploreStackNavigator.js
│       ├── ReportStackNavigator.js
│       └── MoreStackNavigator.js
└── teacher/TeacherRootNavigator.js   ← approval/access gate
    └── teacher/TeacherApp.js         ← 5 bottom tabs
        ├── TeacherCoursesStack.js
        ├── TeacherStudentsStack.js
        └── TeacherMoreStack.js
```

`NavigationContainer` carries the `linking` config, the `navigationRef` from
`NotificationsService`, and both trees are mounted conditionally.

---

## 12. `screens/student/` — student app

**42 screens.** Every screen carries a long docblock citing which HTML prototype file it
was built from and enumerating deliberate deviations (demo values not reproduced, demo
chrome omitted). All alerts are bilingual via `const [lang] = useState('bn')` and
`isBn ? '…' : '…'`.

### 12.1 Navigation and guards

**`student/StudentRootNavigator.js`** (99 ln) wraps everything in `OnboardingProvider` —
deliberately *above* the guard so screens and guard share the same state. Its
`OnboardingStack` (headerless, `slide_from_right`) registers 11 routes: `Landing`, `SignIn`,
and `OnboardingAccount` / `Otp` / `Password` / `Name` / `Photo` / `Terms` / `Class` /
`Reveal` / `Location`.

The guard order is exact and deliberate:

1. `loading` → spinner
2. `onboardingData.onboardingComplete` → `<StudentApp/>`
3. `!session` → `<OnboardingStack key="landing">`
4. `!profile?.class_level_id && !onboardingComplete` → `<OnboardingStack key="resume-otp">` starting at `OnboardingOtp`
5. otherwise → `<StudentApp/>`

The **`key` prop is intentional** — it forces a remount so a changed `initialRouteName`
actually takes effect (a stale-stack bug this pattern fixes).

**`student/StudentApp.js`** (95 ln) — four bottom tabs (`Dashboard`, `Explore`, `Report`,
`More`), each hosting its own stack. The tab bar lives in a bottom-edged `SafeAreaView`
with `paddingBottom: 0` / height 64, an Android display-cutoff workaround. Icons are
MaterialCommunityIcons (`home`, `compass-outline`, `chart-bar`, `dots-horizontal`).
`lang` is hardcoded `'bn'` — **there is no in-app language switcher outside the auth screens.**

The four stack navigators are all `headerShown: false`, `animation: 'slide_from_right'`:

| File | Routes |
|---|---|
| `CourseStackNavigator.js` | `DashboardMain`, `CourseHome`, `CQList`, `CQSubject`, `CQVideos`, `CQWatch`, `MCQList`, `MCQSubject`, `MCQDeck`, `WeeklyQuiz`, `FreeVideos`, `FreeWatch` |
| `ExploreStackNavigator.js` | `ExploreMain`, `CourseDetail`, `PayIntro`, `PayTrxID`, `PayPending`, `HowToPay` |
| `ReportStackNavigator.js` | `ReportMain`, `ReportDetail` |
| `MoreStackNavigator.js` | `MoreMain`, `PaymentHistory`, `Legal`, `Notifications` |

### 12.2 Top level

| File | Screen | Behaviour |
|---|---|---|
| `LandingScreen.js` (~303 ln) | `Landing` | Purely static marketing screen — **no Supabase at all**. Functional bn/en toggle pill. `Start` → `OnboardingAccount` (or the `onStart` prop), `Sign in` → `SignIn`. Inline SVG book and arrow icons. |
| `SignInScreen.js` (~251 ln) | `SignIn` | Email + password → `signIn()`. Errors surface through `useAlert()`. Back returns to `Landing` when there's no history. |
| `StudentAuthScreen.js` (~395 ln) | — | **Dead code.** A combined sign-up/sign-in screen with email-confirmation and resend states. Not imported anywhere and not registered in any navigator. |

### 12.3 `onboarding/` — the 9-step wizard

Each step is a thin body wrapped in `OnboardingStepShell` (`step`, `totalSteps={9}`) and
reads/writes `useOnboarding()`. Steps 1, 2, 3, 4, 5 and 7 each contain an explicit
**`TEMP DEV BYPASS`** block, commented and cross-referenced to `STATUS.md`, that skips the
real Supabase call when there is no live session and advances anyway — so the flow stays
navigable before email delivery is configured. None of them swallow real errors.

| Step | File | What happens |
|---|---|---|
| 1 | `AccountStepScreen.js` (~198 ln) | Email + phone. `signInWithOtp` is *imported but its call is short-circuited by an early return* — **no OTP email is actually sent.** |
| 2 | `OtpStepScreen.js` (~294 ln) | Six single-digit boxes with auto-advance, backspace-to-previous, and paste handling via `inputRefs`. The bypass `return` deliberately sits **above** the `code.length < 6` gate. `handleResend` is intentionally left on the **real** path — it will error until the Resend domain is verified, and it fails honestly rather than faking success. |
| 3 | `PasswordStepScreen.js` (~232 ln) | `supabase.auth.updateUser({password})`. Requires ≥8 chars and a match. Show/hide toggles. An `AuthSessionMissingError` warns and advances. |
| 4 | `NameStepScreen.js` (~203 ln) | Permanent name (+ optional nickname) via `updateProfile()`. Auth errors warn and advance. |
| 5 | `PhotoStepScreen.js` (~267 ln) | **Real uploads were removed** — no image picker, no storage bucket. Four colour presets from `AVATAR_PRESETS`; Continue requires a selection (alerts otherwise) and writes `avatar_preset`. **Skip writes to context only, with no server call.** |
| 6 | `TermsStepScreen.js` (~287 ln) | **No Supabase call, by design.** Acceptance is stored only as `agreedToTerms: true`. The checkbox is required; Terms/Privacy links raise placeholder alerts. The copy is self-flagged as placeholder legal text that must be replaced. |
| 7 | `ClassStepScreen.js` (~251 ln) | Binary `LEVELS = ['SSC','HSC']`. Tap-to-select-and-advance (no CTA). Resolves the UUID via `getClassLevelId(level)` then writes `class_level_id`, storing both the UUID and the name. |
| 8 | `RevealStepScreen.js` (~317 ln) | Celebration screen, **no Supabase**. Reads `classLevelName` (falling back to `'SSC'`) and renders that level's subject list. `ConfettiCannon` (80 pieces, `autoStart`, `fallSpeed 1400`) in a full-screen `pointerEvents="none"` overlay, gated on `AccessibilityInfo.isReduceMotionEnabled()`. |
| 9 | `LocationStepScreen.js` (~169 ln) | `expo-location`: foreground permission → `getCurrentPositionAsync({accuracy: Balanced})` → `reverseGeocodeAsync` for district/subregion/city. **Writes `onboardingComplete: true`**, which trips the root guard into the app. Context only — no `updateProfile`, because there is no district column. Skip still sets `onboardingComplete`. |

### 12.4 `tabs/` — the four tab roots

**`DashboardScreen.js`** (~348 ln, `DashboardMain`) — loads `continueCourses` from
`course_purchases` joined to `courses`, filtered to `status = 'confirmed'`; with no session
it previews the first `courses` row (`preview: true`). The "This Week's Quiz" and
"Practice Decks" tiles show a lock + alert until an owned course exists; they then navigate
to `WeeklyQuiz` and `MCQList`. A `checkingTarget` state disables the cards and swaps the
tapped card's icon for a spinner during the access check. Bell → Notifications, Report tile
→ Report, Free Classes → FreeVideos. The three `BANNERS` are hardcoded static copy whose taps
raise a placeholder alert. **Contains the leftover "Preview (dev)" bypass card that is to be
deleted after the revert.**

**`ExploreScreen.js`** (~156 ln, `ExploreMain`) — queries `courses` (with `class_levels(name)`)
filtered by the profile's `class_level_id`, limited to 5, and takes the first; then `subjects`
by `order_index`, then a `chapters` head-count via `.in('subject_id', ids)`. Tap →
`CourseDetail`. An "enrolled" pill is deliberately omitted because RLS wouldn't allow it.

**`MoreScreen.js`** (~309 ln, `MoreMain`) — inline profile name/nickname editing via
`updateProfile()` (auth errors warn and keep the local value). "My course" jumps to the
newest confirmed purchase's `CourseHome`, or the first course when logged out. Menu rows →
`PaymentHistory`, `Legal {doc:'privacy'}`, `Legal {doc:'terms'}`. Sign-out is real.

**`ReportScreen.js`** (~453 ln, `ReportMain`) — the analytics screen. Queries **only the
student's own rows, capped at 500 each**: `cq_video_views`, `mcq_deck_attempts` with a nested
`mcq_decks(chapters(subjects(name)))` select, and `quiz_submissions` with a nested
`quizzes(subjects(name))` select. Both nested selects fall back to flat selects on error.
Everything is derived **client-side**: Monday-based week bounds, a trailing streak that
counts from today or yesterday, `accuracy = scoreSum / totalSum`, and a 7-bar activity chart
(daily for the 7-day range, `~30/7` buckets for 30). Per-subject accuracy comes from a
substring matcher over Bengali and English subject names. The "study time" concept is
replaced by "videos watched" because **no watch-duration data exists** — reporting hours
would be fabricated.

### 12.5 `course/` — 11 screens + the gate

**`course/gate.js`** (26 ln) — the purchase gate, and the single most reused helper in the
student app. `checkCourseAccess(courseId, userId)` returns `{allowed, preview}`: with no
`userId` it returns `{allowed: true, preview: true}` behind a `TEMP DEV BYPASS` warning;
otherwise it calls the **`is_purchased(p_course_id)`** RPC, throws on error, and returns
`allowed: data === true`. Also exports `isNoSessionError(err)`, which recognises
`'Not authenticated'`, `AuthSessionMissingError`, and any message containing
`'Auth session missing'`.

| File | Route | Behaviour |
|---|---|---|
| `CourseHomeScreen.js` (~141 ln) | `CourseHome` | The hub: two cards, CQ practice → `CQList` and MCQ quizzes → `MCQList`. Each runs `checkCourseAccess` first; a denial raises a "Buy Course" alert. `checkingTarget` disables both cards mid-check. A third "All videos" card was removed on 2026-09-27. |
| `CQListScreen.js` (~177 ln) | `CQList` | Gated; a denial alerts and `goBack()`s. Queries `subjects`, then `chapters`, then `cq_videos`, counting in JS. |
| `CQSubjectScreen.js` (~175 ln) | `CQSubject` | Gated. `subjects` `.single()`, `chapters` by `order_index`, `cq_videos` head-count. |
| `CQVideosScreen.js` (~209 ln) | `CQVideos` | Gated (re-checked on each load). Resolves the chapter index, lists `cq_videos` (`youtube_url`, `description`) by `order_index`, and overlays checkmarks from the student's own `cq_video_views`. |
| `CQWatchScreen.js` (~450 ln) | `CQWatch` | **The video player.** Builds a playlist of *every* video across *every* chapter of the subject, ordered chapter-then-video, and seeks to `videoId`. Player is `react-native-youtube-iframe` at `screenWidth * 9/16` with `key={current.id}` to force a reload, and `youtubeIdFromUrl` regexes covering `?v=`, `youtu.be/`, `/embed/` and `/shorts/`. On `onChangeState === 'ended'` it calls `markWatched` — an **upsert into `cq_video_views`** with `onConflict: 'video_id,student_id'`, plus an optimistic local `Set` update; no-session errors warn only. A `Modal` bottom-sheet "library" lists chapters collapsibly with jump-to, and prev/next navigation is built in. |
| `FreeVideosScreen.js` (~159 ln) | `FreeVideos` | Ungated. Queries `free_videos` filtered by `class_level_id` when known, ordered by `order_index`. **No watch tracking** — there is no tracking table for free videos. |
| `FreeWatchScreen.js` (~327 ln) | `FreeWatch` | Same player + library + prev/next pattern as `CQWatch`, but the playlist is every `free_videos` row for the class level (all levels when unknown). No gate, no recording. |
| `MCQListScreen.js` (~200 ln) | `MCQList` | Gated. Subjects + chapters + `mcq_decks` read with a deliberate `select('*').limit(200)` because the deck columns and student SELECT grant are **unverified**. A probe failure throws, sets `deckBlocked`, and renders an "MCQ access restricted" banner rather than a misleading zero count. Decks are scoped by `chapter_id` **or** `subject_id`. |
| `MCQSubjectScreen.js` (~249 ln) | `MCQSubject` | Gated. Same defensive deck read. A `deckOpenState(deck)` helper resolves openness from, in order: a `status` string list (`open`/`active`/`live`/`published` vs `closed`/`locked`/`draft`/`inactive`), then `is_open`/`is_closed` booleans, then an `opens_at`/`closes_at` window — and returns `null` (chip omitted) when it genuinely can't tell. **Question counts are deliberately omitted** because they are instructor-only under RLS. |
| `MCQDeckPlayerScreen.js` (~553 ln) | `MCQDeck` | **The quiz engine, and the most intricate screen on the student side.** Serves both practice decks and live weekly quizzes via a `mode` param. Gates on `checkCourseAccess`, then on a session (no fake local quiz without one). Four load paths: quiz-retake guard (`quiz_submissions` for the student → `get_quiz_review(p_quiz_id)`; RPC failure sets `takenLocked`), `get_quiz_questions(p_quiz_id)` → direct `quiz_questions` select ordered by `position`, `get_mcq_deck_questions(p_deck_id)` → direct `mcq_deck_questions` ordered by `order_index`, with ordering normalised across both column names. Submit requires every question answered (alerts and jumps to the first unanswered), then calls **`submit_quiz(p_quiz_id, p_answers)`** or **`submit_mcq_deck_attempt(p_deck_id, p_answers)`** with `[{question_id, selected_option_index}]` and renders the server's `score`/`total_questions`. Review comes from `get_quiz_review` / `get_mcq_deck_review`, rebuilt locally from the loaded questions if the RPC is unavailable. The result screen shows `score/total`, a percentage with tiered messaging (≥80 / ≥50 / below), and per-question correct-vs-picked marks; `Try again` clears state. Helpers `normalizeOptions` (a jsonb array of either strings or `{text|label|option}` objects) and `optionLetter` (ক/খ/গ… vs A–F) absorb schema drift. |
| `WeeklyQuizScreen.js` (~341 ln) | `WeeklyQuiz` | Queries `quizzes` (`opens_at`, `closes_at`, `subject_id`) ordered by `opens_at` desc, limit 50, then **client-filters to the current Monday–Sunday week** (rows with no `opens_at` always stay); plus the student's `quiz_submissions`, and `subjects`/`courses` to resolve names. A `windowState()` helper yields `upcoming`/`live`/`ended`/`unknown`. A single 1-second `setInterval` keeps countdowns live and `fmtRemaining` renders `2d 3h 15m 20s`. Tapping a live quiz runs `checkCourseAccess` on its resolved course before navigating to `MCQDeck` with `mode: 'quiz'`; upcoming/ended taps raise an informational alert. Quizzes with no resolvable course open directly, since the server RPC still enforces. |

### 12.6 `explore/` — catalogue and the manual bKash payment flow

The payment path is **deliberately manual**: the student sends bKash money themselves and
submits the transaction ID; an owner confirms it in the teacher app. There is no payment API
integration (a documented human decision).

| File | Route | Behaviour |
|---|---|---|
| `CourseDetailScreen.js` (~423 ln) | `CourseDetail` | The catalogue page. Queries `courses` (+ `class_levels(name)`), `subjects`, `chapters`, and head-counts of **both `cq_videos` and `mcq_extra_videos`** (summed into `videoCount`), `course_faqs`, and — only with a session — `course_instructors` joined to `profiles(name, bio, avatar_url)` plus the student's own `course_purchases` status. Both a `useEffect` and a `useFocusEffect` call the same `useCallback`'d `load`, so returning to the screen refreshes the purchase state. The sticky buy bar branches three ways: confirmed → cross-tab jump to `CourseHome`; pending → `PayPending`; else → `PayIntro`. Syllabus and FAQ are accordions; the preview-video button raises a placeholder alert. |
| `PayIntroScreen.js` (~198 ln) | `PayIntro` | Payment step 1 of 3. Reads `courses.price` and `payment_settings.bkash_number` with the singleton `.eq('id', 1)` guard. **A load failure renders an error block with a retry button** — it never displays `৳ 0` or `—` as if they were real (a fixed `CODE_AUDIT.md` high-severity finding). `retryKey` forces the reload. |
| `PayTrxIDScreen.js` (~269 ln) | `PayTrxID` | Payment step 2 of 3. Accepts **either** `courseId` **or** `trxId` (the deep-link entry `payment/:trxId` resolves the course by querying the student's own purchases by `trx_id`). Validates a non-empty TrxID, **trims and uppercases it**, then **inserts into `course_purchases`** with `{student_id, course_id, amount: price, trx_id, status: 'pending'}`. `payer_number` is intentionally omitted. With no session the insert is skipped with a warning and the flow still advances. |
| `PayPendingScreen.js` (~168 ln) | `PayPending` | Payment step 3 of 3. No insert. "Check status" re-reads the student's newest purchase for that course: `confirmed` → "opens soon", otherwise "we'll check again shortly". Short-circuits to the same message when there's no session or course. Both back paths return to `CourseDetail`. |
| `HowToPayScreen.js` (~131 ln) | `HowToPay` | Reads `payment_settings.how_to_pay_video_url` (singleton id 1) and renders it in a `YoutubeIframe` at `(screenWidth - 40) * 9/16`, with an empty state for when the owner hasn't set a URL. |

### 12.7 `more/`

- **`PaymentHistoryScreen.js`** (~147 ln) — the student's own `course_purchases` joined to
  `courses(title)`, newest first, with a verbatim empty state. `statusLabel` maps to
  `Confirmed` / `Pending` / else `Rejected`; the third label carries an explicit
  inventor-flag comment because a rejected row has to say something truthful and the
  prototype has no string for it.
- **`NotificationsScreen.js`** (~193 ln) — the student's `notifications` rows; tapping an
  unread one patches `read_at` optimistically and then persists it. Routes by type:
  `payment_status` → PaymentHistory; `quiz_reminder_1h` / `quiz_reminder_30m` →
  Dashboard→WeeklyQuiz; `free_video` / `quiz_window` / `announcement` → placeholder alert.
  A `TypeIcon` maps type → SVG. **An empty list renders nothing at all** — no empty-state copy.
- **`LegalScreen.js`** (~108 ln) — **no Supabase.** A `DOCS` constant holds hardcoded bn/en
  paragraphs copied from the prototype, self-flagged as placeholder text; the final ToS and
  Privacy Policy have not been written.

### 12.8 `report/`

**`ReportDetailScreen.js`** (~321 ln) — reads `cq_video_views` head-count for videos watched,
plus `mcq_deck_attempts` and `quiz_submissions` with nested subject selects (each with a flat
fallback, limit 500), and resolves the class level via `getClassLevelName()`. Two metric
cards (quizzes taken, accuracy) and per-subject rows. `quizUnknown` is set only when **both**
attempt sources fail, and then the cards render `?` with an explicit "quiz data unavailable"
note instead of a misleading `0` — another fixed `CODE_AUDIT.md` high finding.

---

## 13. `screens/teacher/` — teacher/owner app

**26 screens.** Two roles share one binary, decided at runtime by `profile.is_owner`:

- **Owner** (`is_owner`) — sees everything, bypasses teacher approval entirely, and owns the
  approval queue, announcements, payment review, and revenue.
- **Teacher** (`role === 'teacher'` + `teacher_approval_status === 'approved'`) — sees and
  edits only courses where they appear in `course_instructors`.

The uniform authorisation check across teacher screens is
**`canEdit = isOwner || listedInCourse`**, and `locked = !canEdit` hides all editing controls.

### 13.1 Navigation

**`teacher/TeacherRootNavigator.js`** (141 ln) — the access gate. It makes **no Supabase
calls of its own**; it reads `useUser()`. Guard order:

1. `loading` → spinner
2. `!session` → `TeacherAuthStack`
3. `isOwner` → `TeacherApp` — **owners bypass approval entirely**
4. `role !== 'teacher'` → an inline `AccessDeniedScreen` ("Student Account Detected")
5. `teacherApprovalStatus === 'rejected'` → `RejectedApprovalScreen`
6. `=== 'pending'` → `PendingApprovalScreen`
7. else → `TeacherApp`

**`teacher/TeacherApp.js`** (100 ln) — five bottom tabs with a `TAB_META` table of bn/en
labels: `Dashboard`, `Courses` (stack), `Students` (stack), `Payments`, `More` (stack).
`lang` is hardcoded `'bn'` with no setter.

Stack navigators — all `headerShown: false`, `slide_from_right`:
`TeacherCoursesStack.js` (`CoursesMain`, `CourseEditor`, `SubjectDetail`, `ChapterDetail`,
`FreeVideos`), `TeacherStudentsStack.js` (`StudentsMain`, `StudentDetail`),
`TeacherMoreStack.js` (`MoreMain`, `Report`, `Approvals`, `Announcements`, `FreeVideos` —
note `FreeVideos` is registered in **both** the Courses and More stacks).

### 13.2 `TeacherCourseEditorScreen.js` — 1,770 lines, the staged-save centrepiece

The most complex file in the repository, and the one the project docs single out.

**Architecture: nothing is written until the header Save is pressed.** All edits stage into
local working state; dirty state is a whole-object `JSON.stringify` comparison against a
`snapshotRef` taken at load time (positions included, so reorders count; URLs and
descriptions included, so text edits count). The header Save button renders grey when clean
and orange when dirty.

**Reads:** `courses` (`title`, `price`, `description`, `what_you_get`, `trailer_urls`,
`is_published`), `course_instructors` (`teacher_id`, `is_creator`, joined `profiles(name)`),
`profiles` filtered to approved teachers, `course_faqs`, `subjects`, `chapters`, `cq_videos`.

**`handleSaveAll` flushes in eight ordered phases:**

1. insert new subjects
2. insert new chapters
3. per-row `UPDATE` of existing chapter order
4. insert new videos
5. per-row video order `UPDATE`s
6. `UPDATE courses` (price, description, what_you_get, trailer_urls)
7. diff and insert/delete `course_instructors` rows
8. insert new FAQs

**Orders are always written as per-row `UPDATE`s and never as upserts.** The in-file comment
explains why: upsert's `INSERT` branch fires with partial null rows and trips NOT NULL and
RLS. This is a hard-won invariant — do not "simplify" it.

New rows are tracked by **string-prefixed temp IDs** (`new-sub-*`, `new-chap-*`,
`new-vid-*`, `new-faq-*`) rather than a boolean flag. Instructor rows are sorted by
`teacher_id` before diffing so the comparison is order-stable.

**The exit guard** registers a `navigation.addListener('beforeRemove')` listener *and* hooks
the header back button, both routed through `confirmExit`, which offers **Discard / Draft
(stay) / Save**. An `exitingRef`/`dirtyRef` pair guards against double-firing.

Other specifics: `canEdit`/`locked` gate every control; owners editing an unlisted course get
an explicit "Owner override" banner. YouTube links are validated by `youtubeIdFromUrl`
(watch, youtu.be, /embed/, /shorts/). **Creators can never be removed from the instructor
list.**

**Live reordering is deliberately *not* drag-and-drop on the Content tab.** It uses a
long-press menu (`openMoveMenu`) with move-up/down, because `react-native-draggable-flatlist`
renders completely blank under Expo Go — see `learn.md` #6 and [§18](#18-known-drift--doc-vs-code).
`DraggableFlatList` survives in exactly one place: the trailer mini-list on the Page tab.

### 13.3 Teacher root screens

| File | Lines | Behaviour |
|---|---|---|
| `TeacherAuthScreen.js` | 235 | `signIn()` via `useUser`, **no direct Supabase**. One of only two screens with a *working* bn/en pill toggle. Links to signup. **No password-reset path.** |
| `TeacherSignupScreen.js` | 348 | No direct Supabase; calls `signUpTeacher()` and forces `nickname = name`. Validates all fields and an ≥8-character password. On `needsEmailConfirmation` it navigates to `PendingApproval`. The on-screen note states that owners must approve before content creation. |
| `PendingApprovalScreen.js` | 124 | No DB. "Check Status" calls `refreshProfile()`; Sign Out calls `signOut()`. Carries a prototype "Skip approval" button that is **inert by design** — it only raises an alert and grants nothing, and the code says so. English-only; a language pass is outstanding. |
| `RejectedApprovalScreen.js` | 99 | No DB. "Contact Support" opens a `mailto:support@sohojpathshala.com` link via `expo-linking`; plus Sign Out. |
| `TeacherSubjectDetailScreen.js` | 169 | **Direct writes — no staging.** Reads/updates/deletes `subjects` and `chapters`; deleting a subject cascades `cq_videos` (by `chapter_id`) → `chapters` → `subjects` after a confirmation. Reorder writes `order_index` per row. Takes an `onChanged` callback so the parent overview refreshes rather than relying on a stale staged snapshot. Minimal styling, English-only, with a `TODO(copy)` marker on the reorder menu. |
| `TeacherChapterDetailScreen.js` | 118 | The chapter-level counterpart — direct-write rename/reorder/delete, same no-staging model. |
| `TeacherFreeVideosScreen.js` | 316 | Reads `free_videos` for a class level resolved by `getClassLevelId(level)`, with an SSC/HSC toggle and `order_index` ordering. **Read-only:** per-row Edit and Add both raise placeholder alerts, and per-row view counts are omitted because no backing column exists. |
| `TeacherStudentDetailScreen.js` | 227 | **Fully read-only and contains no Supabase at all** — every field comes from `route.params.student`. Renders phone, enrolled course, date, guardian, and payment status. |
| `TeacherReportScreen.js` | 427 | Real aggregates, no demo numbers. Calls `get_course_students` and `get_course_video_stats` per in-scope course, and reads `courses`, `course_instructors`, confirmed `course_purchases`, `subjects`, `chapters`, `cq_videos`, `mcq_extra_videos`. Student count dedupes by `phone || name` across courses; video count is CQ + MCQ; most- and least-watched are the top 3 and reversed bottom 3 of `view_count`. **Revenue cards are owner-only — teachers get no payment data at all.** Every sub-query is independently try/caught so one failing course doesn't lose the report. |
| `OwnerApprovalsScreen.js` | 318 | The approval workflow. Reads `profiles` where `role = 'teacher'` and `teacher_approval_status = 'pending'`, ordered `created_at` asc. `decide(row, approve)` updates the status: Approve leaves the row visible with a green chip via an `approvedIds` set; Reject filters it out. **A comment flags that `profiles` UPDATE is documented as own-row-only, so an owner's UPDATE may be RLS-blocked and needs a human SQL fix.** Email is deliberately omitted — it lives in `auth.users`, not `profiles`. |
| `OwnerAnnouncementsScreen.js` | 390 | Inserts into `announcements` (`sender_id`, `target_type`, `target_course_id`, `target_class_level_id`, `message`); a **`fanout_announcement` database trigger** does the fan-out server-side. Six UI targets resolve to rows through `resolveTarget()`: `free`/`all` null both id columns; `level-ssc`/`level-hsc` use `getClassLevelId()` → `class_level`; `course-ssc`/`course-hsc` look up courses by `class_level_id` → `course`. `estimateRecipients` reads `profiles` (students, optionally class-filtered) and `course_purchases`, and for the `free` target computes students minus confirmed buyers. **Estimate failures never block the send.** |

### 13.4 `tabs/` — the five tab roots

| File | Lines | Behaviour |
|---|---|---|
| `TeacherDashboardScreen.js` | 479 | Role-aware home. **Owner path:** reads `courses` where `is_published = false` (all drafts) and counts pending `course_purchases` for a real badge. **Teacher path:** reads own `course_instructors`, then `courses` filtered `.in(ids).eq('is_published', false)` — no pending count. Owner gets four shortcut tiles, teacher three. Tiles navigate either to a tab (`navigation.navigate(tab)`) or across into one (`navigate(tab, {screen})`). Draft "continue editing" jumps to `Courses → CourseEditor`. Enrollment badges and draft progress bars are deliberately omitted because there is no real metric behind them. |
| `TeacherCoursesScreen.js` | 396 | Reads `courses` (`title`, `price`, `is_published`), `subjects` (ordered, grouped client-side by course), and `course_instructors` for teachers / all ids for owners. `chipFor`/`ctaFor` implement the listed-vs-owner matrix: a listed teacher sees "Not listed · view only" but still gets an "Edit course" CTA when listed; an owner editing an unlisted course gets "Owner override" labelling. Enrolled counts are omitted as not teacher-readable under RLS. |
| `TeacherStudentsScreen.js` | 303 | Calls `get_course_students(p_course_id)` per course, each wrapped in try/catch so one failing course doesn't drop the whole roster. Scope: owner → all `courses`; teacher → `course_instructors` with embedded `courses(id, title)`. `paid` is derived from `status === 'confirmed' || 'paid' || purchase_status === 'confirmed'`. The search box is **visual-only and says so in its own helper text.** Navigates to `StudentDetail` with the entire row. |
| `TeacherPaymentsScreen.js` | 124 | A pure dispatcher: `isOwner` → render `TeacherPaymentsOwner`; otherwise a static "Payments are handled by the Owner" card. No DB access. |
| `TeacherPaymentsOwner.js` | 614 | **The payment review workflow.** Reads `course_purchases` joined to `courses(title)` and the `payment_settings` singleton (`.eq('id', 1).single()`). Three mutations: `handleConfirm` sets `status = 'confirmed'`; `handleRejectSend` sets `status = 'rejected'` plus a `rejection_reason` from a modal text field (blank becomes `null`); `handleSaveNumbers` updates the three `payment_settings` fields, converting a blank video URL to `null`. Pending and all-rows views derive from **one** query (`status === 'pending'` filtered client-side), so the two lists can never disagree after an action. An `actingTrx` gates per-row loading. The pending card leads with the **course title** because the prototype's payer-name line has no column behind it. |
| `TeacherMoreScreen.js` | 450 | Reads `courses` (owner: all titles) or `course_instructors` with embedded `courses(title)` (teacher). `handleSave` calls `updateProfile({name, bio})`. Owner additionally sees Approvals, Announcements, and Payment settings rows; everyone sees Report and Free Videos. The sign-out row is an addition beyond both prototypes (noted in code) and routes through `askSignOut`. |

---

## 14. Supabase schema surface

Everything the app touches, consolidated. **The agent has no database access** — the human
runs all SQL by hand in the Supabase SQL editor and pastes results back, and the live DB is
authoritative over the schema reference document.

**Schema scale** (per `STATUS.md`, verified 2026-09-23): **24 tables, 17 functions, 5 triggers,
RLS everywhere.**

### Tables

| Table | Read | Written |
|---|---|---|
| `profiles` | ✅ everywhere (identity, role, approval status, class level, avatar preset, push token) | ✅ `updateProfile`, owner approval decisions |
| `class_levels` | ✅ via `lib/classLevel.js` only | — |
| `courses` | ✅ | ✅ (editor: price, description, what_you_get, trailer_urls) |
| `subjects` | ✅ | ✅ (editor + detail screens, including delete) |
| `chapters` | ✅ | ✅ (editor + detail screens, including cascade delete) |
| `cq_videos` | ✅ | ✅ (editor) |
| `cq_video_views` | ✅ | ✅ **the only write is the watch upsert** |
| `mcq_extra_videos` | ✅ (counted toward `videoCount`) | — |
| `mcq_decks`, `mcq_deck_questions` | ✅ (defensively, `select('*')`) | — |
| `mcq_deck_attempts` | ✅ | ❌ written only by RPC |
| `quizzes`, `quiz_questions` | ✅ | — |
| `quiz_submissions` | ✅ | ❌ written only by RPC |
| `free_videos` | ✅ | ❌ (teacher UI is read-only) |
| `course_purchases` | ✅ | ✅ **insert (student), status update (owner)** |
| `payment_settings` | ✅ (singleton, `.eq('id', 1)`) | ✅ (owner: numbers + how-to URL) |
| `course_faqs` | ✅ | ✅ (editor) |
| `course_instructors` | ✅ (the `listed` check) | ✅ (editor diff) |
| `notifications` | ✅ | ✅ (`read_at`) |
| `announcements` | — | ✅ (owner insert; fan-out is a DB trigger) |

### RPCs (all Postgres functions; parameter names are load-bearing)

`is_purchased(p_course_id)` · `get_course_students(p_course_id)` ·
`get_course_video_stats(p_course_id)` · `get_quiz_questions(p_quiz_id)` ·
`submit_quiz(p_quiz_id, p_answers)` · `get_quiz_review(p_quiz_id)` ·
`get_mcq_deck_questions(p_deck_id)` · `submit_mcq_deck_attempt(p_deck_id, p_answers)` ·
`get_mcq_deck_review(p_deck_id)`

Two hard-won notes from `STATUS.md`:
- `is_purchased`, `get_course_students` and `get_course_video_stats` were initially called with
  `course_id` when the functions take **`p_course_id`** — four call sites were wrong and were fixed.
- `submit_*` had a `record->>` jsonb bug, fixed by the human in SQL.

**Triggers:** 5 total. Two are named in the code/docs: the signup trigger that assigns `role`
and `teacher_approval_status` from user metadata, and **`fanout_announcement`**, which expands
one announcement row into per-student notifications server-side. A `payment_settings.touch`
trigger maintains `updated_at`.

**RLS history:** nine policies originally recursed and were rewritten using
**`SECURITY DEFINER` helper functions** to break the cycle. Owner approve/reject was proved
working from the app.

---

## 15. Build, run, environment

### Environment variables

```
EXPO_PUBLIC_SUPABASE_URL      → the project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY → the anon/public JWT (never a service_role key)
APP_TARGET                    → 'student' | 'teacher'  (build-time target)
EXPO_PUBLIC_APP_TARGET        → the runtime fallback RootNavigator reads
```

`.env.example` is the template; `.env` holds the real values and **is** gitignored. Only the
anon key is present — no privileged key is in the repo.

### Scripts

```bash
npm start          # expo start (Metro)
npm run android    # expo run:android  → requires a native dev build
npm run ios
npm run web
```

### EAS profiles

| Profile | Type | Target |
|---|---|---|
| `development-student` / `development-teacher` | dev client, internal distribution | student / teacher |
| `preview-student` / `preview-teacher` | internal release | student / teacher |
| `production-student` / `production-teacher` | `autoIncrement: true` | student / teacher |

### Verified build environment (from `STATUS.md`)

- `JAVA_HOME=C:\Java\jdk-17` — **Temurin 17.0.12, with no `+` characters or spaces in the
  path, or Gradle fails to parse it.**
- `ANDROID_HOME` set; `platform-tools` on `PATH`; `adb` sees a physical device.
- First Android build ~25 minutes (NDK/SDK downloads); incremental 2–5 minutes.
- JS-only changes need just a `r` reload; native/config changes need a full rebuild.
- Metro runs on **:8081 for student, :8082 for teacher**.
- Testing is on a **physical Android phone** (Expo Go for JS-only checks, dev build for native work).

---

## 16. Conventions and working rules

These are the project's own standing rules, from `STATUS.md` and `learn.md`. They are not
optional.

**Architecture**
- **One screen or slice at a time**, built against the HTML prototypes. Never batch many UI
  screens — the one time a 22-screen teacher batch was attempted, the brief was wrong about both
  the API shape and the existing code.
- **Never touch teacher code while working student code, or vice versa.**
- **Never wire a fake backend as real.** Real queries, honest empty and error states.
- **Never invent Bangla copy** — take strings from the prototypes first. Genuinely new screens
  use provisional Bangla that is clearly flagged TODO in code *and* in `STATUS.md`.
- **Never use React Native's `Alert.alert`** — always `useAlert()` from `CustomAlert`, which
  supports button arrays. Every user-facing alert must be bilingual.
- **Never hardcode a UUID.** Look it up (see `lib/classLevel.js`).
- **Never use keyboard characters as icons** (`>`, `v`, `E`, ASCII chevrons) — Hind Siliguri
  may lack the glyphs. Use `react-native-svg`.
- **Never nest a FlatList or DraggableFlatList inside a ScrollView.** The inner virtualized
  list captures the gesture and the parent never scrolls.
- `theme.js` gets flat colour tokens only.
- **No direct database access.** Write SQL for the human; verify from results they paste back.

**Verification**
- **Validate JSX with Babel, never `node --check`.** `node --check` does not parse JSX the way
  Metro/babel does, and gave false confidence on a dropped `)}` that produced a redbox.
  The gate is:
  ```bash
  node -e "require('@babel/core').transformFileSync('FILE.js',{presets:[require('babel-preset-expo')]})"
  ```
  Treat `PARSE OK` as passing. Run it after **every structural edit**.
- **One change at a time: edit → parse-check → human reloads → observe.** Never stack three
  structural edits between reloads.
- After each fix session, **append the outcome to `learn.md`** (worked / didn't).

**Bilingual pattern** (used uniformly across the codebase):
```js
const [lang] = useState('bn');
const isBn = lang === 'bn';
// … isBn ? 'বাংলা' : 'English'
```

---

## 17. Temporary / deferred work

Explicitly temporary, do **not** "fix" unless asked:

- **OTP/email is bypassed.** There is no domain yet, so onboarding steps 1–2 short-circuit.
  Reverting means deleting the `TEMP DEV BYPASS` blocks in `AccountStepScreen` +
  `OtpStepScreen` and retesting steps 1–8. `OtpStepScreen.handleResend` is already back on
  the real path.
- **The Dashboard "Preview (dev)" card** — delete after the revert.
- **`google-services.json` in the repo root** — must stay out of git.
- **Payments are manual TrxID only** — no bKash/Nagad API. A human decision.
- **Avatars are 4 colour presets** — real uploads deferred until the user base grows.
- **Course trailers are YouTube link arrays** — no file storage.
- **Seed videos and quizzes use placeholder YouTube URLs** (`dQw4w9WgXcQ` etc.).
- **Placeholder legal copy** — both `TermsStepScreen` and `LegalScreen` are self-flagged.
- **Legal finals** (real ToS/Privacy) are not written.
- **No password-reset path** on the teacher auth screen.
- **No watch-duration tracking** — reports show counts, because hours would be fabricated.
- **No MCQ deck/quiz CRUD for teachers**; no trailer preview; subject/chapter delete exists only
  in the detail screens, deliberately not in the editor.
- **No owner analytics dashboard.**

---

## 18. Known drift: doc vs code

Places where the project's own documentation has fallen behind the source. Recorded here so a
future reader isn't misled:

1. **`STATUS.md` §6 ("content tab won't scroll") is stale.** It lists the scroll bug as an
   unresolved top-priority blocker. `learn.md` entries #6 and #7 (2026-10-01, later the same
   day) record that the bug was **worked around** by dropping the drag list: the Content tab
   now uses plain `.map()` rows with a long-press reorder menu, which renders reliably. The
   real root cause of the blank `DraggableFlatList` was never isolated.
2. **`TeacherCourseEditorScreen`'s docblock overstates its own features.** Lines 73–92 claim
   "real Add Subject / Add Chapter / Add Video flows", per-chapter drag-reorder, and "both tabs
   stay mounted". The code has **Add Subject only**; `handleAddChapter`, `handleSaveVideo` and
   `openVideoEditor` are defined but have **zero JSX call sites**; there is no drag-reorder on
   the Content tab; and tabs are conditionally rendered by a ternary rather than co-mounted.
   A leftover debug string (`subjects:0 locked:{yes/no}`) is still rendered as empty-state text.
3. **`TeacherCoursesScreen`'s docstring** says Edit goes to a placeholder; line 227 actually
   navigates to `CourseEditor`.
4. **`.gitignore` ignores `/android`**, yet the Android project is committed. The ignore
   entry is currently ineffective for tracked files, so `google-services.json`,
   `debug.keystore` and the whole `android/app/.cxx` build cache (several MB) are all sitting
   in the tree. Worth a deliberate decision.
5. **`android/app/build.gradle` signs release builds with the debug keystore** — explicitly
   flagged in-file as not production-ready.
6. **`android/.../colors.xml`** carries the stock template `colorPrimary #023c69`, which
   contradicts the brand `#C2703D`. It is unused by the app's UI but is a trap for anyone
   editing native theming.
7. **`NotificationsService`'s header comment is outdated** — it says no `projectId` exists in
   `eas.json`, but one is now set (`2ce5b0cd-4cc4-47e8-a2ee-073000e4a050`) in both
   `eas.json`'s builds and `app.config.js`'s `extra.eas`.
8. **`app.config.js` defaults `APP_TARGET` to `'teacher'`** while `RootNavigator` defaults to
   `'student'` — an unset env var yields a mismatched identity/UI pair.

---

## 19. Dead code & duplication

**Dead / unwired:**

- `screens/student/StudentAuthScreen.js` — not imported anywhere, not registered in any navigator.
- In `TeacherCourseEditorScreen.js`: `handleAddChapter`, `handleSaveVideo`, `openVideoEditor`,
  `cancelVideoForm`, `applyFlatOrder`, `dragRef`, `handleDeleteVideo`, `handleRenameSubject`,
  `handleRenameChapter` — all defined, no call sites.
- `OnboardingContext`'s `schoolName` field — declared, never read or written by any screen.

**Duplicated (candidates for the single-source-of-truth treatment already applied to
`subjectIcons` and `classLevel`):**

- `isNoSessionError` is reimplemented in `course/gate.js`, `tabs/MoreScreen.js`,
  `explore/PayTrxIDScreen.js`, `onboarding/PhotoStepScreen.js` and
  `onboarding/ClassStepScreen.js`, plus inline string matching in `NameStepScreen` and
  `PasswordStepScreen`. A TODO in `ClassStepScreen` notes the inconsistency.
- `LEVEL_SUBJECTS` / `SUBJECT_NAMES` / `subjectKeyForName` are duplicated between
  `tabs/ReportScreen.js` and `report/ReportDetailScreen.js`.
- Nested-select-fallback logic appears four times (`ReportScreen`, `ReportDetailScreen` twice).
- The YouTube URL parser `youtubeIdFromUrl` exists in both `CQWatchScreen` and
  `TeacherCourseEditorScreen`.
- Several components hardcode hex colours instead of using `theme.js` tokens.

**Inconsistent save models (worth knowing before you touch either screen):**
`TeacherCourseEditorScreen` stages everything and flushes in one ordered multi-phase write
with a snapshot diff and an exit guard. `TeacherSubjectDetailScreen` and
`TeacherChapterDetailScreen` write **immediately per action** — no staging, no dirty
tracking, no exit guard. The same conceptual operations (rename, reorder, delete) therefore
behave completely differently depending on which screen you are on.

---

## Appendix: where to start reading

| If you want to understand… | Read, in order |
|---|---|
| How the app boots and decides which app to show | `index.js` → `App.js` → `app.config.js` → `navigation/RootNavigator.js` |
| The student experience end to end | `navigation/student/StudentRootNavigator.js` → `StudentApp.js` → `tabs/DashboardScreen.js` → `course/gate.js` → `course/CourseHomeScreen.js` |
| The payment flow (both sides) | `explore/PayIntroScreen.js` → `PayTrxIDScreen.js` → `PayPendingScreen.js` → `tabs/TeacherPaymentsOwner.js` |
| The quiz engine | `course/MCQDeckPlayerScreen.js` (the RPC call/review matrix) |
| The hardest file in the repo | `screens/teacher/TeacherCourseEditorScreen.js`, preceded by **`STATUS.md` §5 and all of `learn.md`** |
| What changed and why | `learn.md` (mistakes), `STATUS.md` (state), `CODE_AUDIT.md` (student audit) |
| The visual system | `theme/theme.js` → `components/Button.js` → the HTML prototypes in `../Sohoj Pathshala/Prototypes/` |

**Related directory outside this repo** (per `STATUS.md` §1): design and reference material
lives at `C:\Users\Rifat\Downloads\Sohoj Pathshala\` — `Prototypes/` (the HTML student,
teacher, and owner prototypes, which are the **only** source of truth for Bangla copy and
layout), `Supabase/current-schema-reference.md`, `UI/` design docs, and `Images/` brand assets.