"use client";

import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, [key]);

  const setStoredValue = (newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // ignore storage errors
      }
      return resolved;
    });
  };

  return [value, setStoredValue, hydrated] as const;
}
