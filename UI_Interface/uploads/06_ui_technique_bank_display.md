# Idea 06 — UI: Technique Bank Display

**Status:** ✅ Approved
**Date:** 2026-08-20
**Document type:** Product requirements (user interface — technique bank)
**Builds on:** Idea 01 — Core Product Thesis, Idea 03 — Math Teaching Procedure, Idea 04 — Session Amendments, Idea 05 — UI: Session Start

---

## 0. What this covers

Idea 03 §2.4 defined *what* a technique bank entry is. Idea 04 §4 resolved *how banks are split*. Neither said how the student actually sees or moves through their own bank. This document covers that screen.

---

## 1. The bank is openable at all times — ✅ confirmed

The student can open their bank whenever they want, including in the middle of a session.

No lock, no gating, no "earn it first." Idea 01 §5 forbids walls, and a bank the student cannot reach when stuck is a wall.

---

## 2. Structure: topic → kind → cue — ✅ confirmed

Entries are grouped in three levels:

1. **Topic** — Trigonometry, Integration, Algebra, and so on (Idea 04 §4's per-subject banks).
2. **Kind** — Idea 03 §3's Kind 1 / Kind 2 / Kind 3 (one road always works / pick the right formula / a box of tools, no guaranteed road).
3. **Cue entries** — the individual techniques underneath.

**Why kind earns a level.** Kind is not decoration. It is the distinction that tells a student *how to approach* an unfamiliar problem before they know anything else about it — whether to reach for a guaranteed method, match a formula, or open the toolbox. Idea 03 §8 left bank organisation as an open design question; this resolves it.

---

## 3. Entries show the full cue-chain — ✅ confirmed

Each entry displays its whole chain at once: **see this → do this → check this → then branch** (Idea 03 §2.4).

Nothing is collapsed or hidden behind a tap. Idea 03 §2.4 already caps entry length — one cue, one action, one check, a few branches, split anything longer — so a full entry is small enough to read whole.

---

## 4. Presentation is gamified — ✅ confirmed

The cues and entry content are displayed in a styled, game-like way rather than as a plain text list.

**Scope of this decision.** This is purely presentational — how the cues and their content look on screen. It is **not** a scoring, mastery, streak, points or progress system, and no such layer is being added.

**Consequence: Idea 04 §6 performance data stays internal.** Per-entry technique-bank performance continues to do only what Idea 04 §6 scoped it for — adjusting the length of the Idea 03 Step 7 understanding check. It is never surfaced to the student, and the bank is never a scoreboard.

---

## 5. The bank is a recall trainer, not a reference sheet — ✅ confirmed

### 5.1 The conflict this resolves

Idea 03 §2.4 is explicit that pulling a technique from memory is what makes it stay, and that being handed the same list does nothing. Idea 03 Block A Step 2 asks the student to walk their own bank *from memory* before solving.

An always-open, fully-visible bank (§1 and §3) would let a stuck student simply read instead of recall, quietly killing that mechanism.

### 5.2 The resolution — procedure order, not UI restriction

Block A Step 2 keeps its full meaning. The AI asks the student which techniques might fit **before** they look. The bank stays open the whole time.

The recall happens because the AI asks first, not because the app locked a door. This preserves Idea 03 §2.4's mechanism without violating Idea 01 §5.

---

## 6. Still open

- **Terminology collision on the word "subject."** Idea 04 §4 says "one bank per subject" and gives Trigonometry, Integration and Algebra as examples — those are math *topics*. Idea 05 §1 uses "subject" to mean Coding vs. Math. Two different levels, one word. This document uses **topic** for the Idea 04 §4 sense (§2 above), but the source documents should be reconciled.
- **Does Coding have a technique bank at all?** The cue-chain format is a math mechanism from Idea 03 §2.4, and Idea 02 never asked for an equivalent. Idea 04 §6 nonetheless uses "per-subject technique bank performance" as the adaptive-guardrail signal for the app generally. Unresolved.

## 7. Still open under UI generally

- **Subject work surface** — the coding attempt area and the math workspace, including diagrams (Idea 03 §5) and line-by-line proof entry (Idea 04 §3).

---

## 8. Dismissed: dedicated Graduated Disclosure controls

**Scope of this dismissal.** The UI topic only. **Graduated Disclosure itself is untouched** and remains a defining feature (Idea 01 §5), running at all times inside both procedures (Idea 02 Step 11, Idea 03 §4).

What is dismissed is any dedicated interface for it — no frustration button, no "give me the answer" control, no disclosure slider.

**Why this is the right outcome, not a gap.** Idea 01 §5 rejects a free "give me the answer" button by name, because it is the button everyone presses under deadline pressure, collapsing the app back into a normal AI. A dedicated control would be that button wearing a different label.

So frustration is read from what the student actually says and does in the session, exactly as Idea 01 §5 describes — frustration as a signal the AI notices, not a lever the student pulls.
