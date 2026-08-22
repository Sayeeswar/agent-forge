# Idea 08 — UI: Math Work Surface

**Status:** ✅ Approved
**Date:** 2026-08-20
**Document type:** Product requirements (user interface — math work surface)
**Builds on:** Idea 01 — Core Product Thesis, Idea 03 — Math Teaching Procedure, Idea 04 — Session Amendments, Idea 05 — UI: Session Start

---

## 0. What this covers

Idea 03 defined the math teaching procedure. This document covers what the student is looking at while it runs.

What the procedure demands of the screen:

- A real working area, because Step 9 says the student does the work and **the AI does not calculate**.
- Line-level visibility, because Step 10 exists only because the AI cannot see where the student stopped.
- Drawing, because Idea 03 §5 has the AI produce a diagram and progressively mark findings on it.
- Line-by-line entry for proofs (Idea 04 §3).

---

## 1. Input: typing and photo — ✅ confirmed

The student enters math two ways:

1. **Typing**, through a math editor in the app.
2. **Photographing written work** on paper.

**On-screen handwriting is not supported.** Rejected deliberately — it would effectively require a stylus and tablet, narrowing the app's reach for a group (K-12 and university students, Idea 01 §7) who mostly work on paper and phones.

**Why photo matters.** Idea 03 §1 describes the student who photographs question 7. That student exists and is the norm. Requiring them to retype a question they are holding in their hand is friction with no teaching value.

---

## 2. Working is line-by-line throughout — ✅ confirmed

The student's working is entered and checked one line at a time, for **all** math — not only proofs.

### 2.1 Consequence: proofs stop being a special case

Idea 04 §3 introduced line-by-line entry specifically for proofs, as an exception to a single whole-answer explanation. With line-by-line as the general mode, proofs are simply the normal rhythm rather than a carve-out. **This generalises Idea 04 §3.**

### 2.2 Consequence: Step 10 largely solves itself

Idea 03 Step 10 ("ask the student where exactly they are stuck") exists because the AI cannot see this by itself. Line-by-line entry means the AI always knows which line came last, so the question becomes a confirmation rather than an investigation — and Step 11's slip / hole / trick sort gets a **specific line to point at** instead of a vague area.

---

## 3. Photo can carry working, not just the problem — ✅ confirmed

A photographed page may contain the student's working, not only the question. The app reads it and splits it into lines.

### 3.1 The lines are checked in order, stopping at the first wrong line

This is what keeps §2's discipline intact when a student submits five lines at once. The AI does not evaluate the block as a whole and return a verdict — it walks the lines in sequence and halts at the first one that fails.

### 3.2 Consequence: everything after the first wrong line is unverified, not wrong

Once a line fails, the lines below it were built on it. They are set aside pending the fix rather than marked incorrect.

Idea 04 §3's sort applies at that first failing line: a **careless mistake** in an otherwise-correct approach gets pointed at, and the student carries on; a **genuine gap in understanding** sends the student back to the understanding check to rebuild the concept.

---

## 4. One diagram, marked up progressively — ✅ confirmed

The AI draws a single diagram and adds to it, rather than generating a fresh picture at each stage.

This is the literal shape of Idea 03 §5's ladder:

1. The AI draws and marks everything derivable.
2. Still stuck — the AI adds further findings to the same picture.
3. Still stuck — the AI solves only the confusing part.

An evolving diagram also lets the student see *what was added at this rung*, which is the actual teaching content of the ladder. Redrawing from scratch each time would hide that.

**This confirms a technical requirement Idea 03 §8 left out of scope:** the AI must genuinely produce and update images, not only text.

---

## 5. Still open

- **Math editor scope** — which symbols and structures the typing palette must cover (fractions, integrals, limits, matrices, summations).
- **Reading handwriting from photos.** §3 depends on turning a photographed page into ordered lines of math. Handwritten math recognition is materially harder than printed text, and a misread line would be indistinguishable from a student error — the AI would correct a mistake the student never made. Needs a fallback path.
- **Notation and naming per board** — carried over from Idea 03 §8. The math editor and the AI's output must both use the notation the student's board uses (Idea 03 §2.1), and where that mapping comes from is still undecided.

---

## 6. UI stage complete

With this document, the user interface topics opened in Idea 05 §0 are closed:

- Session start — Idea 05
- Technique bank display — Idea 06
- Coding work surface — Idea 07
- Math work surface — Idea 08
- Graduated Disclosure controls — dismissed, Idea 06 §8

**Carried forward into build and architecture:**

- The "subject" terminology collision, and whether Coding has a technique bank at all (Idea 06 §6).
- Resume state as a distinct persistent store from the subject profile (Idea 05 §4.4), including the coding code panel (Idea 07 §7).
- Real documentation retrieval for coding, reopened by visible sourcing (Idea 07 §5).
- Diagram generation (§4) and handwriting recognition (§5) as concrete technical dependencies.
