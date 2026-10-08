# Shellkore website

Production website for Shellkore (formerly ERP Easy): marketing site, waitlist with admin panel, editable content, blog and an AI assistant.

Built with Next.js 16, React 19 and Postgres. Designed for Vercel.

## What's inside

| Area | What it does |
|---|---|
| **Public site** | Home, Pricing, About, Blog, Terms, Privacy. Light/dark theme, fully responsive. |
| **Waitlist** | Saves signups to Postgres. Validation, spam trap, rate limiting, optional email alert per signup. |
| **Admin** (`/admin`) | Password login. Dashboard, searchable waitlist, CSV export, remove entries. |
| **Content editor** | Every piece of text on the site (hero, FAQs, pricing plans, comparison, legal pages, assistant settings) is editable from `/admin/content`. Saves go live immediately. |
| **Blog** | Write, draft, publish and delete posts in Markdown from `/admin/posts`. |
| **AI assistant** | "Ask Shellkore" answers with Claude, using only the site's own content. Falls back to FAQ answers if no API key is set. |

## Design

The site is designed as a drawing set, because that is the world Shellkore's customers work in.

- **Hero:** a real 2BHK furniture layout drawn in SVG (walls, doors, windows, columns, gridlines, dimension strings) inside a drawing sheet with a title block. Point at a room and it is highlighted like a QS marking a print, while the room takeoff column prices it on sample rates.
- **Lead to cash:** a pinned scroll story that follows one job through six documents, with the job ledger growing one entry at a time.
- **Palette:** concrete paper, white sheets, black ink. Highlighter yellow appears only where Shellkore has done the work.
- **Type:** Barlow Condensed for display, Barlow for reading (self-hosted).
- **Islands:** interactive parts (`src/islands/`) are small framework-free modules over server-rendered markup, loaded on demand.
- **Preview:** `python3 preview/build.py` (with the site running on port 3100) turns the server-rendered home page into a single shareable HTML file using the same islands.

## Deploy on Vercel (about 10 minutes)

1. **Push this folder to a GitHub repo.**
2. In Vercel: **Add New → Project →** import the repo. Framework is detected automatically.
3. **Add a database:** in the project, open **Storage → Create → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL`. Tables are created automatically on first request.
4. **Add environment variables** (Settings → Environment Variables):
   - `ADMIN_PASSWORD`: a long passphrase for `/admin`
   - `SESSION_SECRET`: 32+ random characters (`openssl rand -hex 32`)
   - `ANTHROPIC_API_KEY`: from console.anthropic.com (for the AI assistant)
   - `NEXT_PUBLIC_SITE_URL`: e.g. `https://shellkore.com`
   - Optional email alerts: `RESEND_API_KEY`, `NOTIFY_EMAIL`, `NOTIFY_FROM`
5. **Deploy.** Then open `/admin` and sign in.
6. **Custom domain:** Settings → Domains.

## Run locally

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD at least
npm run dev                  # http://localhost:3000
```

Without `DATABASE_URL`, a built-in Postgres (PGlite) stores data in `.data/`, so nothing else needs installing.

## Security

- Strict security headers on every response: Content-Security-Policy (no third-party scripts, fonts or trackers), HSTS, frame blocking, nosniff, locked-down Permissions-Policy.
- Admin sessions are signed, HTTP-only, SameSite=strict cookies that expire after 8 hours. Every admin page, action and export checks the session on the server.
- Login is rate limited (5 tries per 15 minutes) and compares passwords in constant time.
- Waitlist and assistant endpoints validate all input, block cross-site posts, cap request size and rate limit per visitor. Raw IP addresses are never stored, only a salted hash.
- CMS and blog Markdown is rendered with raw HTML escaped and links restricted to safe schemes.
- CSV export neutralises spreadsheet formulas.
- The assistant is instructed to answer only from site content and not to invent prices or dates.

## Performance

- Public pages are pre-rendered and refreshed in the background (ISR, every 5 minutes, and instantly after an admin save).
- Fonts are self-hosted and subset; no external requests on page load.
- Product visuals are HTML/SVG, so there are no heavy images.
- Interactive parts load as small client components; the assistant panel renders only when opened.
- Animations respect reduced-motion settings.

## Before launch

- Replace the sample project data (project names, client, vendors, rupee figures) in `src/components/home/` if the team wants real or approved examples.
- Have the Terms and Privacy text reviewed (editable in the admin).
- Set the real domain in `NEXT_PUBLIC_SITE_URL`.

## Project layout

```
src/app/(site)/        public pages
src/app/admin/         admin login, dashboard, waitlist, content, posts, server actions
src/app/api/           waitlist, chat, CSV export
src/components/        UI components (home/ = home page sections, admin/ = admin UI)
src/lib/defaults.ts    default site text (the shape the content editor follows)
src/lib/db.ts          database connection and schema
```
