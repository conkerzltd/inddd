export type Locale = "en" | "ar";

export function getLocaleFromPathname(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ar";
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "en" ? "ltr" : "rtl";
}
