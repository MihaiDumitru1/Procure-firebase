# ProCure — Setup & Deploy Guide

## Arhitectură

- **Frontend:** React + TypeScript + Vite + Tailwind + shadcn/ui
- **Auth:** Firebase Authentication (email/password)
- **Database:** Cloud Firestore
- **API Functions:** Vercel Serverless Functions (manage-users, evaluate-offers)
- **Hosting:** Vercel

---

## 1. Creează proiectul Firebase

1. Mergi la [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** → dă-i un nume (ex: `procure-app`) → Continue
3. Dezactivează Google Analytics (opțional) → **Create Project**

### 1a. Activează Authentication

1. În Firebase Console → **Authentication** → **Get started**
2. Tab **Sign-in method** → activează **Email/Password**

### 1b. Creează Firestore Database

1. **Firestore Database** → **Create database**
2. Alege **Start in production mode**
3. Selectează locația (ex: `europe-west3` pentru Frankfurt)
4. Click **Create**

### 1c. Adaugă o aplicație Web

1. **Project Settings** (⚙️) → **General** → scroll la **Your apps**
2. Click iconița **Web** (`</>`)
3. Dă-i un nickname (ex: `procure-web`) → **Register app**
4. Copiază valorile din `firebaseConfig` — le vei pune în `.env`

### 1d. Creează primul utilizator admin

În Firebase Console → **Authentication** → **Users** → **Add user**:
- Email: `admin@procure.ro` (sau ce vrei tu)
- Password: alege o parolă

Copiază **User UID** afișat.

Apoi în **Firestore Database** → **Start collection** → `users`:
- Document ID: `<User UID copiat mai sus>`
- Câmpuri:
  - `email` (string): `admin@procure.ro`
  - `full_name` (string): `Admin`
  - `role` (string): `app-admin`
  - `company` (string): ``
  - `created_at` (string): `2026-01-01T00:00:00.000Z`

### 1e. Generează Service Account Key

1. **Project Settings** → **Service accounts**
2. Click **Generate new private key** → salvează JSON-ul
3. Vei pune conținutul acestui JSON ca environment variable pe Vercel

---

## 2. Configurează local

```bash
# Clonează sau dezarhivează proiectul
cd procure-firebase

# Instalează dependențele
npm install

# Copiază .env.example în .env și completează
cp .env.example .env
```

Editează `.env` cu valorile din Firebase Console:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=procure-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=procure-app
VITE_FIREBASE_STORAGE_BUCKET=procure-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_API_URL=/api
```

```bash
# Rulează local
npm run dev
```

---

## 3. Deploy pe Vercel

### 3a. Push pe GitHub

```bash
git init
git add .
git commit -m "Initial commit - Firebase migration"
git remote add origin https://github.com/USER/procure-app.git
git push -u origin main
```

### 3b. Import în Vercel

1. Mergi la [vercel.com](https://vercel.com) → **Add New Project**
2. Importă repo-ul din GitHub
3. Framework: **Vite** (se detectează automat)
4. **Environment Variables** — adaugă toate:

| Variable | Valoare |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | din Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | din Firebase |
| `VITE_FIREBASE_APP_ID` | din Firebase |
| `VITE_API_URL` | `/api` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | JSON-ul complet din service account key (pe o singură linie) |
| `AI_API_KEY` | (opțional) cheia API OpenAI/Anthropic pentru evaluare AI |
| `AI_API_URL` | (opțional) `https://api.openai.com/v1/chat/completions` |
| `AI_MODEL` | (opțional) `gpt-4o-mini` |

**Important:** Pentru `FIREBASE_SERVICE_ACCOUNT_KEY`, copiază tot conținutul JSON-ului pe o singură linie. Poți folosi:
```bash
cat service-account-key.json | tr -d '\n'
```

5. Click **Deploy**

### 3c. Configurează Firebase Auth Domain

După deploy, adaugă domeniul Vercel în Firebase:
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Adaugă: `your-app.vercel.app`

---

## 4. Aplicare Firestore Rules

Instalează Firebase CLI și aplică regulile:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore  # selectează proiectul existent
# La întrebarea despre rules file → `firestore.rules`
# La întrebarea despre indexes → `firestore.indexes.json`
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 5. Structura Firestore

### Colecții:

**`users`** — profil + rol utilizator (document ID = Firebase Auth UID)
```
{
  email: "admin@procure.ro",
  full_name: "Admin Name",
  role: "app-admin",        // app-admin | tender-organizer | procurement-officer | supplier
  company: "",
  created_at: "2026-01-01T00:00:00.000Z"
}
```

**`properties`** — proprietăți/SPV-uri
```
{
  name: "Westend Office Tower",
  code: "WOT-001",
  address: "...",
  city: "Frankfurt",
  country: "Germany",
  property_type: "office",
  total_area: 28500,
  year_built: 2008,
  manager: "Sarah Mitchell",
  description: "...",
  created_at: "..."
}
```

**`tenders`** — licitații
```
{
  title: "...",
  description: "...",
  category: "cleaning",
  status: "draft",           // draft | active | awarded | closed
  participation_deadline: "...",
  submission_start_date: "...",
  submission_end_date: "...",
  min_participants: 3,
  budget: "€150,000",
  location: "...",
  spv_id: "...",
  documents: [...],
  questions: [...],
  rounds: [...],
  articles: [...],
  compulsory_offer_items: [...],
  selection_criteria: [...],
  current_round: 1,
  total_rounds: 1,
  created_by: "uid",
  created_at: "..."
}
```

**`suppliers`** — furnizori
```
{
  name: "CleanPro Services",
  fiscal_code: "RO12345678",
  categories: ["cleaning", "waste-management"],
  contacts: [{ id, name, email, phone, addedBy, addedByRole, linkedUserId }],
  active_offers: 2,
  total_contracts: 5,
  created_by: "uid",
  created_at: "..."
}
```

**`tender_invitations`** — invitații furnizori la licitații
```
{
  tender_id: "...",
  supplier_id: "...",
  status: "sent",            // pending | sent | accepted | declined
  invited_by: "uid",
  created_at: "..."
}
```

---

## 6. Roluri și permisiuni

| Rol | Dashboard | Tenders | Suppliers | Settings |
|-----|-----------|---------|-----------|----------|
| **app-admin** | ✅ Full | ✅ CRUD | ✅ CRUD | ✅ Users + Categories |
| **tender-organizer** | ✅ View | ✅ Create/Edit | ✅ View + Add contacts | ✅ Own profile |
| **procurement-officer** | ✅ View | ✅ View | ✅ View | ✅ Own profile |
| **supplier** | ❌ | ✅ Invited only | ❌ | ✅ Own profile |

---

## Troubleshooting

**"Permission denied" la Firestore:**
→ Verifică că ai aplicat `firestore.rules` și că utilizatorul are document în colecția `users` cu rol valid.

**Login nu funcționează:**
→ Verifică că domeniul e adăugat în Firebase Auth → Authorized domains.

**API-urile nu funcționează pe Vercel:**
→ Verifică `FIREBASE_SERVICE_ACCOUNT_KEY` — trebuie să fie JSON valid pe o singură linie.

**Evaluare AI nu funcționează:**
→ Setează `AI_API_KEY` în Vercel environment variables.
