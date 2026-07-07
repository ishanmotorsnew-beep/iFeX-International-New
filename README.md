# iFeX International — Website

A premium, enterprise-grade marketing site built with React, Tailwind CSS, and
Framer Motion, backed by an Express + Nodemailer contact API.

## Project structure

```
src/
├── components/
│   ├── Common/        Navbar, Footer, Button, SectionHeader, ScrollToTop
│   ├── Home/           Hero, ServicesOverview, WhyChooseUs, TechStack, CTA
│   ├── Contact/         ContactCard, ContactForm
│   ├── Admin/            ProtectedRoute, CompanyForm, PortfolioManager
│   └── ServiceTemplate.jsx
├── context/              ContentContext.jsx, AdminAuthContext.jsx
├── data/                 servicesData.js
├── lib/                  api.js (fetch helpers for content + admin actions)
├── pages/
│   ├── admin/            AdminLogin.jsx, AdminDashboard.jsx
│   └── Home, About, Services, ServiceDetail, Portfolio, Pricing, Contact
├── App.jsx
└── main.jsx
server/
├── data/content.json      company details + portfolio (editable via admin panel)
├── uploads/                admin-uploaded project images
├── contentStore.js         read/write helpers for content.json
├── auth.js                 admin login/session logic
├── .env.example
├── package.json
└── server.js
```

## 1. Frontend setup

```bash
npm install
npm run dev
```

The site runs at `http://localhost:5173`. Vite is configured to proxy any
`/api/*` request to the backend at `http://localhost:4000` (see
`vite.config.js`), so the contact form works locally without extra config.

## 2. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` — your
  SMTP provider credentials (Gmail, SendGrid, Amazon SES, Postmark, etc.). For Gmail,
  use an app password and either `465`/`true` or `587`/`false`.
- `CONTACT_RECEIVER_EMAIL` — the inbox that should receive new inquiries
- `CONTACT_SENDER_EMAIL` — the "from" address used when sending mail
- `CLIENT_ORIGIN` — the frontend origin allowed by CORS (defaults to
  `http://localhost:5173`)

Then start the API:

```bash
npm run dev   # auto-restarts on file changes
# or
npm start
```

The server exposes:

- `GET /api/health` — health check
- `POST /api/contact` — contact form submission (rate-limited to 5
  requests per 15 minutes per IP, validated and sanitized server-side)

## 3. Run both together

From the project root, after both `npm install` steps above:

```bash
npm run dev:all
```

This uses `concurrently` to run the Vite dev server and the Express API in
one terminal.

## 4. Admin panel

A built-in admin panel lets you edit portfolio projects and company details
without touching code.

- **URL:** `http://localhost:5173/admin/login`
- **Password:** set via `ADMIN_PASSWORD` in `server/.env` (defaults to
  `change-me-before-launch` — change this before deploying anywhere public)

Once logged in, you can:

- **Portfolio tab:** add, edit, and delete projects; upload a cover image for
  each; mark projects as "Featured" to show them on the homepage; filter by
  category on the public Portfolio page still works automatically.
- **Company Details tab:** edit the homepage headline/subtext, email, phone,
  location, social links, mission/vision copy, and the homepage stat counters
  (e.g. "120+ Projects Delivered").

All content is stored server-side in `server/data/content.json` and served
live to the site via `GET /api/content` — no rebuild or redeploy needed after
an edit. Uploaded images are saved to `server/uploads/` and served at
`/uploads/<filename>`.

Admin sessions use a simple password-protected token (stored in the
browser's `localStorage` and validated server-side in memory) — suitable for
a single-operator admin panel. For a multi-admin setup or production
hardening, swap `server/auth.js` for a real user table with hashed passwords.

## 5. Content to customize before launch

Search the codebase for `TODO:` comments — they mark every spot where
placeholder copy should be swapped for real content, in addition to what's
now editable from the admin panel above. Key files:

- `server/data/content.json` — the seed data for company details + portfolio
  (edit directly, or use the admin panel once the app is running)
- `src/pages/Pricing.jsx` — package tiers and pricing figures
- `src/data/servicesData.js` — all 8 core services + 16 micro-services
- `server/.env` — SMTP credentials, admin password, and recipient email

## 6. Production build

```bash
npm run build     # outputs static assets to /dist
npm run preview   # preview the production build locally
```

Deploy `/dist` to any static host (Vercel, Netlify, S3 + CloudFront, etc.)
and deploy `server/` to any Node host (Render, Railway, Fly.io, EC2, etc.),
pointing `CLIENT_ORIGIN` at your production frontend URL and updating the
frontend's API calls if it's hosted on a different domain than `/api`.
