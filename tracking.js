// ─── BES ANALYTICS + campaign attribution ───────────────────────────────────
// Shared across every page. Previously duplicated inline, byte-for-byte,
// into 21 separate HTML files — which is exactly how the "14 reviews" vs
// "15 reviews" drift happened elsewhere on this site: one copy gets updated,
// the other 20 don't. One file now; every page just references it.
(function() {
  var ENDPOINT = 'https://bes.myheadquarters.app/pub/track';

  // Page identifier derived from the URL itself instead of hardcoded per
  // file — 'home' for the root, 'news/some-article' for an article, etc.
  // Matches the identifiers every page used before (verified against the
  // old hardcoded PAGE values on 2026-09-30), so existing Portal Analytics
  // history stays comparable.
  var PAGE = (function() {
    var p = location.pathname.replace(/^\//, '').replace(/\.html$/, '');
    return (p === '' || p === 'index') ? 'home' : p;
  })();

  function getSession() {
    var s = sessionStorage.getItem('_bes_sid');
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('_bes_sid', s); }
    return s;
  }

  // Google/LSA campaign params, captured once per visit from whichever page
  // the click actually lands on, then persisted in sessionStorage so they
  // survive navigating to another page before enquiring — a paid click that
  // lands on a town page, then clicks through to the homepage to submit the
  // enquiry, still gets attributed correctly instead of losing it at the
  // first internal link.
  function getCampaign() {
    var params = new URLSearchParams(location.search);
    var fresh = {};
    ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function(k) {
      var v = params.get(k);
      if (v) fresh[k] = v.slice(0, 200);
    });
    if (Object.keys(fresh).length) {
      sessionStorage.setItem('_bes_campaign', JSON.stringify(fresh));
      return fresh;
    }
    var stored = sessionStorage.getItem('_bes_campaign');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { return {}; }
    }
    return {};
  }

  function send(payload) {
    payload.session_id = getSession();
    payload.page = PAGE;
    var campaign = getCampaign();
    for (var k in campaign) { if (!(k in payload)) payload[k] = campaign[k]; }
    navigator.sendBeacon ? navigator.sendBeacon(ENDPOINT, JSON.stringify(payload))
      : fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, keepalive: true });
  }

  // Exposed so a page's own contact-form script (see contact-form.js) can
  // fire a distinct "enquiry_sent" event only on confirmed success — a
  // generic 'submit' listener alone can't tell a real send apart from an
  // attempt the client-side validation just blocked — and so it can attach
  // the same captured campaign data to the actual lead sent to the CRM, not
  // just this anonymous analytics event.
  window.__besTrack = send;
  window.__besCampaign = getCampaign;

  document.addEventListener('DOMContentLoaded', function() {
    send({ event_type: 'pageview', referrer: document.referrer });
  });

  document.addEventListener('click', function(e) {
    var el = e.target.closest('a,button');
    if (!el) return;
    var label = (el.id || el.innerText || el.getAttribute('href') || '').trim().slice(0, 100);
    send({ event_type: 'click', element: label });
  }, true);

  // Scoped to the actual enquiry form only — power-cuts.html also has a
  // postcode-search form (#pcSearchForm) on the same page, which bubbles a
  // submit event too. A generic unscoped listener here would mislabel every
  // postcode check as a 'contact-form' submission, polluting the
  // form_submit-vs-enquiry_sent abandonment-rate metric with submits that
  // were never a real enquiry attempt.
  document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'contactForm') {
      send({ event_type: 'form_submit', element: 'contact-form' });
    }
  });

  var scrollFired = {};
  window.addEventListener('scroll', function() {
    var pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    [25, 50, 75, 100].forEach(function(d) {
      if (pct >= d && !scrollFired[d]) { scrollFired[d] = true; send({ event_type: 'scroll', scroll_depth: d }); }
    });
  }, { passive: true });
})();
