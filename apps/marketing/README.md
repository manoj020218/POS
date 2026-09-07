# Smart POS marketing site

A plain static site (no build step, matching the convention used by the client's other
product marketing pages, e.g. `hotelqr-marketing`) — a single `index.html` plus `robots.txt`
and `sitemap.xml` for SEO.

Covers: hero/feature/FAQ conversion content, a self-serve signup form, and the Privacy
Policy / Terms & Conditions / About Us content required for Google OAuth consent
verification and Play Store listing.

## Signup flow

The form in `index.html` POSTs to `SIGNUP_ENDPOINT` (a `const` near the bottom of the file,
currently `https://iotsoft.in/api/smartpos/signup`) — the billing-platform integration for
that endpoint is tracked separately (see the repo's `TODO.md`). Until that endpoint exists,
submitting the form will show a graceful "Something went wrong" error rather than succeed.

## Local preview

No build step — just serve the folder statically, e.g.:

```bash
cd apps/marketing
python -m http.server 8123
```

Then open `http://localhost:8123/index.html`.

## Deployment

Deploys as static files under nginx, path-routed alongside the API on the same
`smartpos.iotsoft.in` domain (see the repo's deployment notes) — `/` serves this site,
`/api/` proxies to `apps/api`.
