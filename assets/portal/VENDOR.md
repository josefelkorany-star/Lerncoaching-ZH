# Local portal assets

Supabase JavaScript 2.119.0, MIT. `supabase-2.119.0.js` is the unchanged UMD asset from the official npm package `@supabase/supabase-js@2.119.0`, retrieved 2026-11-16.

- Package integrity: `sha512-MKP49G6bJbPhvsZDegZ/IXS/ITApPgplDCF5+F65KZ5kIArS5Y90WFxwvWYALx2bsxdrSuHvkCiXHYr3dU8+sw==`
- UMD SHA256: `a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce`
- Whitespace lint excludes this one upstream minified file so its byte-for-byte integrity is preserved; the release-boundary test checks the hash.
- Licence: SUPABASE-LICENSE.txt. Official source: https://github.com/supabase/supabase-js
- npm audit of the isolated pinned tool installation reported zero known advisories on 2026-11-16. This is not a guarantee or a substitute for integration testing.

DM Sans and Bebas Neue are local WOFF files under the SIL Open Font License. See fonts/LICENSE.txt. They are the same licensed typefaces used in the supplied visual references. No Google Fonts request is needed by portal.html.

The SQL test engine PGlite 0.5.16 is a development dependency only, not included in the production portal. No build step is required to serve the portal.
