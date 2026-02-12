import type { Locale } from "./locale";

/**
 * Prefix a path with /en when the active locale is English.
 * Avoids double-prefixing if the path already starts with /en.
 */
export function withLocalePath(locale: Locale, path: string): string {
  if (locale === "en") {
    if (path === "/en" || path.startsWith("/en/")) return path;
    return `/en${path.startsWith("/") ? "" : "/"}${path}`;
  }
  return path;
}
