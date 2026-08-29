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

const DEFAULT_PROVIDER = 'openrouter';
import { runSendSimulation } from '../lib/sendSimulator.js';
import { getKeyStatus, postValidateKey } from '../lib/keysApi.js';

const initialState = {
  messages: [],
  status: 'idle', // 'idle' | 'pending'
  pendingStatusIndex: 0,
  // Active LLM provider. Drives the model dropdown list below and which key the
  // Connect API popup targets.
  provider: DEFAULT_PROVIDER, // 'openrouter' | 'openai'
  model: providerModels[DEFAULT_PROVIDER][0],
  models: providerModels[DEFAULT_PROVIDER],
  sources: {
    pr: null, // { value: string } | null
    local: null, // { value: string } | null
  },
  activeSourceType: null, // 'pr' | 'local' | null
  panel: {
    expanded: false,
    code: null, // { filename, language, content } | null
  },
  // Module 2 — LLM API key connection state. Sourced from the C# backend
  // (GET /api/keys/status on load, POST /api/keys/validate on connect).
  providers: {
    openai: { connected: false },
    openrouter: { connected: false },
  },
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
          ? { expanded: true, code: reply.code }
          : state.panel,
      };
    }

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

    default:
      return state;
  }
}

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const replyCursor = useRef(0);
  const cancelRef = useRef(null);

  // Clean up any in-flight fake request on unmount.
  useEffect(
    () => () => {
      if (cancelRef.current) cancelRef.current();
    },
    []
  );

  // Module 2 — pull saved key status from the backend once on load. If the
  // backend is down, both providers just stay disconnected.
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

  const sendMessage = useCallback((rawText) => {
    const text = rawText.trim();
    if (!text) return;

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
  }, []);

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
    }),
    [sendMessage, validateKey, refreshKeyStatus]
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
