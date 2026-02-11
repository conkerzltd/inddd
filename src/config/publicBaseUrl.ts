const ENV_BASE = (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined)?.trim();

export const PUBLIC_BASE_URL = (() => {
  if (ENV_BASE) return ENV_BASE.replace(/\/$/, "");

  const origin = window.location.origin.replace(/\/$/, "");
  const host = window.location.hostname;

  const isLovable =
    /lovableproject\.com$/i.test(host) ||
    /(^|\.)lovable\.dev$/i.test(host);

  if (isLovable) return "https://inddd.com";
  return origin;
})();
