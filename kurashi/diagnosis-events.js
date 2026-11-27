'use strict';
/* Diagnosis funnel events for the /kurashi/ size-check tools.
   Sends interaction events to the owner's existing GA4 property (the same
   measurement ID the blog uses via Hatena's analytics setting), so the
   article -> diagnosis -> comparison funnel is visible in one property.
   Privacy contract:
   - NEVER sends form values (measurements), free text, or identifiers.
   - Only whitelisted parameters leave the page (see sanitizeParams).
   - diagnosis_start / diagnosis_complete fire at most once per page view;
     click events fire per click so outbound intent is counted honestly.
   - Skipped for internal previews (?internal_preview) and Do Not Track.
*/
var KURASHI_MEASUREMENT_ID = 'G-QYQK8W9875';
var KURASHI_EVENT_NAMES = ['diagnosis_start', 'diagnosis_complete', 'comparison_click', 'affiliate_click'];

function kurashiSanitizeParams(input) {
  var clean = {};
  if (!input || typeof input !== 'object') return clean;
  if (typeof input.product === 'string' && /^[a-z0-9_-]{1,32}$/.test(input.product)) clean.product = input.product;
  if (typeof input.placement === 'string' && /^[a-z0-9_-]{1,32}$/.test(input.placement)) clean.placement = input.placement;
  if (Array.isArray(input.candidates)) {
    var ids = input.candidates.filter(function (id) { return typeof id === 'string' && /^[a-z0-9_-]{1,32}$/.test(id); });
    if (ids.length) clean.candidates = ids.join(',');
  }
  if (Number.isFinite(input.candidate_count)) clean.candidate_count = input.candidate_count;
  if (typeof input.via_example === 'boolean') clean.via_example = input.via_example;
  return clean;
}

function kurashiCreateTracker(send, pageId) {
  var fired = {};
  var exampleUsed = false;
  return {
    markExampleUsed: function () { exampleUsed = true; },
    track: function (name, params) {
      if (KURASHI_EVENT_NAMES.indexOf(name) === -1) return false;
      if (name === 'diagnosis_start' || name === 'diagnosis_complete') {
        if (fired[name]) return false;
        fired[name] = true;
      }
      var clean = kurashiSanitizeParams(params);
      clean.diagnosis_page = pageId;
      if (name === 'diagnosis_complete' && clean.via_example === undefined) clean.via_example = exampleUsed;
      send(name, clean);
      return true;
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sanitizeParams: kurashiSanitizeParams, createTracker: kurashiCreateTracker, EVENT_NAMES: KURASHI_EVENT_NAMES, MEASUREMENT_ID: KURASHI_MEASUREMENT_ID };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  (function () {
    if (new URLSearchParams(window.location.search).has('internal_preview')) return;
    if (window.navigator && window.navigator.doNotTrack === '1') return;
    var pageId = window.location.pathname.indexOf('smartwagon-fit') !== -1 ? 'smartwagon_fit' : 'rack_fit';
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + KURASHI_MEASUREMENT_ID;
    document.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', KURASHI_MEASUREMENT_ID);
    var tracker = kurashiCreateTracker(function (name, params) { window.gtag('event', name, params); }, pageId);
    window.kurashiTrack = tracker.track;

    var form = document.getElementById('fit-form');
    if (form) {
      var start = function () { tracker.track('diagnosis_start', {}); };
      form.addEventListener('input', start);
      form.addEventListener('submit', start);
    }
    var example = document.getElementById('example');
    if (example) example.addEventListener('click', function () { tracker.markExampleUsed(); tracker.track('diagnosis_start', {}); });

    document.addEventListener('click', function (event) {
      var node = event.target;
      var anchor = node && node.closest ? node.closest('a') : null;
      if (!anchor || !anchor.href) return;
      if (anchor.dataset && anchor.dataset.affiliateProduct) {
        tracker.track('affiliate_click', { product: anchor.dataset.affiliateProduct, placement: 'result_card' });
        return;
      }
      if (anchor.href.indexOf('kurashi-sunpo.hatenablog.com/entry/') !== -1) {
        var params = { placement: (anchor.dataset && anchor.dataset.trackPlacement) || 'page_link' };
        if (anchor.dataset && anchor.dataset.comparisonProduct) params.product = anchor.dataset.comparisonProduct;
        tracker.track('comparison_click', params);
      }
    });
  })();
}
