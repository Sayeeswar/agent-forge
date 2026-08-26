import { useState, useEffect } from 'react';

const STORAGE_KEY = 'learningApp.profile';

export function useLearnerProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setProfile(JSON.parse(raw));
      } catch {
        // ignore corrupt storage, start blank
      }
    }
  }, []);

  function saveProfile(next) {
    setProfile(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return [profile, saveProfile];
}
