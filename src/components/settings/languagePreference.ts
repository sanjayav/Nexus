import i18n from '../../i18n'
import { toAppLocale, userLocale, type AppLocale, type UserLocaleResponse } from '../../lib/api'

export const UI_LANGUAGES: Array<{ code: AppLocale; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '简体中文' },
  { code: 'th', label: 'ไทย' },
]

/** Fired after the server-side preference changes so open views can refresh. */
export const USER_LOCALE_EVENT = 'nexus:user-locale'

/**
 * Switch the UI language and save it on the server (users.locale) so emails,
 * IM notifications and anomaly headlines follow. The UI switch never waits on
 * the network; a failed save resolves to null and is reported by the caller.
 */
export async function setUiLanguage(code: string): Promise<UserLocaleResponse | null> {
  void i18n.changeLanguage(code)
  try {
    const r = await userLocale.set(toAppLocale(code))
    window.dispatchEvent(new CustomEvent(USER_LOCALE_EVENT, { detail: r }))
    return r
  } catch {
    return null
  }
}

/** Clear the saved preference (server falls back to browser / organisation market). */
export async function clearUiLanguagePreference(): Promise<UserLocaleResponse> {
  const r = await userLocale.set(null)
  window.dispatchEvent(new CustomEvent(USER_LOCALE_EVENT, { detail: r }))
  return r
}
