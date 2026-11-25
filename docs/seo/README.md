# SEO & Google Search Console

## Important: localhost cannot be verified in Search Console

Google Search Console only verifies **publicly reachable domains**. `http://localhost:5173` is private to your computer, so a localhost property will never appear in search results. To be seen in Google:

1. Deploy the built site (`npm run build`) to a public HTTPS host.
2. Verify the domain in [Google Search Console](https://search.google.com/search-console).
3. Submit the sitemap and request indexing.

This app implements everything needed on the site side; the remaining steps happen on your host and in Google's tools.

## What is implemented

- **Dynamic head manager** (`src/components/seo-manager.tsx`) updates title, description, keywords, robots, canonical URL, Open Graph, Twitter cards and JSON-LD on every route.
- **Route-aware copy** (`src/lib/seo.ts`) gives every public page a distinct title/description; staff, display and room-menu routes are `noindex, nofollow`.
- **Static fallbacks** in `index.html` for crawlers that read HTML before executing JavaScript.
- **Structured data** (`Hotel` + `WebSite` JSON-LD) with name, telephone, address, price range and social image.
- **`public/robots.txt`** allows public pages, blocks `/staff/`, `/display/` and `/room/`, and points to the sitemap.
- **`public/sitemap.xml`** lists the indexable public URLs.
- **Admin settings** at `/staff/settings` → **SEO** tab to edit all of the above without code changes.

## Admin setup

1. Sign in and open **Settings → SEO**.
2. Set **Canonical base URL** to your real public domain, including `https://`.
3. Update the default title, meta description, keywords and social image.
4. Paste your Google verification content from Search Console into **Google verification content**, and the Bing value if used. Save.
5. Use **Preview Google result** to check the snippet, and **Copy meta tags** if your static host needs them injected at build time.
6. Turn **Allow indexing** off while staging; turn it on for production.

Changing these values updates the site immediately in the browser and persists in `localStorage` (`hayata-hms-seo`).

## Updating the sitemap

`public/sitemap.xml` contains the default domain `https://hayatahotel.com`. Before go-live, replace that domain with the one configured in the SEO tab (search-and-replace in the file), then redeploy. For an automatically generated sitemap, serve a server-side route that reads the same SEO settings and emits XML.

## Google Search Console steps after deployment

1. Add the site as a **Domain** property (recommended) or URL-prefix property.
2. Choose **HTML tag** verification and paste the `content` value into the admin SEO field, or place the verification file at your domain root.
3. After verification, open **Sitemaps**, enter `sitemap.xml`, and submit.
4. Use **URL Inspection → Request indexing** on the homepage and key room pages.
5. Check **Pages** for coverage and **Enhancements** for structured-data errors.

## Notes

- The canonical URL and Open Graph image must be absolute HTTPS URLs.
- Keep meta descriptions around 150–160 characters for the best snippet display.
- If the site is behind authentication in production, Search Console cannot crawl it; public pages must be anonymously accessible.
