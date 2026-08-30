import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import {
  providerModels,
  statusMessages,
  cannedReplies,
} from '../data/sampleData.js';

import { runSendSimulation } from '../lib/sendSimulator.js';
import { getKeyStatus, postValidateKey } from '../lib/keysApi.js';
import {
  getGithubStatus,
  postValidateGithubToken,
  fetchPullRequest,
} from '../lib/githubApi.js';
import { postAnalyze } from '../lib/analysisApi.js';
import { postFileReview } from '../lib/fileReviewApi.js';

const basename = (p) => String(p).split(/[\\/]/).filter(Boolean).pop() || String(p);

const DEFAULT_PROVIDER = 'openrouter';

const initialState = {
  messages: [],
  status: 'idle', // 'idle' | 'pending'
  pendingStatusIndex: 0,
  statusLabel: null, // overrides the cycling status text during a real call
  // Active LLM provider. Drives the model dropdown list below and which key the
  // Connect API popup targets.
  provider: DEFAULT_PROVIDER, // 'openrouter' | 'openai'
  model: providerModels[DEFAULT_PROVIDER][0],
  models: providerModels[DEFAULT_PROVIDER],
  sources: {
    pr: null, // { value: string, pr?: PullRequestSummary } | null
    local: null, // { value: string } | null
  },
  activeSourceType: null, // 'pr' | 'local' | null
  panel: {
    expanded: false,
    kind: 'code', // 'code' | 'pr' | 'suggestions'
    code: null, // { filename, language, content } | null
    pr: null, // PullRequestSummary | null
    suggestions: null, // AnalysisSuggestion[] | null
  },
  // Module 2 — LLM API key connection state. Sourced from the C# backend
  // (GET /api/keys/status on load, POST /api/keys/validate on connect).
  providers: {
    openai: { connected: false },
    openrouter: { connected: false },
  },
  // Module 3 — GitHub connection state (GET /api/github/status on load,
  // POST /api/github/validate on connect).
  github: { connected: false, login: null },
};

let idSeq = 0;
const nextId = () => `m${(idSeq += 1)}`;

function reducer(state, action) {
  switch (action.type) {
    case 'USER_SEND':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextId(), role: 'user', text: action.text },
        ],
        status: 'pending',
        pendingStatusIndex: 0,
      };

    case 'STATUS_STEP':
      return { ...state, pendingStatusIndex: action.index };

    case 'ASSISTANT_REPLY': {
      const { reply } = action;
      const message = {
        id: nextId(),
        role: 'assistant',
        text: reply.text,
        code: reply.code ?? null,
      };
      return {
        ...state,
        messages: [...state.messages, message],
        status: 'idle',
        panel: reply.code
          ? {
              expanded: true,
              kind: 'code',
              code: reply.code,
              pr: null,
              suggestions: null,
            }
          : state.panel,
      };
    }

    case 'ANALYZE_START':
      return {
        ...state,
        status: 'pending',
        pendingStatusIndex: 0,
        statusLabel: action.label ?? 'Analyzing…',
        messages: action.prompt
          ? [
              ...state.messages,
              { id: nextId(), role: 'user', text: action.prompt },
            ]
          : state.messages,
      };

    case 'ANALYZE_RESULT': {
      const { result } = action;
      const findings = result.findings ?? [];
      const suggestions = result.suggestions ?? [];
      const message = {
        id: nextId(),
        role: 'assistant',
        text: result.summary || 'Analysis complete.',
        findings,
        suggestions,
      };
      return {
        ...state,
        messages: [...state.messages, message],
        status: 'idle',
        statusLabel: null,
        panel: suggestions.length
          ? {
              expanded: true,
              kind: 'suggestions',
              code: null,
              pr: state.panel.pr ?? state.sources.pr?.pr ?? null,
              suggestions,
            }
          : state.panel,
      };
    }

    case 'ANALYZE_ERROR':
      return {
        ...state,
        status: 'idle',
        statusLabel: null,
        messages: [
          ...state.messages,
          {
            id: nextId(),
            role: 'assistant',
            text: action.error,
            findings: [],
            suggestions: [],
          },
        ],
      };

    case 'SHOW_PR':
      return {
        ...state,
        panel: {
          expanded: true,
          kind: 'pr',
          code: null,
          suggestions: null,
          pr: action.pr ?? state.panel.pr ?? state.sources.pr?.pr ?? null,
        },
      };

    case 'SHOW_SUGGESTIONS':
      return {
        ...state,
        panel: {
          expanded: true,
          kind: 'suggestions',
          code: null,
          pr: state.panel.pr ?? state.sources.pr?.pr ?? null,
          suggestions: action.suggestions ?? [],
        },
      };

    case 'SET_MODEL':
      return { ...state, model: action.model };

    case 'SET_PROVIDER': {
      const list = providerModels[action.provider] ?? state.models;
      return {
        ...state,
        provider: action.provider,
        models: list,
        model: list[0],
      };
    }

    case 'SET_SOURCE':
      return {
        ...state,
        sources: {
          ...state.sources,
          [action.sourceType]: { value: action.value },
        },
        activeSourceType: action.sourceType,
      };

    case 'SET_ACTIVE_SOURCE':
      return { ...state, activeSourceType: action.sourceType };

    case 'SET_PR_SOURCE':
      return {
        ...state,
        sources: {
          ...state.sources,
          pr: { value: action.url, pr: action.pr },
        },
        activeSourceType: 'pr',
        panel: {
          expanded: true,
          kind: 'pr',
          code: null,
          pr: action.pr,
          suggestions: null,
        },
      };

    case 'EXPAND_PANEL':
      return { ...state, panel: { ...state.panel, expanded: true } };

    case 'COLLAPSE_PANEL':
      return { ...state, panel: { ...state.panel, expanded: false } };

    case 'TOGGLE_PANEL':
      return {
        ...state,
        panel: { ...state.panel, expanded: !state.panel.expanded },
      };

    case 'SET_PROVIDER_STATUS':
      return {
        ...state,
        providers: {
          openai: { connected: !!action.openai },
          openrouter: { connected: !!action.openrouter },
        },
      };

    case 'SET_PROVIDER_CONNECTED':
      return {
        ...state,
        providers: {
          ...state.providers,
          [action.provider]: { connected: !!action.connected },
        },
      };

    case 'SET_GITHUB_STATUS':
      return {
        ...state,
        github: {
          connected: !!action.connected,
          login: action.login ?? state.github.login,
        },
      };

    case 'FILE_REVIEWED': {
      const { path, message, analysis } = action;

      const outgoing = [
        { id: nextId(), role: 'user', text: `Review ${basename(path)}` },
      ];

      // e.g. the ".ipynb was auto-exported to a script" note before the review.
      if (analysis && message) {
        outgoing.push({
          id: nextId(),
          role: 'assistant',
          text: message,
          findings: [],
          suggestions: [],
        });
      }

      outgoing.push(
        analysis
          ? {
              id: nextId(),
              role: 'assistant',
              text: analysis.summary || 'Analysis complete.',
              findings: analysis.findings ?? [],
              suggestions: analysis.suggestions ?? [],
            }
          : { id: nextId(), role: 'assistant', text: message, findings: [], suggestions: [] }
      );

      const suggestions = analysis?.suggestions ?? [];

      return {
        ...state,
        messages: [...state.messages, ...outgoing],
        sources: { ...state.sources, local: { value: path } },
        activeSourceType: 'local',
        status: 'idle',
        statusLabel: null,
        panel: suggestions.length
          ? {
              expanded: true,
              kind: 'suggestions',
              code: null,
              pr: state.panel.pr,
              suggestions,
            }
          : state.panel,
      };
    }

    default:
      return state;
  }
}

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const replyCursor = useRef(0);
  const cancelRef = useRef(null);

  // Latest state for callbacks that must not churn the memoized `actions`.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Clean up any in-flight fake request on unmount.
  useEffect(
    () => () => {
      if (cancelRef.current) cancelRef.current();
    },
    []
  );

  // Module 2/3 — pull saved connection state from the backend once on load. If
  // the backend is down, everything just stays disconnected.
  const refreshKeyStatus = useCallback(async () => {
    try {
      const status = await getKeyStatus();
      dispatch({
        type: 'SET_PROVIDER_STATUS',
        openai: status.openai,
        openrouter: status.openrouter,
      });
    } catch {
      // no-op: leave providers as-is (disconnected)
    }
    try {
      const gh = await getGithubStatus();
      dispatch({
        type: 'SET_GITHUB_STATUS',
        connected: gh.connected,
        login: gh.login,
      });
    } catch {
      // no-op: leave GitHub as-is (disconnected)
    }
  }, []);

  useEffect(() => {
    refreshKeyStatus();
  }, [refreshKeyStatus]);

  // Module 2 — send a key to the backend for a real provider check. Returns the
  // transcript object for the dialog to render; flips connection state on success.
  const validateKey = useCallback(async (provider, key) => {
    const result = await postValidateKey({ provider, key });
    if (result.ok) {
      dispatch({ type: 'SET_PROVIDER_CONNECTED', provider, connected: true });
    }
    return result;
  }, []);

  // Module 3 — validate a GitHub token (GET /user). On success the backend has
  // written GITHUB_TOKEN to .env; flip the connected flag and keep the login.
  const validateGithubToken = useCallback(async (token) => {
    const result = await postValidateGithubToken({ token });
    if (result.ok) {
      dispatch({
        type: 'SET_GITHUB_STATUS',
        connected: true,
        login: result.login,
      });
    }
    return result;
  }, []);

  // Module 3 — fetch a PR via the backend and, on success, add it as the active
  // source + show it in the panel. Returns the result so the dialog can block
  // on failure.
  const fetchAndAddPr = useCallback(async (url) => {
    const result = await fetchPullRequest(url);
    if (result.ok && result.pr) {
      dispatch({ type: 'SET_PR_SOURCE', url, pr: result.pr });
    }
    return result;
  }, []);

  // Module 4 — build the analyzer's `files` payload from a fetched PR.
  const prFilesPayload = (pr) =>
    (pr?.files ?? []).map((f) => ({
      path: f.filename,
      content: f.content ?? null,
      patch: f.patch ?? null,
    }));

  // Module 4/5 — run a real analysis and route the result into chat + panel.
  // `withContent` sends the PR file blobs; follow-ups pass false so only the
  // conversation history + the new question go to the LLM (cheaper).
  const runAnalysis = useCallback(
    async ({ prompt, label, instruction, withContent = false }) => {
      const s = stateRef.current;
      const isPr = s.activeSourceType === 'pr' && !!s.sources.pr?.pr;
      const isLocal = s.activeSourceType === 'local' && !!s.sources.local;

      if (!isPr && !isLocal) {
        dispatch({
          type: 'ANALYZE_ERROR',
          error: 'Add a pull request or a file first (use the “+” button).',
        });
        return;
      }

      const history = s.messages
        .filter((m) => typeof m.text === 'string' && m.text.length > 0)
        .map((m) => ({ role: m.role, text: m.text }));

      dispatch({ type: 'ANALYZE_START', prompt, label });

      const result = await postAnalyze({
        provider: s.provider,
        model: s.model,
        instruction,
        files: withContent && isPr ? prFilesPayload(s.sources.pr.pr) : [],
        history,
      });

      if (result.ok) {
        dispatch({ type: 'ANALYZE_RESULT', result });
      } else {
        dispatch({
          type: 'ANALYZE_ERROR',
          error: result.error || 'The analysis request failed.',
        });
      }
    },
    []
  );

  const analyzePr = useCallback(
    () =>
      // No `instruction` here on purpose: the default analysis prompt is
      // authored in the C# backend (CodeAnalyzer.cs), not in React.
      runAnalysis({
        prompt: 'Analyse this PR',
        label: 'Analyzing the pull request…',
        withContent: true,
      }),
    [runAnalysis]
  );

  // Module 5 — validate a local file path on the backend and route it to the
  // LLM. Returns { ok } so SourceDialog can stay open on a validation failure.
  const reviewLocalFile = useCallback(async (path) => {
    const s = stateRef.current;
    const result = await postFileReview({
      path,
      provider: s.provider,
      model: s.model,
    });

    if (!result.ok) {
      return { ok: false, error: result.error || 'The file could not be reviewed.' };
    }

    dispatch({
      type: 'FILE_REVIEWED',
      path,
      kind: result.kind,
      message: result.message,
      analysis: result.kind === 'review' ? result.analysis : null,
    });
    return { ok: true };
  }, []);

  const sendMessage = useCallback(
    (rawText) => {
      const text = rawText.trim();
      if (!text) return;

      const s = stateRef.current;

      // With a PR or a reviewed file active, sends are real follow-up analysis
      // calls (history only — the file/PR blob is not re-sent).
      const prActive = s.activeSourceType === 'pr' && s.sources.pr?.pr;
      const fileActive = s.activeSourceType === 'local' && s.sources.local;
      if (prActive || fileActive) {
        runAnalysis({
          prompt: text,
          label: 'Analyzing…',
          instruction: text,
          withContent: false,
        });
        return;
      }

      // Otherwise keep the Module 1 canned-reply simulation.
      dispatch({ type: 'USER_SEND', text });

      const index = Math.min(replyCursor.current, cannedReplies.length - 1);
      replyCursor.current += 1;
      const reply = cannedReplies[index];

      if (cancelRef.current) cancelRef.current();
      cancelRef.current = runSendSimulation({
        statusMessages,
        reply,
        onStatusStep: (i) => dispatch({ type: 'STATUS_STEP', index: i }),
        onComplete: (r) => {
          cancelRef.current = null;
          dispatch({ type: 'ASSISTANT_REPLY', reply: r });
        },
      });
    },
    [runAnalysis]
  );

  const actions = useMemo(
    () => ({
      sendMessage,
      setModel: (model) => dispatch({ type: 'SET_MODEL', model }),
      setProvider: (provider) => dispatch({ type: 'SET_PROVIDER', provider }),
      setSource: (sourceType, value) =>
        dispatch({ type: 'SET_SOURCE', sourceType, value }),
      setActiveSource: (sourceType) =>
        dispatch({ type: 'SET_ACTIVE_SOURCE', sourceType }),
      expandPanel: () => dispatch({ type: 'EXPAND_PANEL' }),
      collapsePanel: () => dispatch({ type: 'COLLAPSE_PANEL' }),
      togglePanel: () => dispatch({ type: 'TOGGLE_PANEL' }),
      validateKey,
      refreshKeyStatus,
      validateGithubToken,
      fetchAndAddPr,
      analyzePr,
      reviewLocalFile,
      showPr: () => dispatch({ type: 'SHOW_PR' }),
      showSuggestions: (suggestions) =>
        dispatch({ type: 'SHOW_SUGGESTIONS', suggestions }),
    }),
    [
      sendMessage,
      validateKey,
      refreshKeyStatus,
      validateGithubToken,
      fetchAndAddPr,
      analyzePr,
      reviewLocalFile,
    ]
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return ctx;
}
