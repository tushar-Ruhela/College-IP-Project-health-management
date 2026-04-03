// Local storage utilities for managing app state

export const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: 'onboarding_complete',
  USER_INFO: 'user_info',
  HEALTH_ASSESSMENT_COMPLETE: 'health_assessment_complete',
  HEALTH_DATA: 'health_data',
} as const;

export function getStorageItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

