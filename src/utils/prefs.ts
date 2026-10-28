import { useCallback, useEffect, useState } from 'react';

/** A value saved in the phone's localStorage, kept in sync between components */
export function useLocalPref<T>(key: string, initial: T): [T, (v: T) => void] {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  };
  const [value, setValue] = useState<T>(read);

  const set = useCallback((next: T) => {
    setValue(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent('tb-pref', { detail: key }));
  }, [key]);

  useEffect(() => {
    const onChange = (e: Event) => { if ((e as CustomEvent).detail === key) setValue(read()); };
    window.addEventListener('tb-pref', onChange);
    return () => window.removeEventListener('tb-pref', onChange);
  }, [key]);

  return [value, set];
}
