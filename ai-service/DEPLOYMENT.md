# AI Service – Deploy to Server & Use from Frontend

## Quick summary

| Step | Action |
|------|--------|
| 1 | On the server: `cd ai-service`, create venv, `pip install -r requirements.txt`, create `.env` (see 1.3). |
| 2 | Run: `uvicorn app.main:app --host 0.0.0.0 --port 9090` (or use systemd/proxy in 1.4–1.5). |
| 3 | Test: `curl http://localhost:9090/health` and `curl http://localhost:9090/api/ai/models` (see **How to test** below). |
| 4 | Frontend: set `VITE_AI_BASE_URL_SERVER` (or `VITE_AI_BASE_URL`) to `http://<server>:9090/api/ai`, rebuild client. |
| 5 | Set `CORS_ORIGINS` in AI `.env` to your frontend origin(s). |

---

## 1. Deploy the AI service on a server

### 1.1 Requirements

- **Python 3.10+**
- Network access to:
  - Your **AssetRegister backend** (Spring Boot admin/data APIs)
  - **Azure OpenAI** (or other configured AI provider)

### 1.2 Install and run

On the AI server machine:

```bash
# Clone or copy the project; go to ai-service
cd ai-service

# Create virtualenv (recommended)
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate      # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment (see 1.3)
# Create/edit .env

# Run the service (default port 9090)
uvicorn app.main:app --host 0.0.0.0 --port 9090
```

- **`--host 0.0.0.0`** – listen on all interfaces so the frontend (or a reverse proxy) can reach it.
- **`--port 9090`** – default port; the frontend expects the **base path** to be `/api/ai` (see 2.2).

### 1.3 Environment (.env)

Create or edit `ai-service/.env`:

```env
# AssetRegister backend (required for data)
ASSETREGISTER_ADMIN_CONSOLE_BASE_URL=https://your-backend.example.com/api/admin
ASSETREGISTER_DATA_BASE_URL=https://your-backend.example.com/api/data

# Azure OpenAI (required for analysis/chat)
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# CORS: allow your frontend origin(s), comma-separated
CORS_ORIGINS=https://your-app.example.com,https://www.your-app.example.com
```

- **Backend URLs** – must be reachable from the AI server (same network or allowed firewall).
- **CORS** – set `CORS_ORIGINS` to the exact origin(s) of your frontend (e.g. `https://app.yourcompany.com`). No trailing slash.
- **Auth** – the AI service uses the **Bearer token** sent by the frontend on each request to call the backend; no separate USERNAME/PASSWORD in .env.

### 1.4 Run behind a reverse proxy (optional)

If the AI service is behind Nginx/IIS (e.g. at `https://api.yourcompany.com/ai`):

- Ensure the proxy forwards the full path (e.g. `/ai` → `http://localhost:9090`) and that the app is mounted so that **the public base path is `/api/ai`** (see 2.2).
- Or serve the app at root and rewrite so that requests to `https://api.yourcompany.com/api/ai/...` hit `http://localhost:9090/api/ai/...`.

Example Nginx location:

```nginx
location /api/ai/ {
    proxy_pass http://127.0.0.1:9090/api/ai/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Authorization $http_authorization;
}
```

### 1.5 Run as a service (e.g. systemd on Linux)

Example unit file `/etc/systemd/system/ai-sidecar.service`:

```ini
[Unit]
Description=AssetRegister AI Sidecar
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ai-service
ExecStart=/opt/ai-service/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 9090
Restart=always
EnvironmentFile=/opt/ai-service/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-sidecar
sudo systemctl start ai-sidecar
```

---

## 2. Use the AI service from the frontend

### 2.1 How the frontend talks to the AI service

- The **React app** uses `client/src/Service/ai.service.js`, which sends requests to a **base URL** (see below).
- Every request includes the **logged-in user’s Bearer token** (`Authorization` header). The AI service uses this token when calling the AssetRegister backend.

### 2.2 Base URL and path

- The AI service exposes routes under **`/api/ai`** (e.g. `/api/ai/analyze`, `/api/ai/chat`, `/api/ai/models`).
- Base URL in the frontend must point to that path:
  - **Correct:** `https://api.yourcompany.com/api/ai`  
    (no trailing slash; the client will append `/analyze`, `/chat`, etc.)
  - **Wrong:** `https://api.yourcompany.com` (missing `/api/ai`).

### 2.3 Configure the frontend (development and production)

Set the **AI service base URL** with the env variable **`VITE_AI_BASE_URL`**.

**Local development** (AI service on same machine, port 9090):

- In `client/.env` or `client/.env.local`:

  ```env
  VITE_AI_BASE_URL=http://localhost:9090/api/ai
  ```

- If you **don’t** set this, the code defaults to `http://localhost:9090/api/ai` (see `ai.service.js`).

**Production** (AI service on a server):

- In the environment used to **build** the React app (e.g. CI or your server), set:

  ```env
  VITE_AI_BASE_URL=https://your-ai-server.example.com/api/ai
  ```

- Replace `https://your-ai-server.example.com` with the real host (and port if not 443). Do **not** add a trailing slash.
- Rebuild the client so the value is baked in:

  ```bash
  cd client
  npm run build
  ```

### 2.4 Checklist for “use it on frontend”

| Item | Action |
|------|--------|
| AI service is running | Deploy and start the AI service (section 1). |
| CORS | Set `CORS_ORIGINS` in AI `.env` to your frontend origin(s). |
| Base URL | Set `VITE_AI_BASE_URL` to `https://<ai-server>/api/ai` and rebuild the client. |
| Auth | Users must be logged in; the app sends their token to the AI service. |
| HTTPS in production | Prefer HTTPS for both frontend and AI service. |

### 2.5 How to test

#### A. Test from the server (no frontend)

1. **Health check** (no auth, confirms the process is up):

   ```bash
   curl http://localhost:9090/health
   # Expected: {"status":"ok"}
   ```

2. **List AI models** (confirms Azure/OpenAI config is loaded; no Bearer token required):

   ```bash
   curl http://localhost:9090/api/ai/models
   # Expected: {"provider":"azure_openai","models":[{"id":"gpt-4o-mini",...}]} or similar
   ```

3. **Analyze** (requires a valid Bearer token from a logged-in user and a valid payload; usually tested from the frontend):

   ```bash
   curl -X POST http://localhost:9090/api/ai/analyze \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"orgId":"your-org","userId":"your-user","pageId":"data-console/reports/original-source","category":"jobs","filters":{}}'
   ```

   Replace `YOUR_JWT_TOKEN` with a real token from your app (e.g. copy from browser DevTools → Application → Local Storage → `auth-token`). If the backend or AI keys are wrong, you’ll get 5xx or 429.

#### B. Test from another machine (replace localhost)

Use the server’s hostname or IP and the same paths:

```bash
curl http://20.197.51.21:9090/health
curl http://20.197.51.21:9090/api/ai/models
```

If these fail, check firewall (port 9090) and that uvicorn was started with `--host 0.0.0.0`.

#### C. Test from the frontend

- Open the app, go to a page that has **AI Insights** (e.g. a job under **Original Source** or **By AR Resource**, or **Register detailed**).
- Click **Analyze with AI**. If the panel loads and shows insights, the frontend is using the AI service correctly.
- If you see **CORS** or **network** errors:
  - Ensure `CORS_ORIGINS` in `ai-service/.env` includes your frontend origin (e.g. `http://localhost:5173` for dev, or your production URL).
  - Ensure the client’s AI base URL is correct (`VITE_AI_BASE_URL` or `VITE_AI_BASE_URL_SERVER` in `client/.env` and rebuild).

#### D. Optional: OpenAPI docs

- Swagger UI: **http://localhost:9090/docs**
- ReDoc: **http://localhost:9090/redoc**

Use these to try endpoints from the browser (for `/analyze` and `/chat` you still need to add an `Authorization: Bearer <token>` header).

---

## Troubleshooting: Can't reach http://&lt;server&gt;:9090/health

If you get "can't reach the site", "connection refused", or timeouts when opening `http://20.197.51.21:9090/health` (or your server IP):

| Check | What to do |
|-------|------------|
| **1. Is the AI service running on that machine?** | On the **server** (20.197.51.21), open a terminal and run: `curl http://localhost:9090/health`. If this fails, the process isn’t running or isn’t listening on 9090. Start it with `uvicorn app.main:app --host 0.0.0.0 --port 9090`. |
| **2. Bind to all interfaces** | You must use **`--host 0.0.0.0`**. If you use `--host 127.0.0.1`, only localhost can connect. Restart: `uvicorn app.main:app --host 0.0.0.0 --port 9090`. |
| **3. Firewall on the server** | Allow **inbound TCP port 9090**. On **Windows**: Windows Defender Firewall → Advanced → Inbound rules → New rule → Port → TCP 9090. On **Linux**: e.g. `sudo ufw allow 9090` then `sudo ufw reload`. |
| **4. Cloud / network** | If 20.197.51.21 is in Azure/AWS/GCP, open port 9090 in the **VM/NSG/Security group** (inbound rule for TCP 9090 from your IP or 0.0.0.0/0 for test). |
| **5. Same network?** | Your browser/PC must be able to reach the server (same LAN, or VPN, or public IP). Try `ping 20.197.51.21`. If ping is blocked but the port is open, use `curl http://20.197.51.21:9090/health` from a machine that can reach the server. |
| **6. Wrong IP** | Confirm 20.197.51.21 is the machine where uvicorn is running. On that machine run `ipconfig` (Windows) or `ip addr` (Linux) and check the IP. |

**Quick on-server test:** On the server, run:

```bash
curl http://127.0.0.1:9090/health
```

If this returns `{"status":"ok"}`, the app is fine and the issue is firewall or network between your client and the server.

---

## 3. Summary

| Side | What to do |
|------|------------|
| **AI server** | Install deps, configure `.env` (backend URLs, Azure OpenAI, `CORS_ORIGINS`), run `uvicorn app.main:app --host 0.0.0.0 --port 9090` (or behind a proxy). |
| **Frontend** | Set `VITE_AI_BASE_URL` to `https://<ai-server>/api/ai`, rebuild; ensure users are logged in so the Bearer token is sent. |

The AI service does **not** connect to your database directly; it uses the AssetRegister backend APIs with the user’s token. Keep `.env` (especially `AZURE_OPENAI_API_KEY`) secure and out of version control.
