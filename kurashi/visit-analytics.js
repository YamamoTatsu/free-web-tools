/* Metricool website analytics: records page visits/referrer, never diagnostic form values.
   Only loaded on /kurashi/ product-size-check pages; not on the word counter.
   Traffic is not equivalent to a purchase or an affiliate CTA click.
   Brand tracking identifier is a public client-side tag, not a credential.
*/
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (new URLSearchParams(window.location.search).has("internal_preview")) return;
  var script = document.createElement("script");
  script.src = "https://tracker.metricool.com/resources/be.js";
  script.async = true;
  script.onload = function () {
    if (window.beTracker && typeof window.beTracker.t === "function") {
      window.beTracker.t({hash: "a6ab60825f84f7a989529e99f78404d0"});
    }
  };
  document.head.appendChild(script);
})();
