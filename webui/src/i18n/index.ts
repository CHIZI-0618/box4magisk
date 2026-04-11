import { useSyncExternalStore } from 'react';

export type Locale = 'en' | 'ru' | 'zh';

type Dict = Record<string, string>;
type Params = Record<string, string | number>;

import { en } from './en';
import { ru } from './ru';
import { zh } from './zh';

const STORAGE_KEY = 'box4magisk.locale';
const FALLBACK_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, Dict> = {
  en,
  ru,
  zh,
};

let currentLocale: Locale = FALLBACK_LOCALE;
const warnedKeys = new Set<string>();
const listeners = new Set<() => void>();

function normalizeLocale(input?: string | null): Locale | null {
  if (!input) return null;
  const normalized = input.toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('zh')) return 'zh';
  return null;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function getPreferredLocale(): Locale {
  const stored = normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
  if (stored) return stored;

  const system = normalizeLocale(window.navigator.language);
  if (system) return system;

  return FALLBACK_LOCALE;
}

export function setLocale(locale: string): Locale {
  const next = normalizeLocale(locale) ?? FALLBACK_LOCALE;
  if (next === currentLocale) return currentLocale;
  currentLocale = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach(listener => listener());
  return currentLocale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function initLocale(): Locale {
  return setLocale(getPreferredLocale());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, getLocale);
}

export function t(key: string, params?: Params): string {
  const localized = dictionaries[currentLocale]?.[key];
  if (localized) return interpolate(localized, params);

  const fallback = dictionaries[FALLBACK_LOCALE]?.[key];
  if (fallback) {
    if (import.meta.env.DEV && !warnedKeys.has(key)) {
      warnedKeys.add(key);
      console.warn(`[i18n] Missing key "${key}" in locale "${currentLocale}", falling back to "${FALLBACK_LOCALE}".`);
    }
    return interpolate(fallback, params);
  }

  if (import.meta.env.DEV && !warnedKeys.has(key)) {
    warnedKeys.add(key);
    console.warn(`[i18n] Missing key "${key}" in locale "${currentLocale}" and fallback "${FALLBACK_LOCALE}".`);
  }

  return key;
}
