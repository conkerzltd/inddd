import { useLocation } from "react-router-dom";
import { getLocaleFromPathname, type Locale } from "./locale";
import { withLocalePath } from "./paths";

export function useLocale() {
  const { pathname } = useLocation();
  const locale: Locale = getLocaleFromPathname(pathname);

  const localePath = (path: string) => withLocalePath(locale, path);

  return { locale, localePath };
}
