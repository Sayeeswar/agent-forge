(function () {
  'use strict';

  /* ============================================================
     Data: subjects, doc sources, seed technique bank
     ============================================================ */

  const SUBJECTS = [
    { id: 'coding', label: 'Coding', emoji: '💻', dot: 'var(--blue)',
      desc: 'Write real code in your own project. The AI teaches from what you paste in — it never hands you a finished answer.' },
    { id: 'math', label: 'Math', emoji: '📐', dot: 'var(--pink)',
      desc: 'Work problems one line at a time. The AI never calculates for you — it teaches you to find the road yourself.' }
  ];
  const SUBJECT_LABEL = Object.fromEntries(SUBJECTS.map(s => [s.id, s.label]));
  const SUBJECT_DOT = Object.fromEntries(SUBJECTS.map(s => [s.id, s.dot]));

  const KIND_LABELS = {
    1: 'One road always works',
    2: 'Pick the right formula',
    3: 'A box of tools, no guaranteed road'
  };

  const DOC_SOURCES = [
    { match: /react/i, name: 'React docs', href: 'https://react.dev/learn' },
    { match: /django/i, name: 'Django docs', href: 'https://docs.djangoproject.com/' },
    { match: /node/i, name: 'Node.js docs', href: 'https://nodejs.org/docs/latest/api/' },
    { match: /flask/i, name: 'Flask docs', href: 'https://flask.palletsprojects.com/' },
    { match: /vue/i, name: 'Vue docs', href: 'https://vuejs.org/guide/introduction.html' },
    { match: /python/i, name: 'Python docs', href: 'https://docs.python.org/3/' },
    { match: /typescript/i, name: 'TypeScript Handbook', href: 'https://www.typescriptlang.org/docs/' },
    { match: /javascript|^js$/i, name: 'MDN Web Docs', href: 'https://developer.mozilla.org/' },
    { match: /java\b/i, name: 'Java SE docs', href: 'https://docs.oracle.com/en/java/' },
    { match: /c\+\+/i, name: 'cppreference', href: 'https://en.cppreference.com/' },
    { match: /sql/i, name: 'PostgreSQL docs', href: 'https://www.postgresql.org/docs/' }
  ];
  function docSourceFor(framework) {
    const hit = DOC_SOURCES.find(d => d.match.test(framework || ''));
    if (hit) return hit;
    return { name: framework ? framework + ' official docs' : 'the official docs', href: null };
  }

  function seedBank() {
    return {
      math: {
        'Trigonometry': {
          kind: 2, entries: [
            { see: 'Angle of elevation or depression is given, with one side and an unknown height or distance.',
              act: 'Draw the right triangle, mark the given angle, and write the ratio with SOH-CAH-TOA.',
              check: 'The side you solved for actually sits opposite/adjacent to the angle you used — not a different one.',
              branches: ['Height given → solve for the base', 'Base given → solve for the height', 'Two angles, one side → use the sine rule instead'] },
            { see: 'Two triangles share a side, or one triangle sits inside another.',
              act: 'Redraw them separately, list what each one gives you, then bridge through the shared side.',
              check: 'The shared side comes out the same length in both drawings.',
              branches: ['Still two unknowns → look for a second shared quantity'] }
          ]
        },
        'Integration': {
          kind: 3, entries: [
            { see: 'A product of two clearly different functions (e.g. x·eˣ, x·ln x).',
              act: "Try integration by parts — pick 'u' using LIATE order.",
              check: 'The remaining integral is actually simpler than the one you started with.',
              branches: ['Still messy → try a different LIATE pick', 'Repeats itself → solve algebraically for the integral'] },
            { see: 'A rational function — one polynomial over another.',
              act: 'Try partial fractions. Factor the denominator first.',
              check: 'The numerator has a smaller degree than the denominator (divide first if not).',
              branches: ['Repeated factor → include every power up to it', 'Irreducible quadratic → use a linear-over-quadratic term'] }
          ]
        },
        'Algebra': {
          kind: 1, entries: [
            { see: 'A quadratic equation, in any form.',
              act: 'Rearrange to = 0, then apply the quadratic formula.',
              check: 'a, b and c were read off only after the equation was fully rearranged.',
              branches: ['Discriminant negative → no real roots, say so', 'Discriminant is a perfect square → factoring would have been faster'] }
          ]
        }
      },
      coding: {
        'Debugging': {
          kind: 3, entries: [
            { see: "A value is wrong at runtime and you don't know where it went wrong.",
              act: 'Log the value immediately before the line that uses it, not after.',
              check: 'The logged value matches what you expected at that exact point.',
              branches: ['Already wrong there → the bug is upstream', 'Right there → the bug is in what happens next'] }
          ]
        },
        'State & data flow': {
          kind: 2, entries: [
            { see: "A component or view isn't updating when you expect it to.",
              act: 'Find what actually triggers a re-render, then check whether that thing is really changing.',
              check: 'You can point to the exact line that should have caused the update.',
              branches: ['Nothing triggers it → the state update itself is missing', 'It triggers but reads stale data → a closure/reference issue'] }
          ]
        }
      }
    };
  }

  /* ============================================================
     Persistence
     ============================================================ */

  const STORE_KEY = 'selfLearning.v1';

  function defaultStore() {
    return {
      profile: {
        lastSubject: null,
        math: { onboarded: false, board: '', klass: '', textbook: '' },
        settings: { copyCodeEnabled: true }
      },
      sessions: [],
      bank: seedBank()
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.profile && parsed.bank) return parsed;
      }
    } catch (e) { /* fall through to default */ }
    return defaultStore();
  }

  let store = loadStore();
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ }
  }

  /* ============================================================
     UI state (not persisted)
     ============================================================ */

  function initialUIState() {
    return {
      screen: 'start',
      pickedSubject: store.profile.lastSubject || SUBJECTS[0].id,
      bankSubject: null,
      sessionId: null,
      topicDraft: '',
      chatDraft: '',
      lineDraft: '',
      pasteDraftOpen: false,
      pasteDraft: '',
      onboardDraft: { board: null, klass: null, textbook: '' },
      settingsDraft: null,
      toast: null
    };
  }
  let state = initialUIState();
  let toastTimer = null;

  /* ============================================================
     Small helpers
     ============================================================ */

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function round(n) { return Math.round(n * 1000) / 1000; }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function timeAgo(ts) {
    const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.round(hrs / 24) + 'd ago';
  }

  function activeSession() { return store.sessions.find(s => s.id === state.sessionId) || null; }
  function unfinishedSessions() {
    return store.sessions.filter(s => s.status === 'active').sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function showToast(text) {
    state.toast = text;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { state.toast = null; render(); }, 2600);
  }

  /* ============================================================
     Tutor engine — shared bits
     ============================================================ */

  const FRUSTRATION_RE = /\b(stuck|idk|i\s?don'?t know|no idea|give up|giving up|just tell me|help me|i'?m lost|confused|frustrat\w*|ugh)\b/i;
  const DONE_RE = /\b(done|finished|that'?s my (final )?answer|i('| a)?m done|got it)\b/i;

  const GENERIC_HINTS = [
    "Let's slow down. Look at the last thing that actually checked out — what does it really give you, not what you wish it gave you?",
    "Closer look: which piece of what you were given hasn't been used yet? Unused information is usually the door in.",
    "Here's the shape of the move, not the number: connect what you just found to what the question is actually asking for. Try writing just that one connecting step as your next line."
  ];
  const CODING_HINTS = [
    "Slow down for a second — what does the last line you're sure about actually return or produce? Say that out loud first.",
    "Look at what's calling this piece. What does it expect back? That's usually where the mismatch is hiding.",
    "Don't write the fix yet — just name, in one sentence, which specific line you think is wrong and why. Then try changing only that line."
  ];
  function hintFor(list, level) { return list[Math.min(Math.max(level - 1, 0), list.length - 1)]; }

  function pushMessage(session, role, text, meta) {
    session.messages.push({ id: uid(), role, text, meta: meta || null });
  }

  function matchTopic(subject, raw) {
    const topics = Object.keys(store.bank[subject] || {});
    const lower = (raw || '').toLowerCase();
    return topics.find(t => lower.includes(t.toLowerCase())) || null;
  }
  function guessTopicName(raw) {
    const words = (raw || '').trim().split(/\s+/).slice(0, 3).join(' ');
    return words ? capitalize(words) : 'General';
  }
  function addTechniqueFromSession(session, topicName, cueText) {
    const subj = session.subject;
    if (!store.bank[subj][topicName]) {
      store.bank[subj][topicName] = { kind: 3, entries: [] };
    }
    store.bank[subj][topicName].entries.push({
      see: session.topicRaw,
      act: cueText,
      check: 'Confirm it still fits before trusting it next time.',
      branches: [],
      addedBySession: true
    });
    session.topic = topicName;
  }

  /* -------- Math procedure -------- */

  function openingMessageMath(session) {
    pushMessage(session, 'tutor',
      `Let's work on "${session.topicRaw}". Before we open your bank — from memory, which techniques do you think might apply here? A rough direction is enough to start.`);
  }

  function advanceMath(session, text, frustrated) {
    switch (session.step) {
      case 'recall': {
        const bankHit = session.topic && store.bank.math[session.topic];
        pushMessage(session, 'tutor', bankHit
          ? `Good — hold that thought. When you open your ${session.topic} bank you'll be checking real cue cards against it, not just memory. Let's put it to the test.`
          : `Fair enough — we'll work out which family of technique this is as we go, and add it to your bank once we know.`);
        pushMessage(session, 'tutor',
          `Open the panel on the right and enter your working one line at a time — I'll check each line before you move to the next. When you've got an answer, use "Wrap up" above.`);
        session.step = 'work';
        break;
      }
      case 'work': {
        if (DONE_RE.test(text)) {
          session.step = 'review';
          pushMessage(session, 'tutor', reviewPromptMath(session));
          break;
        }
        pushMessage(session, 'tutor', mathWorkReply(session, text, frustrated));
        break;
      }
      case 'review': {
        const topic = session.topic || guessTopicName(session.topicRaw);
        addTechniqueFromSession(session, topic, text);
        session.step = 'done';
        session.status = 'done';
        session.blocker = null;
        pushMessage(session, 'tutor',
          `Added to your ${topic} bank: "${truncate(text, 90)}" — next time this shape shows up, that's the cue that should fire first. Nice work seeing it through. Start a new session whenever you're ready.`);
        break;
      }
      default:
        pushMessage(session, 'tutor', `This session's wrapped up — start a new one from the sidebar for the next problem.`);
    }
  }

  function reviewPromptMath(session) {
    const topic = session.topic || 'this kind of problem';
    return `Before we close this out — could you have reached this a different way? And what's the one-line cue you'd want future-you to remember for ${topic}? Type it and I'll save it to your bank.`;
  }

  function mathWorkReply(session, text, frustrated) {
    if (frustrated) {
      const hint = hintFor(GENERIC_HINTS, session.hintLevel);
      return `🔓 ${hint}`;
    }
    const n = session.lines.length;
    const lines = [
      "Noted. When you're ready, add the next line in the working panel so I can check it.",
      "Okay — keep going in the panel. I'm watching each line as it lands.",
      "Good, that tracks with where the lines are pointing. Add the next step whenever you're ready."
    ];
    return lines[n % lines.length];
  }

  /* -------- Coding procedure -------- */

  function openingMessageCoding(session) {
    pushMessage(session, 'tutor',
      `Got it — "${session.topicRaw}". Two quick things first: what are you building this into, and what language or framework is it in?`);
  }

  function detectFramework(text) {
    const hit = DOC_SOURCES.find(d => d.match.test(text));
    return hit ? text.trim() : text.trim();
  }

  function advanceCoding(session, text, frustrated) {
    switch (session.step) {
      case 'clarify': {
        session.framework = detectFramework(text);
        const src = docSourceFor(session.framework);
        session.docSource = src;
        pushMessage(session, 'tutor',
          `Good — I'll point you at ${src.name} where it's relevant. Quick concept check first: in your own words, what does "${session.topicRaw}" actually need to do, end to end?`);
        pushMessage(session, 'tutor', `Reference for ${session.framework}:`, { kind: 'source', name: src.name, href: src.href });
        session.step = 'concept';
        break;
      }
      case 'concept': {
        pushMessage(session, 'tutor',
          `That's a reasonable starting shape. Rather than me writing it, write that piece yourself in your own editor — then paste your current file into the panel on the right when you've got something, even if it's incomplete. I'll pick up the conversation from your actual code.`);
        session.step = 'build';
        break;
      }
      case 'build': {
        if (DONE_RE.test(text)) {
          session.step = 'reviewCoding';
          pushMessage(session, 'tutor', `Before we close out — what's the one thing about "${session.topicRaw}" you'd want future-you to remember? Type it and I'll save it to your bank.`);
          break;
        }
        if (frustrated) {
          pushMessage(session, 'tutor', `🔓 ${hintFor(CODING_HINTS, session.hintLevel)}`);
        } else {
          pushMessage(session, 'tutor', `Take your time — paste your code into the panel on the right when you've got something to show me.`);
        }
        break;
      }
      case 'explain': {
        if (DONE_RE.test(text)) {
          session.step = 'reviewCoding';
          pushMessage(session, 'tutor', `Before we close out — what's the one thing about "${session.topicRaw}" you'd want future-you to remember? Type it and I'll save it to your bank.`);
          break;
        }
        if (frustrated) {
          pushMessage(session, 'tutor', `🔓 ${hintFor(CODING_HINTS, session.hintLevel)}`);
        } else {
          pushMessage(session, 'tutor', codingExplainReply(session, text));
        }
        break;
      }
      case 'reviewCoding': {
        const topic = session.topic || guessTopicName(session.topicRaw);
        addTechniqueFromSession(session, topic, text);
        session.step = 'done';
        session.status = 'done';
        session.blocker = null;
        pushMessage(session, 'tutor',
          `Added to your ${topic} bank: "${truncate(text, 90)}" — nice work carrying that through to something that works. Start a new session whenever you're ready for the next piece.`);
        break;
      }
      default:
        pushMessage(session, 'tutor', `This session's closed out — spin up a new one from the sidebar when you're ready.`);
    }
  }

  function extractIdentifiers(code) {
    const re = /\b(?:function|const|let|var|def|class)\s+([A-Za-z_$][\w$]*)/g;
    const found = [];
    let m;
    while ((m = re.exec(code)) && found.length < 6) {
      if (found.indexOf(m[1]) === -1) found.push(m[1]);
    }
    return found;
  }

  function codingExplainReply(session, text) {
    const idents = extractIdentifiers(session.code || '');
    if (idents.length) {
      return `Walk me through what ${idents[0]} is responsible for in your code — then I'll point out anything that doesn't line up with "${session.topicRaw}" yet.`;
    }
    return `Talk me through the piece you just pasted — what's it supposed to do, and where does it plug into the rest of the file?`;
  }

  /* ============================================================
     Line checking (math working panel)
     ============================================================ */

  function checkLine(text) {
    const eqIdx = text.indexOf('=');
    if (eqIdx > 0) {
      const left = text.slice(0, eqIdx).trim();
      const right = text.slice(eqIdx + 1).trim();
      const plainNumeric = /^[0-9+\-*/().\s]+$/;
      if (plainNumeric.test(left) && plainNumeric.test(right) && left && right) {
        try {
          const lv = Function('"use strict";return (' + left + ')')();
          const rv = Function('"use strict";return (' + right + ')')();
          if (typeof lv === 'number' && typeof rv === 'number' && isFinite(lv) && isFinite(rv)) {
            if (Math.abs(lv - rv) < 1e-6) return { status: 'ok' };
            return { status: 'flag', reason: `${left} works out to ${round(lv)}, not ${right}` };
          }
        } catch (e) { /* not evaluable, fall through */ }
      }
    }
    return { status: 'pending' };
  }

  /* ============================================================
     Session creation / actions
     ============================================================ */

  function createSession(topicRaw) {
    const subject = store.profile.lastSubject;
    const topic = matchTopic(subject, topicRaw);
    const session = {
      id: uid(), subject, topic, topicRaw,
      status: 'active', createdAt: Date.now(), updatedAt: Date.now(),
      step: subject === 'math' ? 'recall' : 'clarify',
      hintLevel: 0,
      blocker: null,
      messages: [],
      lines: [], diagramMarks: [],
      framework: null, code: '', codeVersion: 0, docSource: null
    };
    store.sessions.unshift(session);
    state.sessionId = session.id;
    if (subject === 'math') openingMessageMath(session); else openingMessageCoding(session);
    saveStore();
    state.screen = 'workspace';
  }

  function handleStudentMessage(raw) {
    const session = activeSession();
    if (!session) return;
    const text = raw.trim();
    if (!text) return;
    pushMessage(session, 'student', text);
    const frustrated = FRUSTRATION_RE.test(text.toLowerCase());
    if (frustrated) session.hintLevel = Math.min(session.hintLevel + 1, 3);
    if (session.subject === 'math') advanceMath(session, text, frustrated);
    else advanceCoding(session, text, frustrated);
    session.updatedAt = Date.now();
    saveStore();
  }

  function addDiagramMark(session) {
    session.diagramMarks.push({ n: session.lines.length });
    if (session.diagramMarks.length > 6) session.diagramMarks.shift();
  }

  /* ============================================================
     Actions registry (event delegation)
     ============================================================ */

  const actions = {
    goStart() {
      state.screen = 'start';
      state.pickedSubject = store.profile.lastSubject || SUBJECTS[0].id;
      state.sessionId = null;
      render();
    },
    pickSubject(elt) { state.pickedSubject = elt.dataset.id; render(); },
    startNew() {
      const subject = state.pickedSubject;
      store.profile.lastSubject = subject;
      saveStore();
      if (subject === 'math' && !store.profile.math.onboarded) {
        state.onboardDraft = { board: null, klass: null, textbook: '' };
        state.screen = 'onboarding';
      } else {
        state.screen = 'topic';
      }
      render();
    },
    pickBoard(elt) { state.onboardDraft.board = elt.dataset.val; render(); },
    pickClass(elt) { state.onboardDraft.klass = elt.dataset.val; render(); },
    finishOnboard() {
      const d = state.onboardDraft;
      if (!d.board || !d.klass) { showToast('Pick a board and a class to continue.'); return; }
      store.profile.math = { onboarded: true, board: d.board, klass: d.klass, textbook: d.textbook || '' };
      saveStore();
      state.screen = 'topic';
      render();
    },
    pickTopicChip(elt) { state.topicDraft = elt.dataset.val; render(); },
    triggerPhoto() { document.getElementById('photoInput').click(); },
    photoAttached(inputEl) {
      const f = inputEl.files && inputEl.files[0];
      if (!f) return;
      state.topicDraft = (state.topicDraft ? state.topicDraft + '\n' : '') + `[Attached photo: ${f.name} — describe what it shows above so I can read it]`;
      render();
    },
    submitTopic() {
      const text = state.topicDraft.trim();
      if (!text) { showToast('Type or attach something to work on.'); return; }
      createSession(text);
      state.topicDraft = '';
      render();
    },
    resumeSession(elt) {
      const id = elt.dataset.id;
      const s = store.sessions.find(x => x.id === id);
      if (!s) return;
      state.sessionId = id;
      state.screen = 'workspace';
      render();
    },
    sendChat() {
      const text = state.chatDraft;
      state.chatDraft = '';
      const input = document.getElementById('chatInput');
      if (input) input.value = '';
      handleStudentMessage(text);
      render();
    },
    fillSuggestion(elt) {
      state.chatDraft = elt.dataset.val;
      const input = document.getElementById('chatInput');
      if (input) { input.value = state.chatDraft; input.focus(); }
    },
    addLine() {
      const session = activeSession(); if (!session) return;
      const text = state.lineDraft.trim();
      if (!text) return;
      const n = session.lines.length + 1;
      const result = checkLine(text);
      session.lines.push({ n, text, status: result.status });
      state.lineDraft = '';
      const lineInput = document.getElementById('lineInput');
      if (lineInput) lineInput.value = '';
      if (result.status === 'flag') {
        session.blocker = `Stuck on line ${n}: ${text}`;
        pushMessage(session, 'tutor', `Hold on — line ${n} doesn't check out (${result.reason}). Want a nudge, or do you want to try fixing it first?`);
      } else {
        session.blocker = null;
        if (n % 2 === 0) addDiagramMark(session);
        if (result.status === 'pending') {
          pushMessage(session, 'tutor', `Line ${n} noted. I can't verify that one just by eye — talk me through why it's true, or keep going if you're confident.`);
        }
      }
      session.updatedAt = Date.now();
      saveStore();
      render();
    },
    openPaste() { state.pasteDraftOpen = true; state.pasteDraft = activeSession() ? activeSession().code : ''; render(); },
    cancelPaste() { state.pasteDraftOpen = false; render(); },
    submitPaste() {
      const session = activeSession(); if (!session) return;
      const ta = document.getElementById('pasteArea');
      const code = ta ? ta.value : state.pasteDraft;
      if (!code || !code.trim()) { showToast('Paste some code first.'); return; }
      session.code = code;
      session.codeVersion += 1;
      state.pasteDraft = '';
      state.pasteDraftOpen = false;
      const preview = code.split('\n').slice(0, 14).join('\n') + (code.split('\n').length > 14 ? '\n…' : '');
      pushMessage(session, 'tutor', codingExplainReply({ ...session, code }, code), { kind: 'code', code: preview });
      session.step = 'explain';
      session.blocker = null;
      session.updatedAt = Date.now();
      saveStore();
      render();
    },
    toggleCopy(elt, sourceBubble) {
      const idx = elt.dataset.idx;
      showToast(store.profile.settings.copyCodeEnabled ? 'Copied.' : 'Copying is turned off in Settings.');
    },
    wrapUp() {
      const session = activeSession(); if (!session) return;
      if (session.subject === 'math' && session.step === 'work') {
        session.step = 'review';
        pushMessage(session, 'tutor', reviewPromptMath(session));
      } else if (session.subject === 'coding' && (session.step === 'build' || session.step === 'explain')) {
        session.step = 'reviewCoding';
        pushMessage(session, 'tutor', `Before we close out — what's the one thing about "${session.topicRaw}" you'd want future-you to remember? Type it and I'll save it to your bank.`);
      } else {
        showToast('Nothing to wrap up yet.');
        return;
      }
      session.updatedAt = Date.now();
      saveStore();
      render();
    },
    openBank() {
      const s = activeSession();
      state.bankSubject = (s ? s.subject : store.profile.lastSubject) || 'math';
      state.screen = 'bank';
      render();
    },
    bankTab(elt) { state.bankSubject = elt.dataset.id; render(); },
    goSettings() {
      state.settingsDraft = {
        board: store.profile.math.board, klass: store.profile.math.klass, textbook: store.profile.math.textbook
      };
      state.screen = 'settings';
      render();
    },
    saveSettings() {
      const d = state.settingsDraft;
      store.profile.math.board = d.board;
      store.profile.math.klass = d.klass;
      store.profile.math.textbook = d.textbook;
      saveStore();
      showToast('Saved.');
    },
    toggleCopySetting() {
      store.profile.settings.copyCodeEnabled = !store.profile.settings.copyCodeEnabled;
      saveStore();
      render();
    },
    resetAll() {
      if (!confirm('Reset all local progress? This clears every session, bank addition, and profile detail stored in this browser.')) return;
      store = defaultStore();
      state = initialUIState();
      saveStore();
      render();
    }
  };

  /* ============================================================
     Rendering
     ============================================================ */

  function sidebar() {
    const subj = store.profile.lastSubject;
    const resumables = unfinishedSessions().slice(0, 4);
    return `
    <aside class="sidebar">
      <div class="sidebar-brand"><span class="mark">📘</span><span class="name">Self Learning</span></div>
      <button class="sidebar-new" data-action="goStart"><span>＋</span> New session</button>
      <div class="sidebar-section-label">Menu</div>
      <button class="sidebar-link ${state.screen === 'bank' ? 'active' : ''}" data-action="openBank">
        <span>Technique bank</span><span class="dot" style="background:${SUBJECT_DOT[subj] || 'var(--border)'}"></span>
      </button>
      <button class="sidebar-link ${state.screen === 'settings' ? 'active' : ''}" data-action="goSettings"><span>Settings</span></button>
      ${resumables.length ? `<div class="sidebar-section-label">Unfinished</div>` + resumables.map(s => `
        <button class="sidebar-resume" data-action="resumeSession" data-id="${s.id}">
          <div class="t">${escapeHtml(truncate(s.topicRaw || s.topic || 'Untitled', 34))}</div>
          <div class="s">${SUBJECT_LABEL[s.subject]} · ${timeAgo(s.updatedAt)}</div>
        </button>`).join('') : ''}
      <div class="sidebar-spacer"></div>
      <div class="sidebar-foot">
        <div class="row">Copy code: ${store.profile.settings.copyCodeEnabled ? 'on' : 'off'}</div>
        <div class="row">${store.sessions.filter(s => s.status === 'done').length} session(s) completed</div>
      </div>
    </aside>`;
  }

  function screenStart() {
    const resumables = unfinishedSessions();
    return `
    <div class="screen"><div class="screen-pad">
      <h1 class="page-title">Start a Session</h1>
      <p class="page-sub">Pick a subject. It holds for the whole session — switching means starting a new one.</p>
      <div class="subject-grid">
        ${SUBJECTS.map(s => `
          <button class="subject-card" data-action="pickSubject" data-id="${s.id}">
            <div class="top">
              <span class="emoji">${s.emoji}</span>
              ${state.pickedSubject === s.id ? '<span class="badge">selected</span>' : ''}
            </div>
            <div class="title" style="padding:0 18px">${s.label}</div>
            <div class="desc">${s.desc}</div>
            <div class="foot"><div class="line">${bankTopicSummary(s.id)}</div></div>
          </button>`).join('')}
      </div>
      <button class="btn btn-primary" data-action="startNew">Continue with ${SUBJECT_LABEL[state.pickedSubject]}</button>

      ${resumables.length ? `
        <div style="margin-top:38px">
          <div class="form-row"><label>Pick up where you left off</label></div>
          ${resumables.map(s => `
            <div class="banner" style="margin-top:0;margin-bottom:14px">
              <div class="head">
                <span class="label">${SUBJECT_LABEL[s.subject]} · unfinished</span>
                <span class="label">${timeAgo(s.updatedAt)}</span>
              </div>
              <div class="body">
                <div class="t">${escapeHtml(truncate(s.topicRaw || s.topic || 'Untitled', 70))}</div>
                <div class="s">${s.blocker ? escapeHtml(s.blocker) : 'Left mid-way through the working.'}</div>
                <button class="btn btn-ghost btn-sm" style="margin-top:12px" data-action="resumeSession" data-id="${s.id}">Resume where I stopped</button>
              </div>
            </div>`).join('')}
        </div>` : ''}
    </div></div>`;
  }

  function bankTopicSummary(subjectId) {
    const topics = Object.keys(store.bank[subjectId] || {});
    if (!topics.length) return 'No technique bank entries yet.';
    return topics.slice(0, 3).join(' · ') + (topics.length > 3 ? ' · …' : '');
  }

  function screenOnboarding() {
    const boards = ['CBSE', 'ICSE', 'State Board', 'IB', 'Other'];
    const classes = ['6', '7', '8', '9', '10', '11', '12', 'Undergrad'];
    const d = state.onboardDraft;
    return `
    <div class="screen"><div class="screen-pad">
      <button class="back-link" data-action="goStart">← back to start</button>
      <h1 class="page-title">Set Your Context</h1>
      <p class="page-sub">One-time setup for Math — this stays the same for a year, so we only ask once.</p>
      <div class="form-row">
        <label>Board</label>
        <div class="chip-row">${boards.map(b => `<button class="chip ${d.board === b ? 'selected' : ''}" data-action="pickBoard" data-val="${b}">${b}</button>`).join('')}</div>
      </div>
      <div class="form-row">
        <label>Class</label>
        <div class="chip-row">${classes.map(c => `<button class="chip ${d.klass === c ? 'selected' : ''}" data-action="pickClass" data-val="${c}">${c}</button>`).join('')}</div>
      </div>
      <div class="form-row">
        <label>Textbook (optional)</label>
        <input class="field" id="textbookInput" placeholder="e.g. NCERT Mathematics Part II" value="${escapeHtml(d.textbook)}" />
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" data-action="finishOnboard">Save and continue</button>
        <button class="btn btn-ghost" data-action="goStart">Back</button>
      </div>
    </div></div>`;
  }

  function screenTopic() {
    const subject = store.profile.lastSubject;
    const topics = Object.keys(store.bank[subject] || {});
    const profileNote = subject === 'math'
      ? `${store.profile.math.board} · Class ${store.profile.math.klass}`
      : null;
    return `
    <div class="screen"><div class="screen-pad">
      <button class="back-link" data-action="goStart">← back to start</button>
      <h1 class="page-title">What Are We Working On?</h1>
      ${profileNote ? `<p class="page-sub">${escapeHtml(profileNote)} — <span data-action="goSettings" style="text-decoration:underline;cursor:pointer">change in Settings</span></p>` : `<p class="page-sub">Tell me what you're building, or paste the exact problem — I'll work out the topic.</p>`}
      <textarea class="field" id="topicInput" rows="4" placeholder="${subject === 'math' ? "e.g. 'a ladder problem with angle of elevation' or paste the question" : "e.g. 'add a login form to my React app'"}">${escapeHtml(state.topicDraft)}</textarea>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn-primary" data-action="submitTopic">Send</button>
        ${subject === 'math' ? `<button class="btn btn-ghost" data-action="triggerPhoto">Photograph the question</button>
        <input type="file" id="photoInput" accept="image/*" style="display:none" data-action="photoAttached" />` : ''}
      </div>
      ${topics.length ? `
      <div style="margin-top:26px">
        <div class="form-row"><label>Or start from a bank topic</label></div>
        <div class="chip-row">${topics.map(t => `<button class="chip" data-action="pickTopicChip" data-val="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}</div>
      </div>` : ''}
    </div></div>`;
  }

  function metaBlockHtml(m) {
    if (!m.meta) return '';
    if (m.meta.kind === 'source') {
      return `<div class="meta-block">
        <div class="meta-head">Reference to check yourself — not fetched live in this demo</div>
        <div style="padding:10px 13px"><span class="source-chip">${escapeHtml(m.meta.name)}${m.meta.href ? ' · ' + escapeHtml(m.meta.href) : ''}</span></div>
      </div>`;
    }
    if (m.meta.kind === 'code') {
      return `<div class="meta-block">
        <pre class="code-block">${escapeHtml(m.meta.code)}</pre>
        <div class="code-foot"><span class="source-chip">pasted just now</span>
        <button class="btn btn-ghost btn-sm" data-action="toggleCopy">${store.profile.settings.copyCodeEnabled ? 'Copy' : 'Copy (off)'}</button></div>
      </div>`;
    }
    return '';
  }

  function renderMessage(m) {
    const isHint = /^🔓/.test(m.text);
    const bubbleClass = isHint ? 'bubble' : 'bubble';
    return `<div class="msg ${m.role}"><div>
      <div class="${bubbleClass}" ${isHint ? 'style="background:var(--gold);color:var(--gold-ink)"' : ''}>${escapeHtml(m.text).replace(/\n/g, '<br/>')}</div>
      ${metaBlockHtml(m)}
    </div></div>`;
  }

  function getSuggestions(session) {
    if (session.subject === 'math') {
      if (session.step === 'recall') return ['Not sure, let\'s look together', 'I think it needs a formula pick', 'One road should always work here'];
      if (session.step === 'review') return ["I couldn't have gotten there another way", 'There was a shorter path'];
      return ["I'm stuck", "Why doesn't this line work?", 'done'];
    }
    if (session.step === 'clarify') return ['Python', 'JavaScript / React', 'Not sure yet'];
    if (session.step === 'build' || session.step === 'explain') return ["I'm stuck", 'Pasted it, take a look', 'done'];
    return [];
  }

  function diagramSvg(session) {
    if (session.topic === 'Trigonometry') {
      const marks = session.diagramMarks;
      return `<svg viewBox="0 0 400 200" width="100%" height="100%">
        <polygon points="60,170 340,170 340,40" fill="none" style="stroke:var(--ink)" stroke-width="2"/>
        <text x="46" y="184" font-family="DM Sans" font-size="12" font-weight="700" style="fill:var(--ink)">A</text>
        <text x="344" y="184" font-family="DM Sans" font-size="12" font-weight="700" style="fill:var(--ink)">B</text>
        <text x="344" y="34" font-family="DM Sans" font-size="12" font-weight="700" style="fill:var(--ink)">C</text>
        <text x="80" y="162" font-family="DM Sans" font-size="12" style="fill:var(--ink-soft)">θ</text>
        ${marks.map((mk, i) => `<text x="200" y="${60 + i * 16}" font-family="DM Sans" font-size="11" font-weight="700" style="fill:var(--pink-ink)">step ${mk.n} noted</text>`).join('')}
      </svg>`;
    }
    const dots = Math.min(session.lines.length, 8);
    return `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
      <div style="color:var(--muted);font-size:12.5px;text-align:center;padding:0 20px">A worked diagram builds here once the shape of the problem is clear.</div>
      <div style="display:flex;gap:6px">${Array.from({ length: 8 }).map((_, i) => `<span style="width:9px;height:9px;border-radius:50%;background:${i < dots ? 'var(--ink)' : 'var(--bg-line)'}"></span>`).join('')}</div>
    </div>`;
  }

  function screenWorkspace() {
    const session = activeSession();
    if (!session) return screenStart();
    const wrapEnabled = (session.subject === 'math' && session.step === 'work')
      || (session.subject === 'coding' && (session.step === 'build' || session.step === 'explain'));
    const topbar = `
      <div class="workspace-topbar">
        <div class="info">
          <span class="k">${SUBJECT_LABEL[session.subject]}${session.topic ? ' · ' + escapeHtml(session.topic) : ''}</span>
          <span class="v">${escapeHtml(truncate(session.topicRaw, 60))}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${session.status === 'active' ? `<button class="btn btn-ghost btn-sm" data-action="wrapUp" ${wrapEnabled ? '' : 'disabled'}>Wrap up</button>` : `<span class="chip" style="background:var(--green);color:var(--green-ink);border:0">Completed</span>`}
          <button class="btn btn-ghost btn-sm" data-action="openBank">Technique bank</button>
          <button class="btn btn-ghost btn-sm" data-action="goStart">Back to start</button>
        </div>
      </div>
      ${session.blocker ? `<div style="padding:9px 22px;background:var(--pink-soft);font-size:12.5px;color:var(--pink-ink)">Picking back up — ${escapeHtml(session.blocker)}</div>` : ''}
    `;

    const chat = `
      <div class="chat-col">
        <div class="chat-scroll" id="chatScroll">
          ${session.messages.map(renderMessage).join('')}
        </div>
        <div class="chat-compose">
          <div class="suggest-row">${getSuggestions(session).map(s => `<button class="chip" data-action="fillSuggestion" data-val="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}</div>
          <div class="compose-bar">
            <input id="chatInput" placeholder="Say something…" value="${escapeHtml(state.chatDraft)}" />
            <button data-action="sendChat">Send</button>
          </div>
        </div>
      </div>`;

    let side;
    if (session.subject === 'math') {
      side = `
      <div class="side-col">
        <div class="side-head"><span class="path">working · line by line</span><span class="path">${session.lines.length} line(s)</span></div>
        <div class="diagram-wrap">${diagramSvg(session)}</div>
        <div class="side-body">
          <div class="line-list">
            ${session.lines.length ? session.lines.map(l => `
              <div class="line-row">
                <div class="n">${l.n}</div>
                <div class="txt">${escapeHtml(l.text)}</div>
                <div class="status status-${l.status}">${l.status === 'ok' ? 'checks out' : l.status === 'flag' ? 'flagged' : 'noted'}</div>
              </div>`).join('') : `<div class="empty-state">No working entered yet — add your first line below.</div>`}
          </div>
        </div>
        <div class="line-compose">
          <input id="lineInput" placeholder="Enter the next line of working…" value="${escapeHtml(state.lineDraft)}" />
          <button data-action="addLine">Add line</button>
        </div>
      </div>`;
    } else {
      side = `
      <div class="side-col">
        <div class="side-head">
          <span class="path">your current file · v${session.codeVersion}</span>
          <button class="btn btn-ghost btn-sm" data-action="openPaste">${session.code ? 'Paste updated code' : 'Paste your code'}</button>
        </div>
        <div class="side-body">
          ${session.code ? `<pre class="code-panel-pre">${escapeHtml(session.code)}</pre>` : `<div class="code-panel-empty">Nothing pasted yet. Write in your own editor, then paste your current file here — this panel is a display, not an editor.</div>`}
        </div>
        ${state.pasteDraftOpen ? `
        <div class="paste-drawer">
          <textarea id="pasteArea" placeholder="Paste your current file contents…">${escapeHtml(state.pasteDraft)}</textarea>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn btn-primary btn-sm" data-action="submitPaste">Use this code</button>
            <button class="btn btn-ghost btn-sm" data-action="cancelPaste">Cancel</button>
          </div>
        </div>` : ''}
      </div>`;
    }

    return `<div class="main-workspace" style="display:flex;flex-direction:column;height:100%">${topbar}<div class="workspace">${chat}${side}</div></div>`;
  }

  function screenBank() {
    const subj = state.bankSubject || store.profile.lastSubject || 'math';
    const bank = store.bank[subj] || {};
    const topics = Object.keys(bank);
    return `
    <div class="screen"><div class="screen-pad wide">
      <h1 class="page-title">Technique Bank</h1>
      <p class="page-sub">Open any time. Cue → action → check → branch, shown whole — nothing collapsed.</p>
      <div class="chip-row" style="margin-bottom:22px">
        ${SUBJECTS.map(s => `<button class="chip ${subj === s.id ? 'selected' : ''}" data-action="bankTab" data-id="${s.id}">${s.label}</button>`).join('')}
      </div>
      ${topics.length ? topics.map(topic => {
        const t = bank[topic];
        return `
        <div class="bank-topic">
          <div class="bank-topic-head"><span class="name">${escapeHtml(topic)}</span><span class="chip" style="cursor:default">${KIND_LABELS[t.kind] || 'Technique'}</span></div>
          <div class="bank-cards" style="margin-top:12px">
            ${t.entries.map(e => `
              <div class="bank-card">
                <div class="row"><span class="k">See</span><span class="v">${escapeHtml(e.see)}</span></div>
                <div class="row"><span class="k">Do</span><span class="v">${escapeHtml(e.act)}</span></div>
                <div class="row"><span class="k">Check</span><span class="v">${escapeHtml(e.check)}</span></div>
                ${e.branches && e.branches.length ? `<div class="branches">${e.branches.map(b => `<span class="branch-pill">${escapeHtml(b)}</span>`).join('')}</div>` : ''}
              </div>`).join('')}
          </div>
        </div>`;
      }).join('') : `<div class="empty-state">No entries yet for ${SUBJECT_LABEL[subj]}. Finish a session and its technique gets added here automatically.</div>`}
    </div></div>`;
  }

  function screenSettings() {
    const d = state.settingsDraft || { board: store.profile.math.board, klass: store.profile.math.klass, textbook: store.profile.math.textbook };
    const boards = ['CBSE', 'ICSE', 'State Board', 'IB', 'Other'];
    const classes = ['6', '7', '8', '9', '10', '11', '12', 'Undergrad'];
    return `
    <div class="screen"><div class="screen-pad">
      <h1 class="page-title">Settings</h1>
      <p class="page-sub">Rare changes live here so session start stays quick.</p>

      <div class="form-row"><label>Math — board</label>
        <div class="chip-row">${boards.map(b => `<button class="chip ${d.board === b ? 'selected' : ''}" data-action="settingsPickBoard" data-val="${b}">${b}</button>`).join('')}</div>
      </div>
      <div class="form-row"><label>Math — class</label>
        <div class="chip-row">${classes.map(c => `<button class="chip ${d.klass === c ? 'selected' : ''}" data-action="settingsPickClass" data-val="${c}">${c}</button>`).join('')}</div>
      </div>
      <div class="form-row"><label>Math — textbook</label>
        <input class="field" id="settingsTextbook" value="${escapeHtml(d.textbook || '')}" placeholder="e.g. NCERT Mathematics Part II" />
      </div>
      <button class="btn btn-primary" data-action="saveSettings">Save</button>

      <div class="settings-row" style="margin-top:34px">
        <div><div class="t">Allow copying revealed code</div><div class="s">When off, code the tutor shows you can be read but not copied.</div></div>
        <button class="switch ${store.profile.settings.copyCodeEnabled ? 'on' : ''}" data-action="toggleCopySetting"><span class="knob"></span></button>
      </div>
      <div class="settings-row">
        <div><div class="t">Reset all local data</div><div class="s">Clears every session, bank addition and profile detail stored in this browser.</div></div>
        <button class="btn btn-ghost btn-sm" data-action="resetAll">Reset</button>
      </div>
    </div></div>`;
  }

  /* ============================================================
     Root render
     ============================================================ */

  function screenBody() {
    switch (state.screen) {
      case 'start': return screenStart();
      case 'onboarding': return screenOnboarding();
      case 'topic': return screenTopic();
      case 'workspace': return `<div class="screen" style="overflow:hidden;padding:0">${screenWorkspace()}</div>`;
      case 'bank': return screenBank();
      case 'settings': return screenSettings();
      default: return screenStart();
    }
  }

  function render() {
    if (state.screen === 'workspace' && !activeSession()) state.screen = 'start';
    const root = document.getElementById('root');
    root.innerHTML = `
      <div class="app-shell">
        ${sidebar()}
        <div class="main">${screenBody()}</div>
      </div>
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    `;
    bindInputs();
    const chatScroll = document.getElementById('chatScroll');
    if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  function bindInputs() {
    const topicInput = document.getElementById('topicInput');
    if (topicInput) topicInput.oninput = e => { state.topicDraft = e.target.value; };

    const textbookInput = document.getElementById('textbookInput');
    if (textbookInput) textbookInput.oninput = e => { state.onboardDraft.textbook = e.target.value; };

    const settingsTextbook = document.getElementById('settingsTextbook');
    if (settingsTextbook) settingsTextbook.oninput = e => { state.settingsDraft.textbook = e.target.value; };

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.oninput = e => { state.chatDraft = e.target.value; };
      chatInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); actions.sendChat(); } };
    }

    const lineInput = document.getElementById('lineInput');
    if (lineInput) {
      lineInput.oninput = e => { state.lineDraft = e.target.value; };
      lineInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); actions.addLine(); } };
    }

    const pasteArea = document.getElementById('pasteArea');
    if (pasteArea) pasteArea.oninput = e => { state.pasteDraft = e.target.value; };

    const photoInput = document.getElementById('photoInput');
    if (photoInput) photoInput.onchange = () => actions.photoAttached(photoInput);
  }

  // Settings screen chip pickers write into settingsDraft, not onboardDraft — add them here to keep `actions` flat.
  actions.settingsPickBoard = function (elt) { state.settingsDraft.board = elt.dataset.val; render(); };
  actions.settingsPickClass = function (elt) { state.settingsDraft.klass = elt.dataset.val; render(); };

  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = actions[el.dataset.action];
    if (typeof fn === 'function') fn(el, e);
  });

  render();
})();
