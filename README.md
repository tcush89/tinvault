# TinVault

A self-hosted, open-source pipe tobacco cellar inventory tracker. Log your tins and bulk tobacco, track aging status, filter and sort your collection, and import/export via CSV, all from a clean web UI.

**Stack:** React 18 · Go · PostgreSQL 16 · Docker Compose

---

## Quick Deploy

**Prerequisites:** Docker + Docker Compose, or [Docker Desktop](https://docs.docker.com/desktop/) (includes both)

On Linux/Mac, the quickest way to get Docker and Compose:
```bash
curl -fsSL https://get.docker.com | sh
```
See [github.com/docker/docker-install](https://github.com/docker/docker-install) for details. On Windows, use Docker Desktop.

The deploy script checks your environment, prompts for a port and password, pulls the images from Docker Hub, and starts TinVault. Pick the version for your OS:

### Linux / Mac

```bash
curl -fsSL https://raw.githubusercontent.com/tcush89/tinvault/main/deploy.sh -o deploy.sh
bash deploy.sh
```

### Windows

Open **PowerShell** and run:

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/tcush89/tinvault/main/deploy.ps1 -OutFile deploy.ps1
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

> **Why `-ExecutionPolicy Bypass`?** Windows blocks unsigned scripts by default. This flag allows the deploy script to run for this one invocation without changing your system policy permanently.

### Or clone and run

```bash
# Mac / Linux
git clone https://github.com/tcush89/tinvault && cd tinvault
bash deploy.sh
```

```powershell
# Windows (PowerShell)
git clone https://github.com/tcush89/tinvault; cd tinvault
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

Both scripts will:
- Verify Docker and Docker Compose are installed and the daemon is running
- Prompt for a port (default `3000`) and a PostgreSQL password (auto-generated if blank)
- Write a `.env` and `docker-compose.yml` in the current directory
- Pull the latest images and start all services

Open **http://localhost:PORT** when it finishes.

---

## SSL & Reverse Proxy

> TinVault has no built-in authentication. It is designed for personal, self-hosted use on a trusted network. For any access beyond `localhost`, place it behind a reverse proxy that handles HTTPS and, optionally, authentication.

This applies even on an internal home network. A reverse proxy with a self-signed or Let's Encrypt is easy to set up.

### Caddy (recommended — automatic HTTPS)

```caddyfile
tinvault.example.com {
    basicauth {
        alice JDJhJDE0JHBvaW50...  # caddy hash-password
    }
    reverse_proxy localhost:3000
}
```

Generate a password hash: `caddy hash-password`

### nginx

```nginx
server {
    listen 443 ssl;
    server_name tinvault.example.com;

    ssl_certificate     /etc/ssl/certs/tinvault.crt;
    ssl_certificate_key /etc/ssl/private/tinvault.key;

    location / {
        auth_basic "TinVault";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Generate credentials: `htpasswd -c /etc/nginx/.htpasswd alice`

---

## Remote Access

TinVault binds to a local port. To reach it from outside your home network, Tailscale or Wireguard are recommended.

---

## Manual Docker Compose Setup

If you prefer to manage the compose file yourself:

```bash
# Mac / Linux
git clone https://github.com/tcush89/tinvault
cd tinvault
cp .env.example .env
# Edit .env to set POSTGRES_PASSWORD and PORT
docker compose up -d
```

```powershell
# Windows (PowerShell)
git clone https://github.com/tcush89/tinvault
cd tinvault
Copy-Item .env.example .env
# Edit .env to set POSTGRES_PASSWORD and PORT
docker compose up -d
```

To build from source instead of pulling pre-built images:

```bash
docker compose build
docker compose up -d
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | `tinvault` | PostgreSQL password (change this) |
| `PORT` | `3000` | Host port TinVault is exposed on |

---

## Updating

```bash
docker compose pull
docker compose up -d
```

Database migrations run automatically on startup — no manual steps needed.

---

## Backup & Restore

**Backup:**
```bash
docker compose exec postgres pg_dump -U tinvault tinvault > backup.sql
```

**Restore:**
```bash
docker compose exec -T postgres psql -U tinvault tinvault < backup.sql
```

PostgreSQL data is stored in the `postgres_data` Docker volume and survives container restarts and image updates.

---

## Local Development

**Backend** (Go 1.23+):

```bash
cd backend
go mod tidy
DATABASE_URL=postgres://tinvault:tinvault@localhost:5432/tinvault?sslmode=disable go run ./cmd/server
```

**Frontend** (Node 20+):

```bash
cd frontend
npm install
npm run dev   # proxies /api → localhost:8080
```

**Database only** (without building backend):

```bash
docker compose up postgres
```

### Publishing images to Docker Hub

Update the `image:` tags in `docker-compose.yml` to your Docker Hub username, then:

```bash
docker compose build
docker compose push
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Cellar statistics |
| GET | `/api/tins` | List tins (`search`, `blend_type`, `status` query params) |
| POST | `/api/tins` | Create tin |
| GET | `/api/tins/:id` | Get tin |
| PUT | `/api/tins/:id` | Update tin |
| DELETE | `/api/tins/:id` | Delete tin |
| GET | `/api/brands` | Brand autocomplete suggestions (`q` query param) |
| GET | `/api/blends` | Blend autocomplete suggestions (`q` query param) |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/reset` | Reset all tins and restore default settings |
| GET | `/api/export` | Download cellar as CSV |
| GET | `/api/import/template` | Download blank CSV import template |
| POST | `/api/import` | Bulk import tins from CSV (`file` multipart field) |

---

## Data Model

| Field | Type | Description |
|-------|------|-------------|
| `brand` | string | Manufacturer (e.g. `Peterson`) |
| `blend_name` | string | Blend name (e.g. `Standard Mixture`) |
| `blend_type` | string | `Virginia`, `English/Latakia`, `Burley`, `Aromatic`, etc. |
| `container_type` | string | `tin` or `bulk` |
| `quantity` | int | Number of tins/units |
| `tin_size_grams` | int | Weight per tin in grams |
| `year` | int | Production or purchase year |
| `purchase_date` | date | When purchased (`YYYY-MM-DD`) |
| `opened_date` | date | When opened (`YYYY-MM-DD`) |
| `status` | string | See default statuses below |
| `notes` | text | Free-form tasting notes |

### Default statuses

| Value | Label |
|-------|-------|
| `aging_tin` | Aging (unopened tin) |
| `aging_jar` | Aging (mason jar) |
| `in_rotation` | In Rotation |

Status values and labels are fully configurable under **Settings → Statuses**.

---

## CSV Import & Export

### Exporting

Click **Export CSV** on the Cellar page. The download contains your full cellar with all fields.

### Importing

1. Go to **Settings → Import Cellar** and click **Download CSV template**, or use `tinvault_import_template.csv` from the project root.
2. Fill in your tins — one row per tin. Delete the example rows first.
3. Upload under **Settings → Import Cellar**.

Imports are **additive** — existing tins are never modified or deleted.

### Column reference

| Column | Required | Format | Notes |
|--------|----------|--------|-------|
| `brand` | ✓ | text | e.g. `Peterson` |
| `blend_name` | ✓ | text | e.g. `Standard Mixture` |
| `blend_type` | | text | Defaults to `Other` if blank |
| `container_type` | | `tin` or `bulk` | Defaults to `tin` |
| `quantity` | | integer ≥ 1 | Defaults to `1` |
| `tin_size_grams` | | integer (grams) | Defaults to `50` |
| `year` | | 1900–2099 | Leave blank if unknown |
| `purchase_date` | | `YYYY-MM-DD` | e.g. `2021-06-15` |
| `opened_date` | | `YYYY-MM-DD` | Leave blank if unopened |
| `status` | | text | Internal ID. Defaults to `aging_tin`. See Settings → Statuses for your configured values. |
| `notes` | | text | Wrap in quotes if the text contains commas |

**Tips:**
- Status values are the internal IDs shown in Settings (e.g. `aging_tin`), not the display labels.
- Tin size is stored in grams. The gram value for each weight option is shown in Settings → Tin/Bulk Weight.
- If any row has a validation error the entire import is rejected. Fix reported errors and re-upload.
- Columns can be in any order as long as the header row matches.

---

## Contributing

Issues and pull requests welcome. To become a contributor, please email tinvault29@gmail.com. Otherwise, open an issue to discuss changes before submitting large PRs.
