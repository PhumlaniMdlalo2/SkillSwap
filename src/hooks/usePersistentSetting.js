import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// useState-shaped hook backed by AsyncStorage, for app settings that must
// survive a restart. The stored value is read once on mount; until it lands
// the default is shown, and a load finishing late never clobbers a change
// the user has already made. Writes are fire-and-forget.
export function usePersistentSetting(key, defaultValue) {
  const [value, setValueState] = useState(defaultValue);
  const valueRef = useRef(defaultValue);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (cancelled || loadedRef.current || raw == null) return;
        const stored = JSON.parse(raw);
        valueRef.current = stored;
        setValueState(stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  const setValue = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(valueRef.current) : next;
      loadedRef.current = true;
      valueRef.current = resolved;
      setValueState(resolved);
      AsyncStorage.setItem(key, JSON.stringify(resolved)).catch(() => {});
    },
    [key],
  );

  return [value, setValue];
}

export default usePersistentSetting;
