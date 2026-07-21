export const AUTH_STORAGE_KEY = "finguard_user";
export const AUTH_TOKEN_KEY = "finguard_token";
export const LANGUAGE_STORAGE_KEY = "finguard_language";
export const COOKIE_CONSENT_STORAGE_KEY = "finguard_cookie_consent";

export function getStorageItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStorageItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing or locked-down embeds.
  }
}

export function removeStorageItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures; in-memory state is still cleared.
  }
}
