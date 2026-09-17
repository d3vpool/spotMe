# SpotMe 📸

> **Find yourself in any event photo — instantly.**

SpotMe is an AI-powered event photo platform. Photographers upload bulk event photos; guests upload a single selfie and SpotMe's face recognition engine finds every photo they appear in — no scrolling, no manual tagging, no account required for guests.

---

## ✨ Features

- 🎉 **Event Management** — Create, edit, and delete named event galleries with cover images
- 📤 **Bulk Photo Upload** — Upload hundreds of photos at once with async background AI face indexing
- 📂 **Google Drive Import** — Paste a Google Drive folder link to import photos directly (public folders only)
- 🤖 **AI Face Search** — Upload a selfie → instantly get back every photo you appear in
- 🔗 **Public Share Links** — Share a unique link so guests can find their photos without signing up
- 🔒 **Private by Default** — Galleries are only accessible via the share token
- 🟡 **Face Bounding Boxes** — Matched photos highlight your face with a live-scaled overlay
- 📱 **Responsive UI** — Works on desktop and mobile

---

## 🛠️ Tech Stack

### Backend
| | |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript 5 |
| Framework | Express 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL + **pgvector** |
| AI / ML | face-api.js + TensorFlow.js Node |
| Auth | JWT + bcrypt |
| File Uploads | Multer |
| Job Queue | BullMQ + Redis |
| Validation | Zod |

### Frontend
| | |
|---|---|
| Language | TypeScript + React 19 |
| Build Tool | Vite 7 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS v4 |
| HTTP Client | Axios |
| Icons | Lucide React |

### AI Models (bundled)
- `ssd_mobilenetv1` — face detection
- `face_landmark_68` — 68-point landmark detection
- `face_recognition` — 128-D face descriptor extraction

---

## 🗂️ Project Structure

```
spotMe/
├── backend/
│   ├── models/              # face-api.js model weights
│   │   ├── face_landmark_68/
│   │   ├── face_recognition/
│   │   └── ssd_mobilenetv1/
│   ├── prisma/
│   │   └── schema.prisma    # DB schema (User, event, image, FaceEmbedding)
│   ├── src/
│   │   ├── controllers/     # event & user controllers
│   │   ├── db/              # Prisma client singleton
│   │   ├── middlewares/     # auth, upload, validation
│   │   ├── routes/          # Express routers
│   │   ├── services/        # face detection service
│   │   └── server.ts
│   └── uploads/             # uploaded images (local disk)
└── frontend/
    └── src/
        ├── components/      # reusable UI components
        ├── contexts/        # ToastContext
        ├── pages/           # all route pages
        ├── services/        # Axios API service layer
        ├── types/           # shared TypeScript types
        └── utils/           # auth (JWT storage)
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL with the **pgvector** extension enabled
- `pnpm` or `npm`

### 1. Clone the repo

```bash
git clone https://github.com/your-username/spotme.git
cd spotme
```

### 2. Setup the database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE spotme;"

# Enable pgvector extension (inside psql)
psql -U postgres -d spotme -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Start infrastructure

```bash
docker compose up -d   # starts PostgreSQL + Redis
```

### 4. Backend setup

```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npx prisma migrate dev
npm run dev &           # API server on port 3000
npm run worker &        # background face-processing worker
```

You need **two backend processes** running:
- `npm run dev` — the Express API server
- `npm run worker` — the BullMQ worker that processes face detection in the background

### 5. Frontend setup

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## 🔑 Environment Variables

### `backend/.env`

```env
PORT=3000
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/spotme
JWT_SECRET=your_secret_key
REDIS_URL=redis://localhost:6379
GOOGLE_DRIVE_API_KEY=your-google-drive-api-key
```

> **Getting a Google Drive API key:** Go to [Google Cloud Console](https://console.cloud.google.com/), create or select a project, enable the **Google Drive API**, then create an API key (restrict it to Drive API only).

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8003/api
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/users/signup` | — | Register a new user |
| `POST` | `/api/users/login` | — | Login, returns JWT |
| `POST` | `/api/events` | ✅ | Create a new event |
| `GET` | `/api/events` | ✅ | Get all events for current user |
| `GET` | `/api/events/:id` | ✅ | Get a single event by ID |
| `PATCH` | `/api/events/:id` | ✅ | Update event title/description |
| `DELETE` | `/api/events/:id` | ✅ | Delete an event |
| `POST` | `/api/events/:id/images` | ✅ | Upload photos to an event (enqueues background face indexing) |
| `POST` | `/api/events/:id/images/import-drive` | ✅ | Import images from a public Google Drive folder |
| `GET` | `/api/events/:id/upload-status/:batchId` | ✅ | Poll face-indexing progress for an upload batch |
| `POST` | `/api/events/:id/search` | ✅ | Search faces in a private event with a selfie |
| `GET` | `/api/events/share/:token` | — | View public event gallery |
| `POST` | `/api/events/share/:token/search` | — | Search faces in a public event with a selfie |

---

## 🧠 How It Works

```
UPLOAD FLOW
──────────────────────────────────────────────────
Photo upload  →  Multer saves to disk
              →  face-api.js detects all faces
              →  128-D embedding extracted per face
              →  Embedding + bounding box stored
                 in PostgreSQL via pgvector

SEARCH FLOW
──────────────────────────────────────────────────
Selfie upload →  face-api.js extracts descriptor
              →  pgvector <-> distance query runs
                 against all event embeddings
              →  Results filtered at distance < 0.5
              →  Matched image URLs + bounding boxes
                 returned to client
              →  Selfie temp file deleted
```

---

## 📄 Database Schema

```
User           — id, email, firstName, password
event          — id, title, description, shareToken, coverImageId, createdBy
image          — id, imageUrl, eventId
FaceEmbedding  — id, imageId, vector(128), boundingBox (JSON)
```

---

## 🚀 Roadmap

- [ ] Background job queue for face processing (BullMQ)
- [ ] Cloud storage for uploads (S3 / R2)
- [ ] pgvector HNSW index for large-scale events
- [ ] Multiple face matches per event per search
- [ ] Email / SMS share link delivery
- [ ] Admin dashboard with event analytics
- [ ] Google Drive OAuth flow for private folders

---

## 📅 Project History

- **Started:** March 16, 2026
- **Status:** Active development

---

## 📝 License

MIT © SpotMe
