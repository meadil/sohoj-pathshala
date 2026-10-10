# Sohoj Pathshala (সহজ পাঠশালা)

**"Easy Learning" — a Bengali-language education app for students who can't afford good tuition.**

Built for SSC and HSC Science students in Bangladesh.

---

## The problem

Good coaching in Bangladesh means private tuition, and private tuition means money
most families don't have. Free YouTube is scattered and unstructured. Students
who can't afford coaching end up with no path to the board exam.

Sohoj Pathshala puts a structured course — video lessons, practice questions,
weekly quizzes, and progress tracking — in a student's pocket for a price they
can actually pay.

---

## There are two apps in this repository

This is the most important thing to know. **One codebase produces two separate
apps**, decided when the app is built, not when it runs.

| | Student app | Teacher app |
|---|---|---|
| **Name** | Sohoj Pathshala (সহজ পাঠশালা) | Sohoj Shikkhok (সহজ শিক্ষক) |
| **Who it's for** | Students | Teachers and course owners |
| **Package ID** | `com.sohojpathshala.student` | `com.sohojpathshala.teacher` |
| **What it does** | Learn and take quizzes | Create courses, review payments, manage students |

They share all their code — components, theme, backend, navigation setup — but
the screens are kept completely separate. When you build, you say which one you
want. A student never sees a teacher screen; a teacher never sees a student
screen.

---

## What a student can do

**Buy a course.** Payment by bKash, then they submit the transaction ID and it's
confirmed manually.

**Watch video lessons.** Organised subject → chapter → video, with a continuous
player that picks up where you left off and tracks what you've actually watched.

**Practise with MCQ decks.** Swipe through multiple-choice questions, get scored
instantly, review what you got wrong.

**Take live weekly quizzes.** Real quizzes with a countdown and a timer. One
attempt each — no retaking.

**Watch free preview videos.** Ungated, before buying anything.

**See their progress.** A report tab with streaks, accuracy, and a per-subject
breakdown, calculated from their own data.

---

## What a teacher can do

- Write and edit courses, chapters, and lessons
- Create and edit quizzes and MCQ decks
- Review payment submissions and approve students
- Post announcements and banners
- See student detail and performance reports
- Post free preview videos
- Get approved as a teacher by an owner

---

## How it's built

**Mobile app:** React Native / Expo, running on Android
**Backend:** Supabase — a Postgres database with built-in login and per-row access rules
**Accounts:** email and password, with separate student and teacher sign-up

There is no separate server to run or host. Supabase handles the database,
authentication, and access control.

---

## Running it yourself

You'll need Node.js and the Expo tooling.

```bash
npm install
npm start          # opens the developer menu
```

To run on a real Android device or emulator:

```bash
npm run android
```

### Configuration

The app reads its settings from a `.env` file:

```bash
cp .env.example .env
```

You need a Supabase URL and anon key. Both are safe to ship in the app — real
security comes from Supabase's row-level access rules, not from hiding the key.

### Building for a specific app

The two apps are built separately:

```bash
APP_TARGET=student eas build --platform android --profile preview
APP_TARGET=teacher eas build --platform android --profile preview
```

Omitting `APP_TARGET` builds the teacher app.

---

## Project layout

```
screens/student/    the student app — lessons, quizzes, progress
screens/teacher/    the teacher app — course authoring, payments, reports
components/         shared UI building blocks
navigation/         the two navigation trees, one per app
contexts/           who is logged in, app-wide state
services/           push notifications
lib/                shared helpers
theme/              colours, spacing, fonts
tools/              build and release scripts
```

---

## Status

Shipped. Both Android builds were produced and handed to the founder on
9 October 2026. Ongoing work is content — more courses, more questions — and
occasional fixes.

---

## Further reading

**[CODEBASE.md](CODEBASE.md)** — the full technical reference: every file, every
database table, known issues, and the reasoning behind the architecture.
**[AGENTS.md](AGENTS.md)** — rules that protect the live database. Read it before
running anything.

---

Built by the Sohoj Pathshala team.
MIT licensed.