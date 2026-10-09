# Code Audit Report — Student App

Date: 2026-09-23 (batch-fix pass applied same day; re-audit clean).
Scope: `screens/student/**`, `contexts/*`, `lib/subjectIcons.js`,
`lib/classLevel.js`, cross-checked against
`Sohoj Pathshala/Supabase/current-schema-reference.md` and
`Sohoj Pathshala/Prototypes/index.html`. Method: full file reads +
pattern sweeps (all `supabase.from/rpc/auth/storage`, all
`TEMP DEV BYPASS`, all `alert(`, UUID literals, navigation targets).

## Code Audit Report

### Critical (blocks real usage)
- No critical defects found — same verdict as the first pass, now with
  the High items below resolved. No hardcoded UUIDs (re-swept clean).
  Onboarding chain fully linked, flag guard correctly ordered.

### High (breaks UX) — ALL FIXED this pass
- [PayIntroScreen.js] FIXED: load failure now renders an error block
  with retry instead of "৳ 0 / —", and the CTA only renders on success.
  Verified: `loadError` + `retryKey` states, `node --check` clean.
- [CourseHomeScreen.js] FIXED: `checkingTarget` state disables cards
  and swaps the tapped card's icon for an inline spinner during the
  `is_purchased` RPC; re-enabled in `finally`. Verified clean.
- [ReportDetailScreen.js] FIXED: `quiz_submissions` probe failure sets
  `quizUnknown` — cards show "—" plus a "Quiz data unavailable /
  কুইজ তথ্য পাওয়া যায়নি।" note (provisional Bangla, TODO-marked)
  instead of misleading zeros. Column verification itself still needs
  a live-table check (carried as Medium below).
- [MCQListScreen.js / MCQSubjectScreen.js] FIXED: the silent
  `if (!res.error)` swallow is gone — probe errors throw, set
  `deckBlocked`, warn, and render an "MCQ access restricted" banner
  (provisional Bangla, TODO-marked) instead of the list. Whether RLS
  actually blocks students still needs a live probe (carried below).
- [OtpStepScreen.js resend] CONFIRMED (no change needed): resend stays
  on the real path with a comment marking it dead-by-SMTP-state until
  the Resend revert — honest failure alerts, nothing fake.

### Medium (tech debt)
- FIXED: `lib/subjectIcons.js` (`SubjectIcon`, `iconForSubjectKey`,
  `iconForSubjectName`, `toBn`, `MONTHS`, `DAYL`) replaces all local
  copies in CQList/CQSubject/CQVideos/MCQList/MCQSubject/ReportDetail/
  CourseHome/CourseDetail/Explore/PayIntro/Report/PaymentHistory/
  Notifications/Reveal. Re-sweep confirms zero leftover copies.
  (MoreScreen was over-listed in the fix brief — it never had these
  helpers; nothing to replace there. `OnboardingStepShell.toBnDigit`
  is a separate pre-existing step-number helper, left alone.)
- FIXED: `lib/classLevel.js` (`getClassLevelId`, `getClassLevelName`)
  replaces inline lookups in Report/ReportDetail/More/ClassStep.
  Behavior note: ClassStep now stores the tapped key as
  `classLevelName` (schema-guaranteed equal to row.name) instead of
  echoing `row.name` — equivalent, documented in STATUS.md.
- [PaymentHistoryScreen.js:statusLabel] DECISION NEEDED (kept for now):
  `বাতিল`/`Rejected` kept with an inventor-flag comment — a rejected
  row must show something truthful. Confirm or supply alternate copy.
- [ClassStepScreen.js] TODO added: unify Steps 3–5 on the
  session-presence gate pattern post-revert (they currently match on
  error-message strings; both correct today).
- CARRIED (need live backend, not code): `quiz_submissions` /
  `mcq_deck_attempts` column verification; `mcq_decks` columns + student
  SELECT RLS probe; `avatars` bucket existence/policy; `is_purchased`
  RPC arg-name proof on first real call.
- CARRIED (known-tracked): provisional Bangla alert bodies (now also
  covering the new unknown/banner notes, all TODO-marked); bypass
  removal list; preset-avatar persistence decision; photo/legal finals.
- [DashboardScreen.js Continue / ExploreScreen / PaymentHistoryScreen /
  NotificationsScreen] Load failures hide sections or render empty
  lists with warns only. Accepted (matches prototype hidden/empty
  defaults); revisit if user testing confuses empty with broken.

### Low (cleanup) — ALL DONE this pass
- [DashboardScreen.js] Unused `ActivityIndicator` import removed.
- [MCQListScreen.js] Dead `scoped` property removed.
- [LocationStepScreen.js] All 6 `[LocationStep]` debug logs removed.
- [StudentRootNavigator.js] `[RootNav]` guard log removed.
- [DashboardScreen.js] Bypass preview block carries a post-revert
  TODO (kept until revert, by design).
- [ReportDetailScreen.js] Videos-watched footnote carries a keep/drop
  review TODO.
- [OtpStepScreen.js] Bypass `return` position documented as
  intentional (do-not-"fix" note).
- [STATUS.md] Stale "Photo is the terminal screen" line corrected;
  classLevelName shape paragraph updated to the helper behavior.

### Verified clean (no action)
- Auth flow matches the chosen pattern everywhere: `signInWithOtp`
  (with `data.phone` + `shouldCreateUser`) → `verifyOtp` (type
  `email`) → `updateUser({password})`; teacher `signUp`+PKCE untouched.
- `updateProfile` payloads (`name`/`nickname`/`class_level_id`/
  `avatar_url`) all match verified `profiles` columns; `class_level_id`
  always travels as a queried UUID (never the 'SSC' string) —
  bypass stores `null` + separate `classLevelName`.
- `cq_video_views` upsert + `onConflict: 'video_id,student_id'` matches
  the verified unique constraint; `payment_settings` id-1/bkash_number,
  `course_purchases` insert columns, `notifications` read/update
  columns, `course_instructors`→`profiles(name,bio,avatar_url)` join
  all match the ref.
- All bypass blocks have TEMP DEV BYPASS comments, warn on skip, keep
  real-error alert paths blocking, and navigate correctly. No bypass
  swallows real errors.
- No `Alert.alert` (React Native API) usage anywhere — all alerts go
  through the app's `CustomAlert` (`useAlert`), consistent.
- Tab/stack route names referenced by every `navigate()` exist:
  Onboarding* (11), Dashboard/Explore/Report/More tabs, ExploreMain/
  CourseDetail/Pay*, DashboardMain/CourseHome/CQ*/MCQ*, ReportMain/
  ReportDetail, MoreMain/PaymentHistory/Legal/Notifications.
- Re-sweep 2026-09-23: 22/22 modified files `node --check` clean; no
  UUID literals; no debug logs; no leftover icon/toBn copies; all new
  error/empty/loading states present on touched paths.
