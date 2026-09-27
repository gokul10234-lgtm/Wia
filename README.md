# Westford Sports - Indian Academy — Management System

A full website (Node.js + Express backend, Turso/libSQL database — SQLite-compatible —
plain HTML/CSS/JS frontend) implementing registration, training schedules, attendance,
renewals, role-based logins, and reporting.

This version is built specifically to run on a **free, permanent** hosting stack:
**Render** (free web hosting) + **Turso** (free, persistent, SQLite-compatible database).
Render's free tier has no persistent disk — any local file (including a plain SQLite
file) gets wiped whenever the service sleeps or redeploys — so the database lives on
Turso instead, reached over the network. Nothing else about the app changes.

## What's included

```
academy-system/
├── package.json
├── .env.example        <- copy to .env and edit before running
├── server/              Express API
│   ├── index.js         app entry point
│   ├── db.js             Turso client + schema creation + first-run seed data
│   ├── utils.js
│   ├── asyncHandler.js
│   ├── middleware/auth.js
│   └── routes/           auth, trainers, fees, schedule, students, reports, upload
└── public/               the website itself (served as static files by Express)
    ├── login.html
    ├── change-password.html
    ├── index.html        main dashboard (registration / attendance / reports / admin tabs)
    ├── css/styles.css
    └── js/ (api.js, app.js)
```

## 1. Create your free Turso database

1. Go to **turso.tech** and sign up (free, no credit card).
2. Install the Turso CLI and log in:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```
3. Create a database:
   ```bash
   turso db create westford-academy
   ```
4. Get the connection URL and an auth token:
   ```bash
   turso db show westford-academy --url
   turso db tokens create westford-academy
   ```
   You'll use these two values as `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

(No CLI access? Turso's web dashboard can create a database and generate a token too —
the CLI is just the fastest path.)

## 2. Run it locally first (recommended before deploying)

Requirements: Node.js 18+.

```bash
cd academy-system
npm install
cp .env.example .env
# edit .env: paste in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from step 1,
# set a real JWT_SECRET, and change ADMIN_PASSWORD
npm start
```

Open the printed URL (default `http://localhost:4000`). The first run automatically
creates all tables on your Turso database and seeds:
- **Main admin** — username/password from `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).
- **One trainer login per seeded trainer** (Devathi, KK, Amal, Narasimhan, Siyad, Akhil),
  username = trainer name, default password `Abc@123` (forced change on first login).

## 3. Deploy to Render (free)

1. Push this project to a GitHub repository (Render deploys from Git).
2. Go to **render.com**, sign up (free, no credit card), click **New → Web Service**,
   and connect the GitHub repo.
3. Configure the service:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Under **Environment Variables**, add every value from `.env.example`, with your real
   values:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET` (generate a long random string — don't reuse the example)
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `DEFAULT_TRAINER_PASSWORD`
   - `PORT` — you can leave this out; Render sets it automatically.
5. Click **Create Web Service**. Render will build and deploy — first deploy takes a
   couple of minutes. Once live, it gives you a URL like
   `https://westford-academy.onrender.com`.
6. Open that URL and log in with your admin credentials.

That's it — the whole thing costs nothing. Two tradeoffs to know about on Render's free
tier (this is Render's limitation, not the app's):
- **Cold start:** if nobody visits for 15 minutes, the service spins down. The next
  visit takes ~30–50 seconds to wake back up. Your data isn't affected — it's on Turso,
  not on Render — this only delays the first page load after idle time.
- **750 free instance-hours/month** shared across all your free services on Render. One
  app running continuously uses roughly 720 hours/month, so you're comfortably inside
  the limit with a single service.

## 4. Redeploying after changes

Push to the branch Render is watching (usually `main`) and it redeploys automatically.
Since the database lives on Turso, your student/trainer/attendance data is untouched by
redeploys — only the app code changes.

## 5. Roles & access

| Role | Username | Can do |
|---|---|---|
| Main Admin | set in `.env` | Everything: fee/price updates, add/edit/deactivate trainers, reset any password, all reports across all activities, bulk Excel upload. |
| Trainer | trainer's name | Register students, mark/edit attendance, send renewal reminders, process renewals, view reports scoped to their own students. |

Every page and every API route requires a valid login.

### About "view password"

Passwords are stored **hashed** (bcrypt), not in plain, reversible form — so there's
nothing to "view," even for the admin. The admin can **reset any account's password**
back to the default (`/api/auth/reset-password`), and any user can **change their own
password** once logged in (`/api/auth/change-password`) — this covers the same real
need (regaining access) without keeping plain-text passwords anywhere.

## 6. Data model

See `server/db.js` for the full schema: `users`, `trainers`, `students`, `attendance`
(one row per session, editable by any authorized trainer or admin, with audit fields),
`renewal_history`, `fee_matrix`, `settings`, `schedule_slots` (admin-editable per
activity/day, with optional trainer restriction — e.g. Ladies Only sessions).

## 7. Bulk upload

Admins can download a ready-made Excel template from the **Bulk Upload** tab, fill it
in, and upload it back. Each row is validated independently — a bad row is reported
with its row number and reason, while every valid row in the same file still imports.

## 8. Open decisions worth confirming with your team

- Trainers can currently register new students themselves (not admin-only). Restrict
  this in `server/routes/students.js` if registration should be admin-only.
- Trainers only see their own students in Attendance/Reports; admin sees everyone.
- "Referred By" is only required for Trial registrations, per the original spec.
- Session timeout is 8 hours (JWT expiry in `server/routes/auth.js`) — adjust to taste.

## 9. If you outgrow the free tier

If usage grows past what's comfortable on Render's free plan, the code doesn't need to
change — just upgrade the Render service to a paid instance type (removes the cold
start and the 750-hour cap). Turso's free tier is generous enough (multi-GB storage,
hundreds of millions of reads/writes a month) that most small-to-mid academies won't
need to pay for the database at all.

## 10. Changelog — latest round of changes

- **Registration Type** now offers three options: New Registration, Trial, Renewal
  (previously just Trial/Renewal). "Referred By" still only appears for Trial.
- **VAT** was already calculated on the session fee only, never on the one-time
  registration fee — the fee breakdown labels now say this explicitly so it's clear
  at a glance ("One-Time Registration Fee (No VAT)" / "VAT (5% — Session Fee only)").
- **Time slots**: the default seed data now covers all 7 days (Sunday was previously
  missing for Badminton/Football/Cricket) with a wider range of hours. This only
  affects brand-new databases — on an already-running instance, use the admin
  **Schedule Config** tab to add slots to any day/activity; that feature already
  supports it with no code change needed.
- **Attendance table**: each student's session history now lays out as one
  horizontally-scrolling row of compact cards instead of stacking vertically, so the
  table stays a reasonable height even with 24-session packages.
- **Reports tab** reworked:
  - New **"All Reports (combined)"** option runs Attendance + Trial + Registration +
    Renewal together in one view.
  - New **period selector** — Today / This Week / Custom Period — applies to every
    report type except the Daily Rollup (which is inherently single-day).
  - New **Export to Excel** button next to Print — downloads whatever report is on
    screen as a `.xlsx` file (one sheet per section for the combined/daily views).
- **Bulk Excel upload** (Bulk Upload tab, admin-only) was already built in an earlier
  round and is unchanged — template download, per-row validation, valid rows still
  import even if others in the same file have errors.
