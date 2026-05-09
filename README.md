# Certificate Engine PoC

A three-stage certificate workflow: **Admin → Authority → Program**.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 11 + Fabric.js 4 + Bootstrap 4 |
| Backend | .NET Core 3.1 Web API |
| PDF | PuppeteerSharp (headless Chromium) |

---

## Project Structure

```
design-test/
├── frontend/          Angular app
│   └── src/app/
│       ├── admin/     Stage 1 — canvas designer
│       ├── authority/ Stage 2 — signature & lock enforcement
│       ├── program/   Stage 3 — variable substitution + PDF
│       └── services/  TemplateService (API + localStorage)
└── backend/           .NET Core 3.1 API
    ├── Controllers/   TemplateController + PdfController
    ├── Services/      VariableService, PdfService, TemplateStore
    └── Models/        Template
```

---

## Running the app

### Frontend

```bash
cd frontend
npm install
npm start          # http://localhost:4200
```

### Backend

```bash
cd backend
dotnet restore
dotnet run         # http://localhost:5000
```

The Angular dev server proxies `/api/*` to `http://localhost:5000` via `proxy.conf.json`.

---

## Workflow

### Step 1 — Admin
- Upload a background image (with opacity slider).
- Add text, rectangles, lines, or images.
- Insert variable placeholders: `{{trainee_name}}`, `{{course_title}}`, etc.
- **Lock layers** you don't want Authority users to touch.
- Click **Save Template** → JSON saved to backend + localStorage.

### Step 2 — Authority
- Template loads; admin-locked objects have `selectable: false, evented: false`.
- Upload a PNG signature image (transparency supported).
- Drag signature to final position.
- Click **Export & Continue** → signed JSON saved.

### Step 3 — Program
- All detected `{{placeholders}}` listed automatically.
- Fill in values per trainee.
- Click **Apply Variables** to preview the resolved certificate.
- Click **Generate PDF** → POST to `/api/generate-pdf/{id}`.
  - Puppeteer renders Fabric canvas in headless Chromium → returns PDF.
  - If backend is offline, falls back to high-res PNG export.

---

## Backend API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/template` | Save a template |
| `GET` | `/api/template/{id}` | Get template by ID |
| `GET` | `/api/template/latest` | Get most recently saved template |
| `GET` | `/api/template/{id}/placeholders` | List detected `{{keys}}` |
| `POST` | `/api/generate-pdf/{id}` | Generate PDF (body: `{"key":"value"}`) |
| `POST` | `/api/generate-pdf/preview` | Generate PDF from raw JSON |

---

## Key Design Decisions

- **Lock enforcement**: Admin sets `adminLocked: true` on any Fabric object. Authority stage re-enforces `selectable/evented/hasControls = false` at load time — no client-side bypass possible since all lock state is in the persisted JSON.
- **Variable replacement**: `VariableService` uses a pre-compiled `Regex` with a single-pass `Replace` callback — O(n) over the JSON string regardless of variable count.
- **PDF strategy**: Puppeteer loads the exact same Fabric.js CDN script used by the frontend, loads the JSON, waits for `__RENDER_DONE__` flag, then calls `page.PdfAsync()` at 1:1 pixel scale.
- **Offline mode**: All stages work without a running backend using `localStorage` as fallback. PDF falls back to `canvas.toDataURL()` 2× PNG.
