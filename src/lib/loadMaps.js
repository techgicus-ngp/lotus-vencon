/* Loads the Maps JavaScript API once and resolves with `google.maps`.

   If another screen has already put the script on the page (for instance
   through @react-google-maps/api) that copy is reused rather than loaded
   a second time. */
let pending = null;

export function loadMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps?.OverlayView) return Promise.resolve(window.google.maps);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const fail = (msg) => { pending = null; reject(new Error(msg)); };
    if (!apiKey) { fail('VITE_GOOGLE_MAPS_API_KEY is not set.'); return; }

    const cb = `__gmapsReady_${Date.now()}`;
    window[cb] = async () => {
      try {
        // with loading=async the classes arrive through importLibrary
        if (window.google.maps.importLibrary) await window.google.maps.importLibrary('maps');
      } catch (e) { /* the classic globals are still there */ }
      delete window[cb];
      resolve(window.google.maps);
    };

    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
      + `&v=weekly&loading=async&callback=${cb}`;
    s.async = true;
    s.onerror = () => fail('Google Maps failed to load. Check the API key and any ad-blocker.');
    document.head.appendChild(s);
  });
  return pending;
}
