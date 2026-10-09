# learn.md — mistakes log (Sohoj Pathshala)

> Read this before touching teacher CourseEditor code. Append every new
> mistake with date. Goal: stop repeating the same failures.

## Instructions for the agent (self-rules)
1. Read this file + `STATUS.md` before editing CourseEditor code.
2. ONE change at a time: edit → parse-check → user reloads → observe.
   Never stack 3 structural edits between reloads (see 2026-10-01 #3).
3. Validate JSX with babel (`babel-preset-expo`), NEVER `node --check`
   (see 2026-10-01 #2).
4. Never use keyboard characters as icons (`>`, `v`, `E`, ASCII chevrons).
   Use `Svg` icons (see 2026-10-01 #4).
5. Never nest a FlatList/DraggableFlatList inside a ScrollView (see #1).
6. After every fix session, append the outcome here (worked / didn't).

## 2026-10-01 — CourseEditor Content tab rebuild

### #1 Nested drag lists killed scroll
- Mistake: 3 nested `DraggableFlatList`s (trailers, chapters, videos)
  inside a parent `GestureScrollView`, later a single flat list with
  `scrollEnabled={false}` still nested inside the ScrollView.
- Why: inner virtualized list captures gestures; parent never scrolls.
  Extra traps: `scrollEnabled={!dragging}` can stick if begin fires
  without end; `display:none` hidden tab keeps both lists mounted.
- Solution that works: the drag list IS the only scroller on its tab
  (top-level `DraggableFlatList` with `flex:1`, NOT nested in any
  ScrollView). Page tab keeps its own separate `ScrollView`. Tabs no
  longer co-mounted — switching remounts (fine at our sizes).

### #2 `node --check` gave false confidence
- Mistake: relied on `node --check` after JSX edits; it passed while
  Metro threw "Adjacent JSX elements" redbox (a dropped `)}` when
  splitting the tabs).
- Why: `node --check` does not parse JSX the way Metro/babel does.
- Solution: verify with
  `node -e "require('@babel/core').transformFileSync(f,{presets:[require('babel-preset-expo')]})"`
  and treat PARSE OK as the gate. Use it after EVERY structural edit.

### #3 Stacked edits hid the real bug (blank list, UNRESOLVED cause)
- Mistake: syntax fix → Notion restyle → debug line → swap, all within
  minutes. Content tab rendered blank (not even `ListEmptyComponent`
  / footer). Root cause never isolated.
- Suspects, ranked: (a) user reloaded a stale bundle between rapid
  edits; (b) list had zero height (flex wrapper chain); (c) Expo Go
  vs dev-build worklets issue; (d) draggable-flatlist v4 quirk.
  Note: (b) is weak — footer always renders if the list has height,
  and header Save proved `!locked`, yet no footer showed.
- Solution: retry library with (i) list directly under flex parent
  (no wrapper View), (ii) debug `ListEmptyComponent` kept
  (`subjects:N locked:yes/no`) so data vs layout is distinguishable
  in ONE reload. Fallback if blank again: plain `.map` + reorder
  buttons (proven to render).

### #4 Keyboard characters as icons
- Mistake: used `>`, `v`, `@@@`/`E` placeholders and text `>` as
  chevrons. Font-dependent (Hind Siliguri may lack glyphs), ugly.
- Solution: `Svg` chevron component (`M9 6l6 6-6 6`), rotate 90deg
  when expanded. Same pattern as existing `BackIcon`.

### #5 Toggle touched screen edges
- Mistake: moved tab toggle out of the padded `ScrollView` into a bare
  flex `View` — toggle went full-bleed, touching phone edges.
- Solution: `tagToggle` gets its own `marginHorizontal:20, marginTop:4`
  (it is the only user of that style).

## Later (user reminders)
- Revisit hold-and-drag reorder when `react-native-draggable-flatlist`
  is verified working in a dev build (blank in Expo Go as of 2026-10-01).
  Current reorder path: long-press menu. Don't reintroduce the lib
  without proving it renders first (minimal repro screen).

## 2026-10-01 (later) — drag retry + Notion-minimal
- Retried `DraggableFlatList` as sole scroller: NO wrapper View between
  flex parent and list, debug `ListEmptyComponent` kept, real `Svg`
  chevrons, metadata removed, hold-anywhere drag via title-row
  `onLongPress`. `↑↓` arrows deleted.
- Pending user reload: rows visible = stale-bundle/wrapper theory
  confirmed; still blank = library/Expo-Go issue, fall back to `.map`.

### #6 DraggableFlatList renders blank in Expo Go (fallback shipped)- Two attempts (nested, then sole-scroller with no wrapper) both
  rendered ZERO output — not even `ListEmptyComponent`/footer.
  `npx expo install --check` shows reanimated/gesture-handler versions
  are correct, so it is NOT a version mismatch. Cause still unknown
  (suspect Expo Go runtime vs worklets, or v4 quirk). Revisit in dev
  build before ever using the lib again.
- Fallback (all 3 screens): plain `.map()` rows in `GestureScrollView`
  (proven to render) + reorder via LONG-PRESS menu (Move up/down,
  staged on overview via existing Save; direct-write in detail
  screens). No visible arrows, Notion-minimal rows kept. Trailer mini
  list on Page tab still uses the lib — replace if trailers go blank.

### #7 Overview is 3-level inline, delete added
- Content tab: subject > chapter (tap expands) > videos (plain text,
  zero navigation). Chapter rows: tap expands videos, small corner
  edit goes to ChapterDetail. Subject corner edit goes to
  SubjectDetail.
- SubjectDetail: red Delete button at bottom (manual cascade
  videos > chapters > subject, confirm first). Detail screens call
  back `route.params.onChanged` so the overview refreshes after
  rename/delete (avoids stale staged snapshot).

## 2026-10-07 — trailer list migration + doc drift

### #8 I appended routine work to THIS file (mistakes log), bloating it
- Mistake: after writing `README.md` I appended a dated session entry to
  learn.md describing work that involved no mistake at all. The file had
  also drifted into carrying "what works" guidance and session narrative.
- Why: AGENTS.md said "after each fix session, append the outcome", and I
  followed it literally. The instruction never distinguished routine work
  from actual mistakes, so I optimised for compliance instead of intent —
  and in doing so diluted the one file whose value is signal-per-line.
- Solution: rewrote AGENTS.md so learn.md is mistakes-only, and every entry
  MUST carry (1) the mistake, (2) why it happened — the real cause, not a
  restatement — and (3) what worked / how it was solved, honestly including
  "did NOT work". Deleted the bogus entry. Worked.

### #9 Ran the Babel gate on package.json and read the error as a real failure
- Mistake: ran `transformFileSync('package.json')` and got
  `SyntaxError: Missing semicolon (2:8)` on `{ "name": ... }`.
- Why: the parse gate was drilled into me for JSX files, and I generalised
  it to "all touched files" without checking the file type. Babel's Flow
  parser was being fed JSON.
- Solution: `JSON.parse(fs.readFileSync(f))` for `.json`.
  Rule now: **Babel gate = JS/JSX only; JSON gets JSON.parse.**
  Cost was only confusion, but it would have read as a broken edit.

## 2026-10-08 — course delete: 6 rounds of guessing before I had DB access

### #10 I "fixed" a root cause I had only read about in a markdown doc
- Mistake: `courses` delete never worked for a teacher. Across ~6 rounds I
  changed the Courses list to `useFocusEffect`, moved `navigate()` out of the
  `try/catch`, added a `course_purchases` guard, added an `announcements`
  cleanup — all speculative — while the actual blocker was a single RLS policy
  the whole time: `courses_delete_owner ... USING (is_owner())`.
- Why: `current-schema-reference.md` was the only source I had, it said
  "DELETE owner-only", and I treated that as verified truth. It was directionally
  right and still not evidence. Every fix I shipped was a guess about a
  *behaviour* (list refresh, navigation, alert copy) when the bug was in a
  *permission* — a layer I never actually observed. Worse, each round the user
  re-tested and reported "still broken", and I kept moving down the stack instead
  of asking "which layer am I actually able to observe?".
- Solution: got direct SQL access and read `pg_policies` in one query; the
  policy name and body were confirmed immediately. Rule now: **for a
  permissions/RLS/"nothing happens" bug, do not ship UI fixes first — read
  `pg_policies` and `pg_constraint`.** A markdown schema reference is a hint,
  not evidence.

### #11 My RLS test harness could not fail, so it "passed" a broken guard
- Mistake: I wrote three RLS tests and reported all three passing. One of them
  was a *negative* guard (a course with purchases must NOT be deletable), and it
  had actually **failed** — a teacher did delete the purchase-protected course.
  I re-ran and got a green result without ever fixing the code, because the
  harness itself was wrong.
- Why: I simulated the user with `perform set_config('role','authenticated',true)`
  inside a `DO` block. That does not reliably drop superuser, and superusers
  bypass RLS — so *every* delete succeeded and the guard could never trip. The
  correct form is a real `SET LOCAL ROLE authenticated`. Compounding it, a second
  test passed *vacuously*: my target-selection subquery had `limit 1` with no
  `ORDER BY`, picked a teacher with zero courses, inserted nothing, and the
  "did it delete?" check saw 0 rows and called that a pass.
- Solution: switched to `SET LOCAL ROLE`, asserted `rolsuper = f` inside the
  test, and added explicit `if v_id is null then raise exception 'HARNESS BROKEN'`
  guards so a missing target fails loudly instead of passing. Re-ran: real
  passes. Rule now: **a test that cannot fail is worse than no test — prove it
  fails by breaking the thing it guards, and make missing fixtures an error.**

### #12 Client-side cascade deleted content before the parent delete was allowed
- Mistake: the delete handler walked `cq_videos → mcq_extra_videos → chapters →
  subjects` over six separate REST calls, *then* tried `DELETE FROM courses`.
  Because the course delete was the thing that failed, the content was already
  destroyed every single time — so a course that "wouldn't delete" came back as
  an empty shell with its subjects/chapters/videos silently gone.
- Why: I wrote the cascade to work around `ON DELETE RESTRICT` FKs, treating the
  database as something that cannot do referential cleanup. All the child tables
  were RLS-visible to the instructor, so every intermediate step "succeeded" and
  gave no signal that the final, actual failure was coming. Multi-request
  cascades have no transaction, so there is no all-or-nothing.
- Solution: moved the cascade into a `BEFORE DELETE` trigger
  (`trg_cascade_delete_course`, `SECURITY DEFINER`) so one statement removes the
  whole subtree atomically, then deleted the client cascade entirely — the app
  now issues a single `DELETE FROM courses`. Verified by building a throwaway
  course with subject+chapter+video+quiz and asserting every child row was gone.
  Rule now: **referential cleanup belongs in the schema, not in the client.**

### #13 `import { Button }` — the Babel parse gate cannot see this class of bug
- Mistake: `TeacherMCQEditorScreen` and `TeacherQuizEditorScreen` both did
  `import { Button } from '../../components/Button'`, but that module only has a
  `default` export. So `Button` was `undefined` and the app crashed on
  "Element type is invalid … got: undefined".
- Why: my gate was `transformFileSync`, which only checks that the file
  *parses*. `import { X }` is syntactically valid whether or not `X` exists, and
  nothing else in my routine looked at whether the binding actually resolved.
  I also assumed "the file exists" implied "the import is right" — the earlier
  `check-imports.js` only verified the target file was present on disk.
  The stack trace made it *look* like a structural problem (it pointed at
  `reconcileChildrenArray`, because the `<Button>` sits among `ScrollView`'s
  children), so I briefly looked in the wrong place instead of at the imports.
- Solution: changed both to `import Button from ...`, and wrote a `check-exports`
  pass that resolves every local `import { X }` against the target module's real
  `export` statements. Rule now: **for every new screen, verify that each local
  named import exists as a named export — parse-clean is not import-clean.**



## What works (keep doing)
- Plain `.map()` rows inside `GestureScrollView` always render —
  use as the safe baseline/fallback.
- Single-level drag list only; staged-save order flush (`subjects →`
  `chapters → videos` UPDATE-only, never upsert).
- Bilingual pattern: `const [lang] = useState('bn')`, `isBn?...:...`.
- Long-press → "Move up / Move down" is the reorder pattern everywhere.
  Drag-and-drop is abandoned (see #6); the library was removed from
  package.json on 2026-10-07 once the last holdout (the Page-tab trailer
  list) was migrated to `.map()` rows.
- An anon Supabase client gets `200 []` on every table, so a session-less
  app shows EMPTY screens with no error at all. "It shows nothing" almost
  always means "not signed in", not "broken query". Probe the REST API with
  the anon key before touching screen logic.
- Expo SDK docs: read versioned docs
  (`https://docs.expo.dev/versions/v57.0.0/`) before using an API.
