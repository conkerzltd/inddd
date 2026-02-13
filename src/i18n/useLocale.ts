export type Locale = "ar";

/**
 * Locale hook — Arabic only (English routes removed).
 * Kept as a compatibility shim so existing components don't break.
 */
export function useLocale() {
  const locale: string = "ar";
  const localePath = (path: string) => path;
  return { locale, localePath };
}
