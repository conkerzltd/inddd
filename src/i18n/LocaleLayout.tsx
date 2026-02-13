/**
 * Locale layout — Arabic only. Sets dir=rtl and lang=ar.
 * Runtime enforcer so future changes don't break RTL.
 */
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

const LocaleLayout = () => {
  useEffect(() => {
    const html = document.documentElement;
    html.lang = "ar";
    html.dir = "rtl";
  }, []);

  return <Outlet />;
};

export default LocaleLayout;
