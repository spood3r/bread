# Bread Typing

Simple web app: type the word "bread" as fast as possible. Fastest times are saved to a local SQLite leaderboard.

Run locally:

```bash
npm install
npm start
# open http://localhost:3000
```

Files:
- [server.js](server.js) — backend API and static server
- [public/index.html](public/index.html) — frontend game

Credits:
- Built with help from GitHub Copilot

Deploying and getting indexed by search engines
----------------------------------------------

1) Deploy to Render (recommended for Node + SQLite):
	- Sign in to https://render.com and create a new "Web Service".
	- Connect your GitHub repo (`spood3r/bread`) and select the `feat/realtime-leaderboard` branch (or `main`).
	- Build command: leave empty (server runs with `node server.js`) or set to `npm ci && npm run build` if you add a build step.
	- Start command: `node server.js`.
	- Ensure the service exposes port `3000` (Render's default HTTP port mapping will forward to the container).

2) Update `public/index.html`, `public/robots.txt`, and `public/sitemap.xml`:
	- Replace `REPLACE_WITH_DEPLOYED_URL` in `public/index.html` and `public/sitemap.xml` with your live site URL (for example `https://bread.onrender.com`).
	- `robots.txt` is already present and references `/sitemap.xml`.

3) Add your site to Google Search Console:
	- Go to https://search.google.com/search-console and add a property for your site URL.
	- Verify ownership using DNS, HTML file upload, or the meta tag method.
	- Submit your sitemap URL: `https://YOUR_SITE/sitemap.xml` in the Search Console "Sitemaps" section.

4) Wait for indexing: Google may take hours to weeks to index. You can request indexing from Search Console for faster coverage.

Notes:
 - GitHub Pages is only suitable for the static frontend; it can't run the Node server or SQLite leaderboard.
 - If you prefer a static-only deployment (no backend), you can deploy `public/` to GitHub Pages or Netlify, but leaderboard persistence will be lost.

# bread
fastest bread typing website
