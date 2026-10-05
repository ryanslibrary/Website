// ─── BES CONTACT FORM ────────────────────────────────────────────────────────
// Shared submit handler for every page's #contactForm. Extracted from what
// used to be a near-identical inline copy on each page that has a form
// (previously index.html and power-cuts.html only) — now also used by the
// town landing pages' own on-page forms, so a paid click that lands on
// /electrician-sevenoaks.html can enquire without being bounced back to the
// homepage first.
//
// Requires tracking.js to run first (for window.__besTrack / __besCampaign)
// — load this script tag after it.
(function() {
  var form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('submitBtn');
    var errEl = document.getElementById('form-error');

    var required = form.querySelectorAll('[required]');
    var missing = false;
    required.forEach(function(el) {
      if (!el.value.trim()) { el.style.borderColor = '#dc2626'; missing = true; }
      else { el.style.borderColor = ''; }
    });
    if (missing) {
      errEl.textContent = 'Please fill in all required fields.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    btn.disabled = true;
    btn.textContent = 'Sending…';

    var payload = {
      name:     form.name.value.trim(),
      email:    form.email.value.trim(),
      phone:    form.phone.value.trim(),
      address:  form.address.value.trim(),
      address2: form.address2.value.trim(),
      city:     form.city.value.trim(),
      postcode: form.postcode.value.trim(),
      service:  form.service.value,
      message:  form.message.value.trim(),
    };
    // Campaign attribution (gclid/UTM), captured on landing and persisted
    // for the visit — see tracking.js. Lets a Google/LSA-driven lead be
    // told apart from an organic one once it reaches the CRM.
    if (window.__besCampaign) {
      var campaign = window.__besCampaign();
      for (var k in campaign) { payload[k] = campaign[k]; }
    }

    try {
      var r = await fetch('https://bes.myheadquarters.app/pub/webhook/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        // Portal link is handed back directly in the response (same as the
        // van QR code enquiry flow) rather than only ever arriving by
        // email — that depended on the confirmation email actually being
        // configured and landing, which isn't guaranteed (spam filters,
        // etc.). Shown immediately here whenever the backend returns one.
        var data = null;
        try { data = await r.json(); } catch (e) { /* still a success either way */ }
        form.style.display = 'none';
        document.getElementById('form-success').style.display = 'block';
        var portalLink = document.getElementById('form-success-portal-link');
        if (data && data.portal_url && portalLink) {
          portalLink.href = data.portal_url;
          document.getElementById('form-success-portal').style.display = 'block';
        }
        if (window.__besTrack) window.__besTrack({ event_type: 'enquiry_sent', element: 'contact-form' });
      } else {
        throw new Error('Server error ' + r.status);
      }
    } catch (err) {
      errEl.textContent = 'Something went wrong — please call us on 07886 067085 or try again.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Send Enquiry';
    }
  });
})();
