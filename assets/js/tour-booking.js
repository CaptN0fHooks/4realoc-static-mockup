// tour-booking.js
// This file controls the "Book a Tour with Mike" modal on search.html.
//
// Simple idea:
// - Another script (like search-results.js) will call window.openTourModal({ listing_id, listing_address })
// - That fills in the form and shows the popup.
// - User can close it with the X or clicking the backdrop.
// - For now, submitting the form just shows a success message (no backend yet).

(function () {
  var backdrop = document.getElementById('tour-modal-backdrop');
  var closeBtn = document.getElementById('tour-modal-close');
  var form = document.getElementById('tour-form');
  var listingIdInput = document.getElementById('tour-listing-id');
  var listingAddressInput = document.getElementById('tour-listing-address');
  var listingLabel = document.getElementById('tour-listing-label');
  var statusEl = document.getElementById('tour-status');
  var submitBtn = document.getElementById('tour-submit-btn');

  // If this page doesn't have the modal, quietly do nothing.
  if (!backdrop || !form) {
    return;
  }

  // Open the modal with details from a specific listing.
  function openTourModal(options) {
    var listingId = (options && options.listing_id) || '';
    var listingAddress =
      (options && options.listing_address) || 'Selected Property';

    listingIdInput.value = listingId;
    listingAddressInput.value = listingAddress;
    listingLabel.textContent = 'For: ' + listingAddress;

    statusEl.textContent = '';
    backdrop.style.display = 'flex';
  }

  // Close/hide the modal.
  function closeTourModal() {
    backdrop.style.display = 'none';
  }

  // Expose this so other scripts can call it.
  window.openTourModal = openTourModal;

  // X button closes modal
  if (closeBtn) {
    closeBtn.addEventListener('click', closeTourModal);
  }

  // Click outside the modal closes it
  backdrop.addEventListener('click', function (event) {
    if (event.target === backdrop) {
      closeTourModal();
    }
  });

  // Handle form submit (temporary behavior)
  form.addEventListener('submit', function (event) {
    event.preventDefault(); // Stop full page reload

    var name = document.getElementById('tour-name').value.trim();
    var phone = document.getElementById('tour-phone').value.trim();
    var email = document.getElementById('tour-email').value.trim();

    if (!name || !phone || !email) {
      statusEl.textContent =
        'Please add your name, phone, and email so Mike can confirm your tour.';
      statusEl.style.color = '#ffcc66';
      return;
    }

    // For now: just show a success message.
    // Later: we will send this to Supabase (book-tour function).
    statusEl.textContent =
      'Request captured (demo). In production, this sends directly to Mike.';
    statusEl.style.color = '#00ff85';

    // Optional: clear fields (but keep listing info visible)
    // form.reset(); // comment out if you want values to stay

    // We do NOT close the modal automatically yet so the user sees the message.
  });
})();
