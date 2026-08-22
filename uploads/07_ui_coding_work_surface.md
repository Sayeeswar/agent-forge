# Idea 07 — UI: Coding Work Surface

**Status:** ✅ Approved
**Date:** 2026-08-20
**Document type:** Product requirements (user interface — coding work surface)
**Builds on:** Idea 01 — Core Product Thesis, Idea 02 — Coding Teaching Procedure, Idea 04 — Session Amendments, Idea 05 — UI: Session Start

---

## 0. What this covers

Idea 02 defined the coding teaching procedure. It never said what the student is looking at while it runs. This document covers that screen.

The demands the procedure places on the screen:

- Somewhere to write, because Step 7 hands a chunk back to the student — the anti-copy-paste heart of the whole procedure.
- Sight of the student's actual code, because Step 9 explains things *in terms of that code* ("this dictionary holds X, here is how it reaches your database").
- Room for concepts and the understanding check before any of that (Steps 4–5).

---

## 1. The student writes in their own editor and pastes in — ✅ confirmed

There is no code editor inside the app. The student keeps working in whatever editor they already use, and pastes code into the app when the AI needs to see it.

**Why not a full in-app editor.** It would mean building an IDE — very large scope for a teaching app.

**Why not a small scratch box.** A box holding one isolated chunk means the AI never sees the surrounding project, so Step 9 could not honestly explain how anything flows through the student's own code. That would hollow out Idea 02 §1's promise that the student is never a passenger in their own project.

---

## 2. The app does not run code — ✅ confirmed

The AI reads the student's code. The student runs it themselves, on their own machine.

**This is coherent with §1.** The student's real workflow — write, run, debug — stays entirely in their own environment. The app sits alongside as the teaching layer rather than trying to replace the toolchain.

**Note on the asymmetry with math.** Idea 03 Step 13 observes that math has no computer to say "wrong," which is why checking-back must be taught explicitly. Code does have that ground truth — but it lives on the student's machine, not in the app.

---

## 3. Layout: split view — ✅ confirmed

The screen is a conversation alongside a code panel, not a single chat stream.

Code in a chat stream scrolls away. By Step 9 the AI would be discussing something twenty messages up, and the student would be scrolling instead of learning.

---

## 4. The code panel holds a living "current code" — ✅ confirmed

Pasted code is **state, not chat history**. The panel holds the student's current code, and the student updates it as the work progresses.

**This is what makes Step 9 honest.** The AI always has the present state of the code in front of it, so explaining how a piece flows into the rest of the project is a real explanation rather than a guess about a fragment.

**The panel is not an editor.** §1 stands — the student writes in their own editor. The panel is a paste target and a display, holding the current state so both sides can point at it.

---

## 5. Documentation sources are visible — ✅ confirmed

When the AI grounds its teaching in a framework's documentation (Idea 02 §2, Step 2), the student sees which source it drew on.

**Why this is worth the space.** Idea 02 §2 makes documentation-grounding a headline feature precisely because generic or outdated framework knowledge teaches confidently wrong syntax. Showing the source makes that claim checkable rather than asserted, and it teaches the student that the documentation is somewhere they can go themselves.

**Consequence: this reopens a dropped item.** Idea 04 §7 dropped doc-grounding depth and reliability for coding. A visible source cannot be displayed unless it was actually retrieved, so the app now has a real technical commitment to fetching genuine documentation. Idea 04 §7 permits dropped items to be reopened as fresh decisions; this is one.

---

## 6. Copying revealed code is a student-controlled setting — ✅ confirmed

At Step 9 the AI eventually shows code. Whether that code can be copied is a setting the student controls.

**Flag on this one.** Idea 01 §5 warns that a bypass everyone *can* switch on is a bypass everyone *does* switch on under deadline pressure. A copy toggle is a milder version of the "give me the answer" button that Idea 01 §5 rejects by name, but it is the same shape. Recorded as decided, with the tension noted.

---

## 7. Interaction with resume

Idea 05 §4.2 restores a resumed session at the exact step, on the same problem, with the blocker context.

For coding, that must now also restore the **current code panel** (§4). Resuming into a conversation about code the panel no longer holds would break Step 9 immediately.

---

## 8. Still open

- **Can the student edit inside the code panel, or only replace it by pasting?** §4 says the panel is not an editor, but light editing is a different question from full IDE scope.
- **Default state of the copy setting** (§6) — on or off for a new student.
- **Framework confirmation on a resumed session** — carried over from Idea 05 §6. Idea 05 §2.3 confirms the framework every session, but a resumed session already knows it.

## 9. Still open under UI generally

- **Math work surface** — step-by-step working, diagrams (Idea 03 §5), and line-by-line proof entry (Idea 04 §3).
