# plan.md

Forward-looking only. **Nothing here is already done** — if an item is finished, delete the
line rather than ticking it. Completed work belongs in git history and `learn.md`
(mistakes only), never here.

Last updated: 2026-10-09.

---

## 1. Ship the APK for the founder

The single most urgent item.

- [ ] Fix release signing. Builds currently use the **debug keystore**. Generate a real
      upload keystore, put the credentials in EAS secrets, never in the repo.
- [ ] Production EAS build for both targets (student + teacher).
- [ ] Produce installable APKs and hand them over.
- [ ] Confirm the deep-link redirect works in a **release** build. `Linking.createURL('confirm')`
      returns the dev-server URL in Expo Go but the app scheme (`sohojpathshala://confirm`)
      in EAS — this has never been verified outside dev.
- [ ] Resolve the `.gitignore` contradiction: `google-services.json` is ignored, but a real
      Firebase/FCM build will need that file present in the tree. Decide ignore-and-restore
      vs. a committed template.

## 2. Verify the access tightening before real users arrive

The RLS policies below are **live but untested with a real paid-student session**. If any
policy is subtly wrong, paying students see empty screens. This is the highest-risk
unverified thing in the codebase.

- [ ] Sign in as `storycat246@gmail.com` (confirmed purchase on SSC Science) and confirm
      videos, MCQ decks and notes all still load.
- [ ] Sign in as `adil.from.tomorrow@gmail.com` (no purchases) and confirm they now get
      nothing instead of the whole catalogue.
- [ ] Confirm a teacher listed as co-instructor can still edit content normally.

## 3. Content and publishing

- [ ] Publish **SSC Science** and **HSC Science**. Both are still `is_published = false`,
      which is why Explore shows almost nothing. SSC Science has 2 confirmed purchases
      against an unpublished course, so nobody can actually reach what they paid for.
- [ ] Replace placeholder seed YouTube URLs (`dQw4w9WgXcQ`) with real lessons.
- [ ] Decide what a course looks like with no price set, and what a free course looks like.

## 4. Course quizzes (permanent course content)

Only **weekly quizzes** were built. Course-scoped, permanent quizzes do not exist yet.

- [ ] Teacher UI for a quiz attached to a subject (`quizzes.subject_id` already exists and
      is already nullable, so no migration is needed — this is UI).
- [ ] Course quizzes must stay visible indefinitely, unlike weekly quizzes. They should not
      use `opens_at`/`closes_at`/`hides_at` at all.

## 5. Weekly quiz gaps

Authoring and publishing work. These parts are not built.

- [ ] Student side: **countdown on the quiz card**.
- [ ] Student side: **cannot leave the quiz until they submit** — no back-navigation mid-quiz.
- [ ] Teacher-configurable "how long it stays visible after it closes". `hides_at` is already a
      real column and the app hardcodes `closes_at + 1 day`, so this is UI only — no migration.
- [ ] **Make weekly quizzes premium.** They are currently open to every student by decision.
      Gate on a confirmed purchase when that decision is reversed.
- [ ] Reminder notifications for an open quiz (`enqueue_quiz_reminders` exists; never wired).

## 6. MCQ decks

- [ ] Wire `mcq_decks.minutes_per_question` into the teacher editor. The column exists and no
      UI reads or writes it.
- [ ] Per-question timer on the student deck player, with a correct fix when time expires.

## 7. Notes → real PDF library

Notes are currently a title + Google Drive link that opens Drive and leaves the app. No file
is stored by us.

- [ ] Open the PDF **inside** the app instead of handing off to Drive.
- [ ] Download a note and read it offline.
- [ ] A notes **library** screen per course, independent of any single video.
- [ ] Reconsider storage when affordable — a private bucket with signed URLs, so a leaked URL
      cannot be un-leaked. Today a Drive link is permanently public once shared.

## 8. Native video player

The embedded YouTube iframe loads a web page before any video appears, which is most of the
black-screen delay. `playerVars` (`hq=1`) helps first frames only.

- [ ] Replace `react-native-youtube-iframe` with a native player. Applies to
      `CQWatchScreen`, `FreeWatchScreen`, `CourseDetailScreen`, `HowToPayScreen`, and the
      trailer rail in `CourseDetailScreen`.

## 9. Rename the misnamed "CQ" screens

`CQListScreen` / `CQSubjectScreen` / `CQVideosScreen` / `CQWatchScreen` are **not** CQ
practice — they read `cq_videos` and are the student's entire video player. `mcq_extra_videos`
is gone, so the name now refers to nothing. Deferred deliberately: renaming touches four
screens, four routes and `screens/student/course/index.js`.

- [ ] Rename the files, routes and exports to video-oriented names.
- [ ] Relabel the `CourseHomeScreen` **"CQ practice"** card. It currently promises
      "step-by-step video solutions", which is not what it does.
- [ ] Fix `check-exports` (my tooling) to match `export async function`, otherwise it
      reports false positives and its output cannot be trusted.

## 10. Security follow-ups

- [ ] `courses` UPDATE is still `is_course_instructor(id) OR is_owner()`, so a listed
      co-instructor can publish/unpublish by calling the API directly even though the button
      is hidden. Left as-is by decision. Tightening it fully would also lock co-instructors
      out of editing prices and content, so it needs a real policy decision first.
- [ ] `free_videos` has no per-teacher ownership: any approved teacher can edit any free video.
      Add `created_by` on insert and filter by it if that matters.
- [ ] Audit every remaining table for `USING (true)` SELECT policies. Two were found and
      fixed (`cq_videos`, `mcq_deck_questions`); the rest have not been swept.

## 11. Legal copy

- [ ] Real ToS / Privacy text. `LegalScreen` and `TermsStepScreen` are placeholders awaiting
      your legal input, not written by engineering.

## 12. Signup

- [ ] Wire real email OTP. `AccountStepScreen` returns before `signInWithOtp`, so a fresh
      signup creates **no session at all** and lands in an untestable app. Step 2 also claims
      "we sent you a 6-digit code" when no code is sent — the copy lies until this is built.
- [ ] Decide whether the `TEMP DEV BYPASS` blocks are stripped for the launch build. Keeping
      them means anyone can "sign up" into a session-less, empty app — a poor first run.

## 13. Documentation

- [ ] `STATUS.md` is stale in several places and still describes solved bugs as open. Rewrite
      or delete it; it is actively misleading at this point.
- [ ] `AGENTS.md` records the hard rule that no SQL write runs without explicit approval.
      Keep it.

---

## House rules

1. **No SQL writes without approval.** Write the SQL, show it, state the effect in plain
   language, wait for an explicit yes. Approval covers one statement only. `SELECT` is fine.
   Wrapping a write in `ROLLBACK` still counts as a write.
2. Babel parse gate on every JS/JSX edit; `JSON.parse` for JSON. Parse-clean is not
   import-clean — also confirm each local named import resolves to a real named export.
3. `APP_TARGET` switches student/teacher. Run `npx expo start --clear` after changing it.
4. `SUPABASE_DB_URL` in `.env` must be the **IPv4 pooler (session mode)** string. The direct
   `db.<ref>.supabase.co` host is IPv6-only on this project and fails with `ENOTFOUND`.
5. Query the database before believing any doc. See `learn.md` #10 for what that costs.
