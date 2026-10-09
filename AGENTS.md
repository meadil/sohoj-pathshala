# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# The database is off-limits without explicit permission

This is a hard rule. It overrides urgency, convenience, and "it's obviously
safe". The database is production data with real student payments in it.

## The rule

**Never run SQL that writes, edits, or deletes anything — no `INSERT`,
`UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`,
`DO`, or any migration — until you have written out the exact SQL, explained
in plain language what it will do to which rows, and the user has said yes.**

The required sequence, every time:

1. **Write the SQL** into a file (not inline in the shell — quoting mangles
   `$$`).
2. **Show the user the SQL verbatim** in your message.
3. **State the concrete effect**: which tables, how many rows, what changes,
   and explicitly whether it destroys data.
4. **Stop and wait.** Do not run it in the same turn as showing it. Do not
   "just check quickly" first.
5. **Run it only after an explicit yes.** A previous yes covers only that
   specific statement. Approval is not reusable and does not carry to the next
   change.

Reading is different. `SELECT` queries are fine and encouraged — they are how
you verify instead of guessing. Use `node tools/db-query.js "SELECT ..."` for
those, freely.

## Wrapping a test in ROLLBACK does not make it a read

Testing a `DELETE` inside a transaction that ends in `ROLLBACK` still issues a
real write. It happens to leave no trace, but it is still a write, and it still
needs approval first. Treat it as a write.

If you want to verify behaviour without writing anything, prefer:

- Read the policy: `SELECT policyname, cmd, qual FROM pg_policies WHERE ...`
- Read the constraints: `SELECT conname, confdeltype FROM pg_constraint ...`
- Reason about the policy against real data.

Only propose a write-and-rollback test when the read genuinely cannot answer
the question, and get approval for it explicitly.

## Why this exists

On 2026-10-08 I applied a policy change and a new delete-cascade trigger to the
live database without asking first. The user had asked me to fix a bug and I
treated DB access as an implied licence to modify. It worked, and it was still
the wrong default — the same reflex on a payment table would have been
unrecoverable.

# Memory

## learn.md — what it is for

`learn.md` is a **mistakes log only**. It is not a changelog, not a status
file, and not a session diary. Do not append routine work to it.

**Append an entry only when you actually made a mistake** — something you
shipped that was wrong, something you had to undo, or a wrong approach that
cost time. A fix that worked first try is not an entry. A doc or README
update is not an entry.

## The three required parts of every entry

Every entry must answer, in this order:

1. **What the mistake was** — the concrete wrong thing, named precisely
   (file, function, prop, command).
2. **Why it happened** — the actual cause, not a restatement of the mistake.
   Why did this seem reasonable at the time? What assumption was wrong? What
   signal did you ignore? An entry without a real cause is worthless,
   because it cannot prevent a repeat.
3. **What worked / how it was solved** — the fix, and honestly whether it
   fully worked, partially worked, or failed. If it failed, record that too;
   a documented dead end saves the next session from repeating it.

Format:

```
## YYYY-MM-DD — short title

### #N <the mistake, as a headline>
- Mistake: ...
- Why: ...
- Solution: ... (worked / partially worked / did NOT work)
```

Keep entries numbered and dated. Read the whole file before touching the
teacher CourseEditor specifically — most of the entries are about it.

## STATUS.md

`STATUS.md` is a snapshot, not a live truth. It was accurate when it was
written and parts of it are now stale. **Read it for orientation, then
verify every claim against the actual code before acting on it.** When you
find that STATUS.md and the code disagree, the code wins, and correcting the
document is part of the fix.