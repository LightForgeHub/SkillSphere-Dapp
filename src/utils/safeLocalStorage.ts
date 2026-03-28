/**
 * Safe localStorage wrapper that checks for window availability
 * to prevent "localStorage.getItem is not a function" errors
 * in server-side rendering (SSR) environments.
 */

export const safeLocalStorage = {
  get: (key: string): string | null => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error(`Error reading localStorage key "${key}":`, e);
        return null;
      }
    }
    return null;
  },

  set: (key: string, value: string): void => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error(`Error setting localStorage key "${key}":`, e);
      }
    }
  },

  remove: (key: string): void => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Error removing localStorage key "${key}":`, e);
      }
    }
  },

  clear: (): void => {
    if (typeof window !== "undefined") {
      try {
        localStorage.clear();
      } catch (e) {
        console.error("Error clearing localStorage:", e);
      }
    }
  },
};
