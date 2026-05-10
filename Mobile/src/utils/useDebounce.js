import { useState, useEffect } from "react";

/**
 * Debounces a value by the given delay (default 300ms).
 * Use this to prevent API calls on every keystroke in search inputs.
 *
 * @param {any} value - The value to debounce (e.g. searchQuery state)
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {any} - The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes before delay expires
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
