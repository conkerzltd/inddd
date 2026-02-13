/**
 * Locale layout — Arabic only. Sets dir=rtl and lang=ar.
 * Kept for compatibility but no longer handles /en prefix.
 */
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

const LocaleLayout = () => {
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, []);

  return <Outlet />;
};

export default LocaleLayout;
