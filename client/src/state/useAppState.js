import { useReducer, useEffect } from 'react';
import { topicsReducer, initialState } from './topicsReducer.js';

const STORAGE_KEY = 'learningApp.state';

export function useAppState() {
  const [state, dispatch] = useReducer(topicsReducer, initialState);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        dispatch({ type: 'HYDRATE', state: JSON.parse(raw) });
      } catch {
        // ignore corrupt storage, start fresh
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return [state, dispatch];
}
