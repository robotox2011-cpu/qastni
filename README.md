# قسطني | Qastni — MVP with Supabase Backend

A peer-to-peer installment platform. Full Arabic/English, real auth, real-time DB.

---

## 🚀 Setup in 4 Steps

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Set a name (e.g. `qastni`), region, and strong password
3. Wait ~2 minutes for provisioning

---

### Step 2 — Run the Database Schema

1. In Supabase → **SQL Editor** → **New Query**
2. Paste the entire content of `supabase/migrations/001_schema.sql`
3. Click **Run**
4. You should see: `Success. No rows returned`

---

### Step 3 — Configure Environment

```bash
# In the project root
cp .env.example .env
```

Open `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Where to find these:**
- Supabase Dashboard → **Settings** → **API**
- Copy **Project URL** and **anon public** key

---

### Step 4 — Install & Run

```bash
npm install
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Production

### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow prompts, add env vars in Vercel dashboard
```

### Option B: Netlify
```bash
npm run build
# Drag dist/ folder to netlify.com/drop
# Add env vars in Site Settings → Environment Variables
```

### Option C: Supabase + Cloudflare Pages
```bash
npm run build
# Push to GitHub, connect in Cloudflare Pages
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

---

## 📁 Project Structure

```
qastni-supabase/
├── index.html                    # Entry point
├── package.json
├── vite.config.js
├── .env.example                  # Copy to .env
├── .gitignore
│
├── supabase/
│   └── migrations/
│       └── 001_schema.sql        # ⬅ Run this in Supabase SQL Editor
│
└── src/
    ├── main.js                   # App controller (all UI + logic)
    ├── styles/
    │   └── main.css              # Full design system
    └── lib/
        ├── supabase.js           # Supabase client + auth helpers
        └── api.js                # All database operations
```

---

## 🗄️ Database Tables

| Table           | Purpose                              |
|-----------------|--------------------------------------|
| `profiles`      | Extended user info (name, phone, ID) |
| `deals`         | Installment agreements               |
| `payments`      | Monthly payment schedule             |
| `ratings`       | User-to-user ratings after deals     |
| `notifications` | In-app notifications                 |

---

## ✨ Features

| Feature | Details |
|---------|---------|
| **Auth** | Supabase Auth (email/password) with real session management |
| **Profiles** | Auto-created on signup with name, phone, national ID |
| **Deals** | Create → Notify seller → Accept/Reject → Track payments |
| **Realtime** | Live updates via Supabase Realtime (WebSockets) |
| **Payments** | Monthly schedule, mark as paid, auto-complete deal |
| **Ratings** | Post-completion rating system, stored in DB |
| **Contract** | Printable agreement document per deal |
| **Language** | Full Arabic RTL ↔ English LTR toggle |
| **Security** | Row Level Security (RLS) — users only see their own data |

---

## 🔐 Security (RLS Policies)

- Users can only see deals where they are **buyer OR seller**
- Users can only update their own profile
- Ratings: one per deal per user (enforced by DB constraint)
- Notifications: users only see their own

---

## ⚠️ Important Notes

### Email Confirmation
By default, Supabase requires email confirmation. To disable for development:
- Supabase → **Authentication** → **Email** → Disable "Confirm email"

### Seller Lookup
The platform sends deal requests by **seller email**. The seller must be registered with the same email to see incoming requests. This is by design — both parties need accounts.

### Realtime
Realtime is enabled for `deals`, `payments`, and `notifications` tables. Changes made by one user are instantly reflected for the other party.

---

## 🛠️ Common Issues

**"Missing Supabase env vars"**
→ Create `.env` from `.env.example` and fill in the values

**"Invalid API key"**
→ Make sure you're using the **anon** key, not the **service role** key

**"No rows returned" but data not showing**
→ Check RLS policies — make sure you're logged in as the correct user

**Email confirmation loop**
→ Disable email confirmation in Supabase Auth settings during development

---

## 📋 Legal Disclaimer

Qastni is a **mediation platform only**. It does not:
- Process real payments
- Hold funds
- Guarantee agreements between parties

All transactions are between individuals. The platform only facilitates documentation.
