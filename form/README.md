# Design Careers — Job Application Website

A professional, full-stack job application portal for designers. Collects applicant details and CV (PDF), then emails everything to your Gmail inbox via SMTP.

---

## Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | HTML5, CSS3 (glassmorphism), Vanilla JS |
| Backend    | Node.js · Express · Multer · Nodemailer |
| Email      | Gmail SMTP with App Password        |

---

## Local Setup

### 1 · Prerequisites
- [Node.js 18+](https://nodejs.org/)
- A Gmail account with **2-Step Verification** enabled

### 2 · Create a Gmail App Password
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Under *How you sign in to Google*, click **2-Step Verification → App passwords**
3. Create an app password for *Mail / Other (custom name)*
4. Copy the 16-character password (e.g. `abcd efgh ijkl mnop`)

### 3 · Configure environment variables
```bash
# In the project root, copy the example file:
cp .env.example .env     # Windows: copy .env.example .env
```

Edit `.env`:
```env
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
RECIPIENT_EMAIL=you@gmail.com   # where emails will arrive (can be same address)
PORT=3000
```

### 4 · Install & run
```bash
npm install
npm run dev          # development (nodemon, auto-restart)
# or
npm start            # production
```

Open **http://localhost:3000** in your browser.

---

## Project Structure

```
form/
├── public/
│   ├── index.html       # Frontend form
│   ├── style.css        # Premium glassmorphism styles
│   └── app.js           # Client-side validation + fetch
├── uploads/             # Temp CV storage (auto-created, git-ignored)
├── server.js            # Express app + API routes
├── package.json
├── .env                 # ← YOU create this (git-ignored)
├── .env.example         # Template
└── .gitignore
```

---

## Deployment

### Option A — Render (recommended, free tier)

1. Push the project to a **GitHub** repository
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
5. Add environment variables in **Environment** tab:
   - `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `RECIPIENT_EMAIL`
6. Click **Deploy** → your URL will be `https://your-app.onrender.com`

### Option B — Railway

1. `npm install -g railway` then `railway login`
2. `railway init` inside the project folder
3. `railway up`
4. Set env vars in the Railway dashboard

### Option C — Heroku

```bash
heroku create your-app-name
heroku config:set GMAIL_USER=you@gmail.com
heroku config:set GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
heroku config:set RECIPIENT_EMAIL=you@gmail.com
git push heroku main
```

> **Note:** The `uploads/` folder is ephemeral on all platforms — this is fine  
> because the server deletes each CV file immediately after attaching it to the email.

---

## API Reference

### `POST /api/apply`

**Content-Type:** `multipart/form-data`

| Field           | Type   | Validation                            |
|-----------------|--------|---------------------------------------|
| `fullName`      | string | min 2 chars                           |
| `phone`         | string | digits / spaces / `+` / `-` / `()`   |
| `designField`   | string | must match one of 7 allowed values    |
| `portfolioLink` | string | valid URL (http / https)              |
| `cv`            | file   | PDF only · max 5 MB                   |

**Response:**
```json
{ "success": true,  "message": "Your application has been submitted successfully!…" }
{ "success": false, "message": "Specific error description" }
```

---

## Security Notes

- CV files are stored temporarily and deleted immediately after the email is sent
- File upload is restricted to `application/pdf` MIME type and `.pdf` extension
- All user input is HTML-escaped before being placed in the email body
- Sensitive credentials are stored in `.env` (never committed to git)
