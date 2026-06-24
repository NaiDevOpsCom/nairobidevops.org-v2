/* eslint-env browser */
(function () {
  const PROD_DOMAIN = "nairobidevops.org";
  if (window.location.hostname !== PROD_DOMAIN) {
    console.warn("Google Analytics disabled for domain:", window.location.hostname);
    return;
  }

  const ga = document.createElement("script");
  ga.async = true;
  ga.src = "https://www.googletagmanager.com/gtag/js?id=G-EKW7WYG510";
  document.head.appendChild(ga);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", "G-EKW7WYG510");
})();
