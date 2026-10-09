# Sohoj Pathshala — Build Status (handoff, end of 2026-09-27 session)

## 0. End goal
Two production apps from one Expo codebase: **student app** (Sohoj Pathshala —
onboarding, courses, CQ videos, MCQ/live quizzes, payments via manual TrxID,
reports, free videos) and **teacher/owner app** (Sohoj Shikkhok — course
editing with staged save, students roster, payment review, free videos,
reports, owner approvals/announcements). Backend is Supabase (Postgres +
Auth + RLS). Nothing ships with fake backend logic or placeholder behavior
presented as real.

## 1. File locations (two roots — do not confuse them)
- **App code:** `C:\Users\Rifat\Downloads\Programming\sohoj-pathshala`
  (screens/, navigation/, contexts/, components/, lib/, services/, theme/,
  assets/, app.config.js, STATUS.md, CODE_AUDIT.md)
- **Design + reference:** `C:\Users\Rifat\Downloads\Sohoj Pathshala\`
  (`Prototypes\` = index.html student, teacher.html, owner.html — the ONLY
  source of Bangla copy and layout truth; `Supabase\current-schema-reference.md`
  = schema doc (may lag live DB — live DB wins); `UI\` = system design docs;
  `Images\` = brand assets incl. the app logo/icon)
- Human runs all SQL by hand in Supabase SQL Editor. Agent has zero DB access.
- Human tests on physical Android phone (CPH2869, adb id 95BEUW5LMZZHJVYL).
  Expo Go for JS-only checks; dev build (`npx expo run:android`) when native
  code/config changes. Metro on :8081 (student) / :8082 (teacher).

## 2. Standing rules (every session)
- ONE screen/slice at a time against the prototypes. Never batch UI screens
  (the one time this was tried — 22-screen teacher batch — the brief was
  wrong on API shape and existing code; slices since).
- theme.js: flat color tokens only. Brand: primary #C2703D, bg #FBF7F0.
- Never invent Bangla copy — prototype strings first; genuinely new screens
  use provisional Bangla clearly flagged TODO in code + STATUS.
- Never wire fake backend as real. Real queries, honest empty/error states.
- No direct DB access: write SQL for the human, verify via pasted results.
- `node --check` every touched file. Small fixes = snippet + path.
- Teacher code (`screens/teacher`, `navigation/teacher`, signUpTeacher/PKCE)
  is isolated — never touch it when working student code and vice versa.
- `alert()` = CustomAlert `useAlert` (supports button arrays). Never
  `Alert.alert`. Every user-facing alert must be Bn/En bilingual (auth
  screens got their toggle pass 2026-09-27; new screens follow the
  `isBn ? '...' : '...'` pattern with `const [lang] = useState('bn')`).

## 3. Built and verified (done)
- **Student (30+ screens):** 9-step onboarding (Account/OTP/Password/Name/
  Photo-presets-only/Terms/Class/Reveal+confetti/Location), 4 tabs
  (Dashboard/Explore/Report/More), Explore flow (CourseDetail/PayIntro/
  PayTrxID/PayPending/HowToPay video page), Course flow (CourseHome 2 cards/
  CQList/CQSubject/CQVideos list/CQWatch player/Library+PrevNext/MCQList/
  MCQSubject/MCQDeck player/WeeklyQuiz list+countdown), FreeVideos list +
  FreeWatch player, Report (real data) + ReportDetail (real data),
  PaymentHistory/Legal/Notifications.
- **Teacher (20+ screens):** auth stack (sign-in/signup/pending/rejected),
  5 tabs (Dashboard role-aware/Courses/Students/Payments info-or-owner/
  More), CourseEditor (see §5), FreeVideos, StudentDetail, Report,
  Approvals, Announcements.
- **Schema (live, verified 2026-09-23 + fixes after):** 24 tables,
  17 functions, 5 triggers, RLS everywhere. `profiles` +avatar_preset
  SMALLINT +push_token TEXT (human ran). payment_settings.touch trigger
  (updated_at auto).
- **Shared:** lib/subjectIcons.js, lib/classLevel.js, lib/linking.js
  (deep links both schemes), services/NotificationsService.js (lazy-require
  so Expo Go boots; full push in dev build), components/SignOutButton.js.
- **Nav:** role-aware roots, nested stacks, onboardingComplete flag guard
  (order flag → !session → profile), keyed OnboardingStack branches
  (remount on branch switch), Otp back falls back to Account, signOut
  scope:'local' + always-clears-state.
- **Seed content (live DB):** SSC+HSC Science courses (published), subjects,
  chapters, CQ videos, 2 free videos, 1 open practice deck + 3 questions,
  1 weekly quiz + 2 questions, Yoda confirmed on SSC Science.
- **Test accounts:** Yoda = student (storycat246@gmail.com, has class);
  Adil = owner (mdi256129@gmail.com); সাদমান সাদিক = approved teacher+
  creator (adil.from.tomorrow@gmail.com); Teacher Test = approved teacher.
- **RLS issues found by live probes and FIXED:** recursion in 9 policies
  (rewritten via SECURITY DEFINER helpers); `is_purchased`/`get_course_students`/
  `get_course_video_stats` called with `course_id` but functions take
  `p_course_id` (4 callsites fixed); submit_* `record->>` jsonb bug (SQL fix
  applied by human); owner approve/reject PROVED working via app.
- **Branding:** assets/icon+splash+favicon = terracotta logo;
  android foreground = transparent glyph; splash+adaptive bg #C2703D.
  APP_TARGET currently defaults to `teacher` in app.config.js.
  google-services.json wired + EAS projectId set (2ce5b0cd-...).
- **Build env (works):** JAVA_HOME=C:\Java\jdk-17 (Temurin 17.0.12, NO plus
  signs/spaces in path — Gradle chokes on `+`), ANDROID_HOME set,
  platform-tools in PATH, adb sees phone. First build ~25min (NDK/SDK
  downloads); incremental 2-5min. JS-only changes = press `r`.
- CODE_AUDIT.md has the 2026-09-23 batch-fix pass (re-verify after big edits).

## 4. TEMPORARY / DEFERRED (do not "fix" unasked)
- OTP/email BYPASSED (no domain yet). Revert = delete TEMP DEV BYPASS
  blocks (AccountStepScreen + OtpStepScreen), retest Steps 1-8.
- Dashboard "Preview (dev)" card (delete post-revert).
- google-services.json in repo root — MUST stay out of git (add to
  .gitignore before any commit).
- Payment flow is MANUAL TrxID only (no bKash/Nagad API — human decision).
- Avatars = 4 color presets (real uploads deferred until growth).
- Trailer = YouTube links array (no storage upload).
- Seed videos/quizzes use placeholder YouTube URLs (dQw4w9WgXcQ etc.).

## 5. Teacher CourseEditor — staged-save architecture (read before touching)
`TeacherCourseEditorScreen.js` (~1900 lines) is the most complex file:
- ALL edits stage locally (page fields, trailers, instructors diff, new
  FAQs, new/renamed subjects-chapters-videos, video deletes/reorders).
  NOTHING writes until header Save.
- Dirty = JSON compare of working state vs load snapshot (positions for
  order, urls+descs included). Header Save gray clean / orange dirty.
- Back (header + system via beforeRemove) with dirty → Save / Discard /
  Draft(stay) alert. exitingRef/dirtyRef pattern guards double-fire.
- Save flush order: subjects → chapters → videos → order upserts (UPDATE-
  only, NEVER upsert — upsert's INSERT branch fires partial rows and trips
  NOT NULL/RLS) → deletes → page fields → instructors diff → FAQs → reload.
- Content tab = ONE flat DraggableFlatList (subjects/chapters/videos/
  forms as rows, hierarchy by indentation + derivation back to tree state
  on drop). Trailer list is a second flat list on Page tab.
- Requires: react-native-draggable-flatlist + gesture-handler + reanimated
  4 + worklets plugin in babel.config.js + GestureHandlerRootView in App.js
  + babel-preset-expo installed. Dev builds need rebuild for native libs;
  Expo Go runs them from its runtime.

## 6. RESOLVED (2026-10-01, completed 2026-10-07) — content tab scroll
- **Do not re-attempt drag-and-drop reorder.** `react-native-draggable-flatlist`
  renders BLANK under Expo Go in every arrangement tried (nested in a ScrollView,
  then as sole scroller with no wrapper). Root cause never isolated — see learn.md
  #1, #2, #3, #6. This is a dead end, not an open bug.
- Fix shipped: the Content tab is a plain `GestureScrollView` of `.map()` rows with
  a long-press reorder menu (openMoveMenu → moveSubject). It scrolls.
- The Page tab's trailer list was the last holdout. On 2026-10-07 it was migrated
  to the same `.map()` + long-press pattern (openTrailerMoveMenu → moveTrailer),
  and the dependency was removed from package.json — the library is no longer
  imported anywhere in the app.
- Reordering everywhere = long-press → Move up / Move down. Staged until Save.
- If drag is ever wanted again: prove it renders in a DEV BUILD on a minimal repro
  screen first. Never in Expo Go.

## 7. NOT DONE (attack in this order unless human redirects)
1. **Fix §6 scroll** (blocks all teacher content work).
2. Domain + email delivery (founder, 2-3 days) → OTP-bypass revert OR
   magic-link redesign (4 agent attempts declined — read their reasoning in
   chat history before re-proposing; password/name live at Steps 3-4).
3. Push end-to-end: upload FCM **legacy server key** (Firebase Console →
   Project Settings → Cloud Messaging → Server key `AAAA…`, NOT the service
   account JSON) at expo.dev → project → Settings → Notifications →
   rebuild → reinstall → login → token in profiles.push_token → test send.
4. Deep-link device tests (`sohojpathshala://course/<id>`, verified route).
5. Remaining live probes: mcq columns/RLS now exercised via play/submit
   (confirm clean), `is_purchased` proof (Yoda gate passes — done informally).
6. Course content authoring gaps: MCQ deck/quiz CRUD (teacher), trailer
   preview, subject/chapter delete (deliberately absent — confirm if wanted).
7. Owner analytics dashboard. Legal finals (real ToS/Privacy). Final Bangla
   alert copy pass. Production EAS build + store. C: drive cleanup (~10GB).

## 8. Decisions pending (human, later)
- OTP revert vs magic-link redesign (after domain).
- Real avatar uploads (later, when grown).
- Payment API automation (manual now).
- Subject/chapter delete UI (absent by design so far).
- Watch-duration tracking (Report shows counts; hours would be fake).

## Immediate next task
See `SHIP_PLAN.md` (2026-10-07) for the current shipping order. It supersedes §7.

## 7b. VERIFIED AGAINST CODE 2026-10-07 (corrections to §7 above)
- §7.1 (fix §6 scroll): **DONE** — see §6.
- §7.6 "subject/chapter delete (deliberately absent)": **now present** —
  TeacherSubjectDetailScreen deletes a subject with a manual cascade
  (cq_videos → chapters → subjects). Confirmed in code.
- CourseEditor has **no reachable UI to add a chapter or add a video.**
  `handleAddChapter`, `handleSaveVideo`, `openVideoEditor` and friends are
  defined but never called; the only cq_videos INSERT is in handleSaveAll,
  fed solely by that dead code. Only "Add Subject" is wired. The file's own
  docblock (lines 73–92) overstates this — corrected separately.
- Logged-out behaviour: an anon Supabase client gets `200 []` on all 21
  tables (RLS), so a session-less app shows empty screens, not errors.
  Sign-in by password works with no domain; only NEW signup is blocked.
- `react-native-draggable-flatlist` removed from package.json (unused).
