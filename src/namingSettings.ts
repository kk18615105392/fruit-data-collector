import { NAMING_SETTINGS_KEY } from './constants';
import { DEFAULT_NAMING_SETTINGS } from './naming';
import type { NamingSettings } from './types';

export function loadNamingSettings(): NamingSettings {
  try {
    const raw = localStorage.getItem(NAMING_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_NAMING_SETTINGS };
    const parsed = JSON.parse(raw) as NamingSettings;
    return {
      ...DEFAULT_NAMING_SETTINGS,
      ...parsed,
      fields: Array.isArray(parsed.fields) && parsed.fields.length > 0 ? parsed.fields : DEFAULT_NAMING_SETTINGS.fields,
    };
  } catch {
    return { ...DEFAULT_NAMING_SETTINGS };
  }
}

export function saveNamingSettings(settings: NamingSettings): void {
  localStorage.setItem(NAMING_SETTINGS_KEY, JSON.stringify(settings));
}
