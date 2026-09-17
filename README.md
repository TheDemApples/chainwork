# Chainwork

Habit chains with a single momentum flywheel. Completing one habit unlocks the next;
the **chain** has one momentum score and one streak — not per-habit streaks — so it
behaves like a flywheel rather than a checklist.

No backend, no accounts. Everything lives in IndexedDB on your device.

```bash
npm install
npm run dev        # vite dev server
npm run typecheck  # tsc --noEmit
npm run build      # static bundle in dist/
```

---

## The momentum engine

All of it lives in [`src/lib/momentum.ts`](src/lib/momentum.ts) as pure functions —
no React, no IO, no `Date.now()`. That's what makes it testable and history reproducible.

```
armour(R) = min(0.85, R / (R + 12))

λ = 0                      full chain
  = 0.045 · (1 − armour)   partial day
  = 0.250 · (1 − armour)   skipped day

M₁   = M · e^(−λ)
gain = 14 · (1 − M₁/100)^0.7 · (1 + 0.25 · armour)
       × 0.5 · ratio^1.5   if partial
       × 1.6               if big push
M′   = clamp(M₁ + gain, 0, 100)
```

**Decay is exponential, not subtractive.** A flywheel at 88 sheds more absolute energy
than one at 15 — more kinetic energy to lose. It also means momentum can never go
negative, and an *n*-day gap has a closed form.

**Gains are headroom-proportional.** Early wins are large (+12 at M=20), late ones are
small (+1.3 at M=97). 100 is an asymptote you approach but never quite reach.

### Resilience is not the streak

Using the raw streak as decay armour produces a *non-monotonic* collapse: break a
30-day streak and day 1 costs −5.2 but day 2 costs −15.5, because the streak snapped to
zero. The pain curve ran backwards.

So armour lives in a separate value, `resilience`:

| outcome | streak | resilience |
| --- | --- | --- |
| full | `S + 1` | `max(S+1, R)` |
| partial | frozen | frozen |
| skip | `0` | `R × 0.5` |

Consequences now ramp monotonically, bouncing back within a day or two retains earned
armour, and a two-week absence erodes it to nothing.

### How it actually behaves

| scenario | result |
| --- | --- |
| Cold start, 14 perfect days | 20 → 52.7 (d3) → 81.3 (d7) → 99.4 (d14) |
| 4 skipped days from M=75, streak 3 | 61.4 → 49.2 → 38.9 → **30.5** |
| 4 skipped days from M=75, streak 30 | 69.8 → 62.5 → 53.6 → **44.3** |
| One skipped day at M=80 | −17.7 at streak 0 · −11.7 at 7d · −5.5 at 30d · −3.3 at 60d |

Equilibrium — the daily completion rate that merely *holds* momentum:

| hold at | required daily rate |
| --- | --- |
| 30 | 24% |
| 50 | 40% |
| 70 | 62% |
| **85** | **94%** |

That last row is the design in one number: 85+ is only reachable through near-perfect
execution, while half-assing 60% of your chain every day parks you around 61 forever.
Partial credit keeps you alive; it never makes you great.

Verify the shipped code reproduces all of the above:

```bash
npm run verify
```

---

## Edge cases, and how they're handled

| case | behaviour |
| --- | --- |
| **Add a habit mid-streak** | Habits store `addedOnDayKey` and only count from the *next* day, so adding one at 07:00 can't break today. Exception: a chain's founding habits count on day one — otherwise a new chain would be uncompletable the moment motivation is highest. |
| **Remove a habit** | Soft-archived to `archivedHabits`, so historical logs can still resolve its name. |
| **Editing history** | Resolved `DailyLog` rows are frozen at write time and never recomputed. Editing a chain cannot rewrite the past or reset momentum. |
| **Midnight** | The logical day rolls at **04:00 local** (configurable 0–6). A shutdown chain ticked at 01:30 lands on the day you think it does. |
| **Timezones** | Logs are keyed by local `YYYY-MM-DD` strings, never UTC timestamps. Date maths anchors at local noon so DST's 23/25-hour days can't off-by-one it. If the current day key isn't strictly after the last resolved day (clock rollback, flying west), reconciliation does nothing. |
| **Long absence** | Reconciliation walks day-by-day rather than compressing, because armour erodes as the gap widens. Capped at 400 days. |
| **Deleting a chain** | Soft-delete with a 9-second undo. Permanent deletion requires typing the chain's name — the only confirmation dialog in the app. |

---

## Structure

```
src/
├─ types.ts                  data model + colour palette
├─ router.ts                 ~40-line hash router
├─ lib/
│  ├─ momentum.ts            the engine (pure)
│  ├─ dayKey.ts              logical-day / timezone arithmetic
│  ├─ reconcile.ts           settles elapsed days into frozen history
│  ├─ selectors.ts           derived view state
│  ├─ storage.ts             IndexedDB + localStorage mirror + migrations
│  ├─ transfer.ts            JSON export / import
│  └─ seed.ts                starter chains + demo generator
├─ state/store.ts            useSyncExternalStore, no Redux
├─ components/
│  ├─ flywheel/              SVG wheel + rAF spin loop
│  ├─ chain/ChainRail.tsx    the daily execution rail
│  ├─ builder/               dnd-kit reordering
│  ├─ history/               hand-rolled SVG heatmap + chart
│  └─ ui/                    icons, toasts, danger confirm
├─ hooks/useDayWatcher.ts    rollover + reminders
└─ screens/                  Today · Chains · ChainDetail · Data
```

**Deliberate omissions:** no chart library (the heatmap and momentum chart are ~80 lines
of SVG each), no router library, no state library, no icon library. The one dependency
that earns its place is `@dnd-kit` — hand-rolled touch drag-and-drop is a reliability
trap on mobile. Arrow buttons ship alongside it as a keyboard/AT fallback.

## Design

Machine-shop palette: ink `#0B0C0E`, warm paper `#F2EDE4`, brass `#E0A22B` for momentum,
ember `#D9541E` for decay. Archivo for display and tabular figures, IBM Plex Sans for body.
Dark by default, light theme available.

The flywheel encodes momentum through three channels at once — rotation speed
(`ω = 6 + 90·(M/100)^1.3` deg/s, stalling below M=1.5), arc fill, and heat bloom — and
sits directly beside its own rail, so ticking a node visibly kicks the wheel next to your
thumb. Rotation accumulates frame-to-frame rather than deriving from the clock, so speed
changes ease instead of teleporting. `prefers-reduced-motion` disables all of it.

## Keyboard

`1`–`9` tick a node · `space` completes the next one · `u` undoes · `j`/`k` switch chains.
