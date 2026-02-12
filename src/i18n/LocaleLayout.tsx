import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getLocaleFromPathname, getDirection } from "./locale";

const LocaleLayout = () => {
  const { pathname } = useLocation();
  const locale = getLocaleFromPathname(pathname);
  const dir = getDirection(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  return <Outlet />;
};

export default LocaleLayout;
