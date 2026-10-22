/* global document, location, URL -- a classic browser script outside src/ */
// Forwards every path on the legacy domain to the same path, query string and
// fragment on the new domain, so shared results links (/?session=...) keep working.
const NEW_ORIGIN = 'https://unlock-the-lab.web.app';

// Concatenating (rather than resolving) keeps a path such as '//example.com'
// on the new origin instead of turning it into a protocol-relative URL.
const target = new URL(NEW_ORIGIN + location.pathname + location.search + location.hash);

if (target.origin === NEW_ORIGIN) {
    location.replace(target.href);

    document.addEventListener('DOMContentLoaded', () => {
        const link = document.getElementById('new-location');
        if (link) link.href = target.href;
    });
}
