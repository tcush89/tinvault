# TinVault

A self-hosted pipe tobacco cellar tracker. Log your tins and bulk tobacco, track aging status, filter and sort your collection, and import/export via CSV — all from a clean web UI with no cloud account required.

**Stack:** React 18 · Go · PostgreSQL 16 · Docker Compose

---

## Quick Deploy

The fastest path: download and run the deploy script. It checks your environment, prompts for a port and password, pulls the images from Docker Hub, and starts TinVault.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) with Docker Compose

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/tinvault/main/deploy.sh -o deploy.sh
bash deploy.sh
```

Or clone the repo and run it directly:

```bash
git clone https://github.com/YOUR_USERNAME/tinvault
cd tinvault
bash deploy.sh
```

The script will:
- Verify Docker and Docker Compose are installed and the daemon is running
- Prompt for a port (default `3000`) and a PostgreSQL password (auto-generated if blank)
- Write a `.env` and `docker-compose.yml` in the current directory
- Pull the latest images and start all services

Open **http://localhost:PORT** when it finishes.

---

## SSL & Reverse Proxy

> **TinVault has no built-in authentication.** It is designed for personal, self-hosted use on a trusted network. For any access beyond `localhost`, place it behind a reverse proxy that handles HTTPS and, optionally, authentication.

This applies even on an internal home network — a reverse proxy with a self-signed or local CA certificate is easy to set up and prevents credentials (if you add auth) from travelling in plaintext.

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

### Traefik

Add TinVault as a Docker Compose service behind Traefik with labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.tinvault.rule=Host(`tinvault.example.com`)"
  - "traefik.http.routers.tinvault.entrypoints=websecure"
  - "traefik.http.routers.tinvault.tls.certresolver=letsencrypt"
```

---

## Remote Access

TinVault binds to a local port. To reach it from outside your home network:

### Tailscale (easiest)

[Tailscale](https://tailscale.com) creates a private WireGuard mesh between your devices. Install it on your server and any client, then open `http://<tailscale-ip>:3000`. No port forwarding or firewall changes needed.

### WireGuard

Self-host the VPN. With an active tunnel, TinVault is reachable at its LAN address as if you were home. Minimal server config (`/etc/wireguard/wg0.conf`):

```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <server-private-key>

[Peer]
PublicKey = <client-public-key>
AllowedIPs = 10.0.0.2/32
```

---

## Manual Docker Compose Setup

If you prefer to manage the compose file yourself:

```bash
git clone https://github.com/YOUR_USERNAME/tinvault
cd tinvault
cp .env.example .env
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

Issues and pull requests welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) if present, otherwise open an issue to discuss changes before submitting large PRs.
