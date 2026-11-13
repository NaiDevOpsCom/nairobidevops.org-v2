/* eslint-env browser */
/**
 * Consent-gated Google Analytics.
 *
 * - Nothing from Google is requested until the visitor presses Accept.
 * - The decision lives in localStorage, so one banner covers the React site
 *   and the Django job pages (same origin, same file).
 * - Decline and Accept carry equal weight. Consent can be changed later with
 *   window.ndcConsent.open() (wired to the "open cookie settings" control in the privacy policy).
 * - No inline scripts: the CSP allows inline styles but not inline scripts.
 */
(function () {
  const GA_ID = "G-EKW7WYG510";
  const GA_HOSTS = ["nairobidevops.org"];
  // The banner also shows on staging so it can be tested; GA never loads there.
  const BANNER_HOSTS = [...GA_HOSTS, "staging.nairobidevops.org"];
  const STORAGE_KEY = "ndc_analytics_consent";
  const PRIVACY_PATH = "/privacy";

  const host = window.location.hostname;
  if (!BANNER_HOSTS.includes(host)) return;
  const gaAllowedHere = GA_HOSTS.includes(host);

  // ── Storage (may throw in private modes, so every access is guarded) ──────
  function readDecision() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && (parsed.value === "granted" || parsed.value === "denied")
        ? parsed.value
        : null;
    } catch {
      return null;
    }
  }

  function saveDecision(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, at: Date.now() }));
    } catch {
      /* Storage unavailable: the choice applies to this page view only. */
    }
  }

  // ── Google Analytics ───────────────────────────────────────────────────────
  let gaLoaded = false;

  function loadAnalytics() {
    if (!gaAllowedHere) return;
    window["ga-disable-" + GA_ID] = false;
    if (gaLoaded) return;
    gaLoaded = true;

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(script);

    gtag("js", new Date());
    gtag("config", GA_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  function expireGaCookies() {
    const domains = [host, "." + host];
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0].trim();
      if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
        domains.forEach((domain) => {
          document.cookie =
            name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + domain;
        });
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      }
    });
  }

  function stopAnalytics() {
    window["ga-disable-" + GA_ID] = true;
    expireGaCookies();
  }

  function apply(value) {
    if (value === "granted") loadAnalytics();
    else stopAnalytics();
  }

  // ── Banner ─────────────────────────────────────────────────────────────────
  const BANNER_ID = "ndc-consent-banner";
  let themeObserver = null;
  let themeMediaQuery = null;
  let themeMediaListener = null;

  function isDark() {
    return (
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  function applyBannerTheme(root) {
    const target = root || document.getElementById(BANNER_ID);
    if (!target) return;
    const dark = isDark();
    target.style.setProperty("--ndc-bg", dark ? "#18181b" : "#ffffff");
    target.style.setProperty("--ndc-fg", dark ? "#fafafa" : "#18181b");
    target.style.setProperty("--ndc-border", dark ? "#3f3f46" : "#d4d4d8");
  }

  function stopBannerThemeSync() {
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }
    if (themeMediaQuery && themeMediaListener) {
      if (themeMediaQuery.removeEventListener) {
        themeMediaQuery.removeEventListener("change", themeMediaListener);
      } else if (themeMediaQuery.removeListener) {
        themeMediaQuery.removeListener(themeMediaListener);
      }
    }
    themeMediaQuery = null;
    themeMediaListener = null;
  }

  function startBannerThemeSync() {
    stopBannerThemeSync();
    if (typeof MutationObserver !== "undefined") {
      themeObserver = new MutationObserver(() => applyBannerTheme());
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    if (window.matchMedia) {
      themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      themeMediaListener = () => applyBannerTheme();
      if (themeMediaQuery.addEventListener) {
        themeMediaQuery.addEventListener("change", themeMediaListener);
      } else if (themeMediaQuery.addListener) {
        themeMediaQuery.addListener(themeMediaListener);
      }
    }
  }

  function injectStyles() {
    if (document.getElementById(BANNER_ID + "-style")) return;
    const style = document.createElement("style");
    style.id = BANNER_ID + "-style";
    style.textContent = [
      "#" + BANNER_ID + "{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;",
      "padding:16px;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}",
      "#" + BANNER_ID + " .ndc-box{max-width:720px;margin:0 auto;padding:16px 20px;",
      "border-radius:10px;border:1px solid var(--ndc-border);background:var(--ndc-bg);",
      "color:var(--ndc-fg);box-shadow:0 8px 30px rgba(0,0,0,.25);}",
      "#" + BANNER_ID + " p{margin:0 0 12px;}",
      "#" + BANNER_ID + " a{color:inherit;text-decoration:underline;}",
      "#" + BANNER_ID + " .ndc-actions{display:flex;gap:10px;flex-wrap:wrap;}",
      "#" + BANNER_ID + " button{flex:1 1 140px;min-height:40px;padding:8px 16px;",
      "border-radius:8px;border:1px solid var(--ndc-fg);background:transparent;",
      "color:var(--ndc-fg);font:inherit;font-weight:600;cursor:pointer;}",
      "#" + BANNER_ID + " button:hover{background:var(--ndc-fg);color:var(--ndc-bg);}",
      "#" + BANNER_ID + " a:focus-visible,#" + BANNER_ID + " button:focus-visible{",
      "outline:2px solid var(--ndc-fg);outline-offset:2px;}",
    ].join("");
    document.head.appendChild(style);
  }

  function closeBanner() {
    const existing = document.getElementById(BANNER_ID);
    if (existing) existing.remove();
    stopBannerThemeSync();
  }

  function choose(value) {
    saveDecision(value);
    apply(value);
    closeBanner();
  }

  function makeButton(label, value) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => choose(value));
    return button;
  }

  function openBanner() {
    if (document.getElementById(BANNER_ID)) return;
    injectStyles();

    const root = document.createElement("div");
    root.id = BANNER_ID;
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Analytics cookie choice");
    applyBannerTheme(root);

    const box = document.createElement("div");
    box.className = "ndc-box";

    const text = document.createElement("p");
    text.append(
      "We use Google Analytics to see which pages are useful. It sets cookies only if you accept. " +
        "Declining changes nothing about how the site works. "
    );
    const link = document.createElement("a");
    link.href = PRIVACY_PATH;
    link.textContent = "Read the privacy policy";
    text.appendChild(link);
    text.append(".");

    const actions = document.createElement("div");
    actions.className = "ndc-actions";
    actions.append(makeButton("Decline", "denied"), makeButton("Accept", "granted"));

    box.append(text, actions);
    root.appendChild(box);
    document.body.appendChild(root);
    startBannerThemeSync();
  }

  // Public hook for the privacy policy's "open cookie settings" control.
  window.ndcConsent = {
    open: openBanner,
    status: readDecision,
  };

  // ── Start ──────────────────────────────────────────────────────────────────
  function start() {
    const decision = readDecision();
    if (decision === null) {
      stopAnalytics();
      openBanner();
    } else {
      apply(decision);
    }
  }

  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) return;
    let decision = null;
    try {
      const parsed = event.newValue ? JSON.parse(event.newValue) : null;
      decision =
        parsed && (parsed.value === "granted" || parsed.value === "denied") ? parsed.value : null;
    } catch {
      decision = null;
    }

    if (decision === "granted") {
      apply("granted");
      closeBanner();
    } else if (decision === "denied") {
      apply("denied");
      closeBanner();
    } else {
      stopAnalytics();
      openBanner();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
