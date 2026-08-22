# Idea 05 — UI: Session Start

**Status:** ✅ Approved — all 4 sub-concepts confirmed
**Date:** 2026-08-20
**Document type:** Product requirements (user interface — session start)
**Builds on:** Idea 01 — Core Product Thesis, Idea 02 — Coding Teaching Procedure, Idea 03 — Math Teaching Procedure, Idea 04 — Session Amendments

---

## 0. Why this document exists

Platform and core interaction style were dropped in Idea 04 §7, which left the app with no designed interface at all. Idea 04 §7 allows dropped items to be reopened as fresh decisions, so the user interface is now being designed from scratch — starting with session start, since nothing else can begin until a session does.

Idea 04 §5 already gave the skeleton: pick a subject → AI asks for the concept → AI clarifies → procedure begins. This document fills in how that actually behaves.

**Gap found while working through this.** Idea 04 §5 is written as if every session starts from a blank slate. But Idea 03 §2.1 needs the student's board, class and textbook to teach correctly, and Idea 04 §6 says technique-bank history already persists per subject across sessions. So a returning student is *not* starting from zero, and session start has to account for information that already exists.

---

## 1. Subject selection mechanism — ✅ confirmed

### 1.1 The selector is a scalable list

Not two hardcoded buttons. The subject list is data-driven, so a third subject can be added later without rebuilding the screen.

Coding and Math are the only two live subjects for MVP (Theory dropped, Idea 04 §1). The list is built for growth anyway, because Idea 01 §7 commits the app to being general-purpose rather than niche.

### 1.2 The subject is locked for the session

Once a subject is chosen, it holds for the whole session. Switching subjects means starting a **new session**.

This is not an arbitrary restriction. The two procedures are structurally different — Idea 02's concept-gating flow versus Idea 03's Block A/B/C flow — so a mid-session switch would mean tearing down and rebuilding the entire teaching state. A new session is the honest version of that.

### 1.3 The picker remembers and pre-selects the last subject

A returning student sees their previous subject already selected.

**Note on the interaction with §1.2.** A student moving from Math to Coding starts a new session, and that new session pre-selects Math. They have to actively override it. This is accepted, not overlooked — the convenience is worth it for the common case (same subject again), and the override is one tap.

**This does not break Idea 04 §5.** That rule forbids the AI from *inferring* the subject from free text. A pre-selected default that the student can see and change is still an explicit pick.

---

## 2. Onboarding vs. per-session information — ✅ confirmed

### 2.1 The distinction

Some information barely changes and should be captured once. Some changes constantly and must be asked every time. Session start has to handle both without making the stable half feel like a form to refill.

### 2.2 Onboarding runs once, on first use of that subject

The first time a student ever opens a given subject, a one-time flow collects that subject's stable information. It does not run again for that subject.

### 2.3 Coding's language/framework is per-session, not onboarding

The student's language or framework is confirmed **every session**, as part of goal-clarification (Idea 02 steps 1–3).

Board and class hold steady for a year. A framework does not — a student can be in Python this week and React next. Storing it silently would mean the AI grounds itself in the wrong documentation and teaches confidently wrong syntax, which is the exact failure Idea 02 §2 exists to prevent.

### 2.4 Consequence: onboarding is a Math-only mechanism

Follows directly from §2.2 and §2.3.

Math needs stable information the AI cannot derive from a topic pick — board, class, textbook (Idea 03 §2.1). Coding needs no equivalent, because its only context requirement is the framework, and §2.3 puts that inside every session's goal-clarification.

So Coding has no first-time onboarding screen. Its context detection lives entirely inside the procedure it already has.

### 2.5 Editing lives in a separate profile/settings area

Changing board, class or textbook happens in a profile area, outside the session flow — not as an inline edit on the subject-pick screen.

Session start stays clean for the common case. Grade changes and board switches are rare, and a rare action does not deserve permanent screen space in a flow the student passes through every single day.

---

## 3. Topic pinpointing flow — ✅ confirmed

### 3.1 Free text only

The student types what they want to work on. There is no syllabus picker and no guided drill-down through chapters.

### 3.2 The student can start from a problem, not just a topic

A student can paste or photograph the actual question and the AI works out which topic it belongs to. Idea 03 §1 describes exactly this student — the one who photographs question 7 — and that student has a problem in hand, not a topic name.

**This does not break Idea 04 §5.** That rule forbids inferring the **subject** from free text. The subject is still an explicit pick (§1). Inferring the *topic* from a pasted problem is a different thing and is allowed.

### 3.3 Clarification runs until the AI is certain

There is no fixed cap on clarifying turns. The AI keeps asking until it can pin the exact concept, because starting the wrong procedure on a misread topic wastes the whole session.

### 3.4 Consequence: no syllabus browser is needed

Board, class and textbook from onboarding (§2.2) are used by the AI to interpret names and notation correctly — Idea 03 §2.1's cosec-versus-csc problem — not to render a browsable chapter tree. The syllabus stays internal context, never a screen.

### 3.5 Consequence: Graduated Disclosure bounds the clarification loop

Unbounded questioning is itself a wall, and Idea 01 §5 forbids walls. A student who arrived with question 7 and gets interrogated first is the rage-quit case.

No hard turn cap is needed because Graduated Disclosure already runs *at all times* (Idea 02 step 11, Idea 03 §4). A student showing frustration during clarification triggers compression exactly as they would mid-solve. That is the brake.

---

## 4. Resuming an existing thread — ✅ confirmed

### 4.1 Unfinished sessions can be resumed

A session that ended mid-solve is genuinely unfinished. In Idea 03 §4 terms, it stopped inside Block B: the problem is half-walked, the technique was never added to the bank (Block C step 14), and the roads were never compared (step 15). That is a different state from a session that reached Block C and closed properly.

### 4.2 Resume restores the exact step, the same problem, and the blocker context

Not just the topic. The student re-enters at the precise step they left, on the same problem, and the AI carries forward **what the student was struggling with and which gaps still need filling**.

Without the blocker context, resuming would put the student back on the same line with the same confusion and no memory of the diagnosis — effectively restarting the hard part from scratch.

### 4.3 The resume option is never pre-selected

It appears as a visible option the student actively chooses. This is deliberately different from §1.3's pre-selected subject.

An abandoned session is often abandoned *because* the student got stuck and gave up. Dropping them straight back into the exact spot that defeated them, without asking, is the wrong default.

### 4.4 Consequence: resume needs its own persistent state

Idea 04 §6's profile stores what the student **knows** — technique-bank history accumulated over time. Restoring what they were **stuck on** is a different kind of state: the live blocker diagnosis from Idea 03 step 11 (slip / hole / trick) and Idea 04 §3 (careless mistake versus genuine gap).

This is saved per unfinished session, not per subject. It should carry into the database design.

### 4.5 Consequence: Block A does not re-run on resume

Context, the technique-bank walk and goal-clarification were all completed in the interrupted session. Resume re-enters mid-Block-B directly.

Subject selection still happens first, because §1.2 locks a subject per session.

---

## 5. Where the stable information lives

Idea 04 §6 already establishes a persistent per-subject student profile (technique-bank history carrying across sessions). Onboarding information belongs to that same profile rather than to a separate store — one place per subject, holding both what the student knows and the context they learn it in.

Resume state (§4.4) is separate from this — it belongs to the unfinished session, not to the subject profile.

---

## 6. Minor open note

- **Framework confirmation on a resumed coding session.** §2.3 confirms the language/framework every session, but a resumed session already knows it from the interrupted one. Whether resume skips that confirmation is not yet decided.

## 7. Still open under UI generally

- **Subject work surface** — the coding attempt area and the math workspace, including diagrams (Idea 03 §5) and line-by-line proof entry (Idea 04 §3).

**Resolved since:** technique bank display (Idea 06). **Dismissed:** Graduated Disclosure controls — see Idea 06 §8.
