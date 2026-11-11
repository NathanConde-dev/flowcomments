# SEO policy (self-host)

Self-host installs **must not** compete with the official product site for search or AI discovery.

- `app/layout.tsx` sets `robots: noindex, nofollow`
- `app/robots.ts` disallows all crawlers
- Do **not** add `sitemap.xml`, `llms.txt`, comparison pages, or marketing metadata here

Canonical SEO / GEO lives on **https://flowcomments.com** (`flowcomments-cloud`).
