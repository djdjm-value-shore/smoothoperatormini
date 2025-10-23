# Complete Railway Deployment Tutorial for Multi-Service Projects (2025)

**Target Audience**: Complete Railway beginners
**Project Type**: Multi-service deployment (Vite + React + FastAPI)
**Last Updated**: October 2025

---

## Table of Contents

1. [Railway Basics](#1-railway-basics)
2. [Pricing and Free Trial](#2-pricing-and-free-trial-2025)
3. [Multi-Service Setup](#3-multi-service-setup)
4. [Service Communication](#4-service-communication)
5. [Service-Specific Deployment](#5-service-specific-deployment)
6. [Configuration Files](#6-configuration-files)
7. [Complete Deployment Workflow](#7-complete-deployment-workflow)
8. [Environment Variables Management](#8-environment-variables-management)
9. [Networking Deep Dive](#9-networking-deep-dive)
10. [Common Issues and Troubleshooting](#10-common-issues-and-troubleshooting)
11. [Monitoring and Logs](#11-monitoring-and-logs)
12. [Complete Configuration Examples](#12-complete-configuration-examples)

---

## 1. Railway Basics

### What is Railway?

Railway is a modern, Git-based deployment platform that simplifies application deployment through:

- **Automatic Detection:** Analyzes your repository and automatically configures build settings
- **Container-First:** Uses Docker containers (either auto-generated via Nixpacks or custom Dockerfiles)
- **Git Integration:** Deploys automatically from GitHub, GitLab, or Bitbucket on push
- **Multi-Service Support:** Single project can contain multiple interconnected services
- **Zero-Config Networking:** Automatic internal service discovery and public domain generation

### How It Works

1. **Connect Repository:** Link your GitHub/GitLab/Bitbucket repository to Railway
2. **Automatic Build:** Railway detects Dockerfile or uses Nixpacks to build container
3. **Deploy:** Container runs with automatic health checks
4. **Generate Domain:** Public URL created automatically (format: `*.up.railway.app`)
5. **Auto-Deploy:** Every push to configured branch triggers new deployment

---

## 2. Pricing and Free Trial (2025)

### Free Trial

- **One-time credit:** $5 USD
- **Expiration:** 30 days from signup
- **RAM Limit:** 1 GB per service
- **CPU:** Shared vCPU cores (not dedicated)
- **What happens after:** Services shut down unless you upgrade

**Important:** Railway no longer has a recurring free tier. The 500-hour monthly free plan was discontinued in 2023.

### Paid Plans

**Hobby Plan:**
- **Monthly cost:** Subscription fee + usage
- **Included credit:** $5 of usage
- **Billing:** If usage ≤ $5, you only pay subscription; if > $5, you pay subscription + overage
- **Features:** Same as trial, dedicated resources

**Pro Plan:**
- **Monthly cost:** Higher subscription + usage
- **Included credit:** $20 of resource usage
- **Additional features:** Private Docker registry support, priority support
- **Billing:** Subscription + any usage over $20

### Usage Costs

- **Egress bandwidth:** $0.10 per GB (public networking only)
- **Private networking:** Free (no egress charges between services)

---

## 3. Multi-Service Setup

### Creating a Project with Multiple Services

**Step 1: Create Empty Project**

1. Go to Railway dashboard (https://railway.app)
2. Click **New Project**
3. Select **Empty Project**
4. You'll land on the **Project Canvas** (your mission control)

**Step 2: Add First Service (Web - Vite + React)**

1. Click **New** button (top-right) or press `Cmd+K` / `Ctrl+K` → type "new service"
2. Choose **GitHub Repo** option
3. Select your frontend repository
4. Railway will detect Dockerfile or auto-configure with Nixpacks

**Step 3: Add Second Service (API - FastAPI)**

1. Click **New** button again
2. Choose **GitHub Repo**
3. Select your backend repository
4. Railway detects Python/FastAPI and configures accordingly

**Step 4: Configure Services**

- Click each service tile to access Settings
- Configure environment variables
- Generate public domains

---

## 4. Service Communication

### Internal Private Networking

Railway creates an encrypted **IPv6 mesh network** using WireGuard tunnels between all services in a project.

**Key Features:**

- **Automatic DNS:** Every service gets `<service-name>.railway.internal` domain
- **Zero Cost:** No egress fees for internal traffic
- **Encrypted:** Secure WireGuard tunnels
- **Protocols:** Supports TCP, UDP, HTTP

**Important Implementation Notes:**

1. **Use HTTP (not HTTPS):** `http://api-service.railway.internal:8000`
2. **Explicit Ports:** Set fixed ports as environment variables (cannot reference `$PORT` between services)
3. **Environment Scope:** Only works within same project/environment

**Example Configuration:**

```bash
# API Service environment variables
API_PORT=8000  # Fixed port for internal communication

# Web Service environment variables
VITE_API_URL=http://api-service.railway.internal:8000
```

### Public Networking

**Generating Public Domains:**

1. Click on service tile → **Settings**
2. Navigate to **Networking** → **Public Networking**
3. Click **Generate Domain**
4. Railway creates: `<random-subdomain>.up.railway.app`
5. Automatic HTTPS with Let's Encrypt certificate

**Custom Domains:**

- Add CNAME record pointing to Railway domain
- Automatic SSL certificate generation
- Configured in same Networking section

---

## 5. Service-Specific Deployment

### 5.1 Vite + React (Web Service)

#### Dockerfile for Vite + React + Nginx

Create `Dockerfile` in your frontend repository:

```dockerfile
# ============================================
# Stage 1: Build React application with Vite
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json ./

# Install dependencies (use npm ci for reproducible builds)
RUN npm ci --silent

# Copy source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build

# ============================================
# Stage 2: Production - Nginx server
# ============================================
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Railway will override with $PORT)
EXPOSE 80

# Start nginx (note: Railway requires specific port binding)
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration

Create `nginx.conf` in your frontend repository:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # Support React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### Environment Variables (Railway Web Service)

**Required Variables:**

```bash
PORT=80  # CRITICAL: Railway requires this
VITE_API_URL=https://your-api-service.up.railway.app
```

**Build Arguments:**

In Railway Settings → Variables, add:
- `VITE_API_URL`: Your API public URL (or internal URL if using private networking)

#### .dockerignore for Frontend

Create `.dockerignore`:

```
node_modules/
npm-debug.log
.git
.gitignore
.env
.env.local
.env.production
.DS_Store
dist/
coverage/
.vscode/
.idea/
*.log
.cache
```

#### Build Configuration

**Start Command:** Not required (nginx starts automatically)

**Build Command:** Not required (handled by Dockerfile)

**Port:** Railway automatically detects port 80 from Dockerfile

---

### 5.2 FastAPI (API Service)

#### Dockerfile for FastAPI + Uvicorn

Create `Dockerfile` in your backend repository:

```dockerfile
# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies (if needed)
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (Railway overrides with $PORT)
EXPOSE 8000

# Start uvicorn (CRITICAL: must use 0.0.0.0 and $PORT)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
```

**Key Points:**

- **Host binding:** MUST use `0.0.0.0` (not `127.0.0.1`)
- **Port:** Use `$PORT` environment variable from Railway
- **Workers:** `--workers 2` for production (adjust based on memory)
- **User:** Non-root user for security best practice

#### Alternative: Using `fastapi run` (Modern Approach)

```dockerfile
# ... (same as above until CMD)

# Modern approach using fastapi CLI
CMD fastapi run app/main.py --host 0.0.0.0 --port ${PORT:-8000}
```

#### CORS Configuration for Railway

In your FastAPI application (`app/main.py`):

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CRITICAL: Configure CORS for Railway domains
origins = [
    "http://localhost:5173",  # Local development
    "http://localhost:3000",
    "https://your-frontend.up.railway.app",  # Replace with your actual domain
    # Add custom domains here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # DO NOT use ["*"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "API is running"}
```

**Production CORS Best Practices:**

1. **Never use `allow_origins=["*"]` in production** - security risk
2. **Use HTTPS URLs** for Railway domains (Railway auto-provides SSL)
3. **Update CORS** after generating Railway domain
4. **Use environment variables** for dynamic origins:

```python
import os

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
```

Then in Railway:
```bash
CORS_ORIGINS=https://frontend.up.railway.app,https://custom-domain.com
```

#### Environment Variables (Railway API Service)

**Required Variables:**

```bash
PORT=8000  # Railway provides this automatically, but can be set manually
```

**Optional Variables:**

```bash
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://your-frontend.up.railway.app
API_SECRET_KEY=your-secret-key
```

#### .dockerignore for Backend

Create `.dockerignore`:

```
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.env
.env.local
.venv
env/
venv/
ENV/
.git
.gitignore
.pytest_cache/
.coverage
htmlcov/
.tox/
.mypy_cache/
.ruff_cache/
*.log
.DS_Store
.vscode/
.idea/
```

---

## 6. Configuration Files

### Do You Need railway.json or railway.toml?

**Short Answer:** No, not required for most deployments.

**When to Use:**

- **Monorepo deployments** (multiple services in one repository)
- **Custom build paths** or root directory overrides
- **Complex build configurations** that differ from dashboard settings

### railway.toml Example

If you need it, create `railway.toml` in repository root:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"
buildCommand = "echo 'Building...'"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### railway.json Example

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "./Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Priority:** Config file settings **override** dashboard settings for that deployment only.

---

## 7. Complete Deployment Workflow

### Prerequisites

- GitHub/GitLab/Bitbucket account with repositories
- Railway account (sign up at https://railway.app)
- Dockerfiles in both repositories
- Git repositories pushed to remote

### Step-by-Step: From Zero to Deployed

#### Phase 1: Account Setup

1. **Create Railway Account**
   - Visit https://railway.app
   - Click "Login" → "Start a New Project"
   - Authenticate with GitHub (recommended for easier integration)
   - You receive $5 trial credit (expires in 30 days)

2. **Connect GitHub**
   - Railway requests GitHub permissions
   - Approve repository access (you can limit to specific repos)

#### Phase 2: Create Project

1. **New Project**
   - Click **New Project** from dashboard
   - Select **Empty Project**
   - Name your project (e.g., "SmoothOperator")

#### Phase 3: Deploy Web Service (Vite + React)

1. **Add Service**
   - Click **New** button → **GitHub Repo**
   - Select your frontend repository
   - Railway analyzes and detects Node.js/Dockerfile

2. **Configure Build**
   - Railway should auto-detect Dockerfile
   - If not: Settings → Build → Builder → Select "Dockerfile"
   - Set Dockerfile Path: `./Dockerfile`

3. **Set Environment Variables**
   - Click service → **Variables** tab
   - Add variables:
     ```bash
     PORT=80
     VITE_API_URL=http://localhost:8000  # Temporary, update after API deployment
     ```
   - Click **Add Variable** for each

4. **Deploy**
   - Click **Deploy** (or push to GitHub triggers auto-deploy)
   - Watch build logs in real-time
   - Wait for "Build Successful" → "Deployment Live"

5. **Generate Public Domain**
   - Service tile shows "Generate Domain" prompt
   - Click **Settings** → **Networking** → **Public Networking**
   - Click **Generate Domain**
   - Copy the URL (e.g., `https://smoothoperator-web.up.railway.app`)

#### Phase 4: Deploy API Service (FastAPI)

1. **Add Second Service**
   - Click **New** → **GitHub Repo**
   - Select backend repository
   - Railway detects Python/Dockerfile

2. **Configure Build**
   - Verify Builder: Dockerfile
   - Dockerfile Path: `./Dockerfile`

3. **Set Environment Variables**
   - Click service → **Variables** tab
   - Add variables:
     ```bash
     PORT=8000  # Railway auto-provides, but explicit is better
     DATABASE_URL=postgresql://...  # If using database
     CORS_ORIGINS=https://smoothoperator-web.up.railway.app
     ```

4. **Deploy**
   - Auto-deploys on service creation
   - Monitor build logs for errors

5. **Generate Public Domain**
   - Settings → Networking → Generate Domain
   - Copy API URL (e.g., `https://smoothoperator-api.up.railway.app`)

#### Phase 5: Connect Services

1. **Update Web Service Environment**
   - Go to Web service → **Variables**
   - Update `VITE_API_URL`:
     ```bash
     VITE_API_URL=https://smoothoperator-api.up.railway.app
     ```
   - Save (triggers automatic redeployment)

2. **Update API CORS**
   - Update `CORS_ORIGINS` in API service variables:
     ```bash
     CORS_ORIGINS=https://smoothoperator-web.up.railway.app
     ```
   - Save (triggers redeployment)

#### Phase 6: Test Deployment

1. **Visit Web URL**
   - Open `https://smoothoperator-web.up.railway.app`
   - Verify page loads

2. **Test API Connection**
   - Open browser DevTools → Network tab
   - Interact with app features that call API
   - Verify requests succeed (no CORS errors)

3. **Check Logs**
   - Click each service → **Deployments** tab
   - View logs for errors
   - Both services should show successful requests

---

## 8. Environment Variables Management

### Railway-Provided Variables

**Automatically Available:**

```bash
PORT                    # Port your app MUST listen on (random, changes per deploy)
RAILWAY_ENVIRONMENT     # Current environment (production, staging, etc.)
RAILWAY_SERVICE_NAME    # Name of the service
RAILWAY_PROJECT_NAME    # Name of the project
RAILWAY_DEPLOYMENT_ID   # Unique deployment ID
```

**Critical:** Always use `$PORT` in your start command - never hardcode.

### Setting Variables per Service

**Via Dashboard:**

1. Click service tile
2. Navigate to **Variables** tab
3. Click **New Variable**
4. Enter `KEY=value`
5. Click **Add**

**Variable Types:**

- **Raw Variables:** Plain text key-value pairs
- **Shared Variables:** Accessible across multiple services
- **Service Variables:** Unique to one service

### Shared Variables Across Services

**Use Case:** Database URL, API keys used by multiple services

**How to Create:**

1. Go to **Project Settings** (gear icon)
2. Navigate to **Shared Variables**
3. Click **New Shared Variable**
4. Enter name and value
5. Select which services can access it

**Referencing Shared Variables:**

Railway creates service-level variables that reference shared ones:

```bash
# Shared variable namespace: shared.*
DATABASE_URL=${{shared.DATABASE_URL}}
```

### Secrets Management

**Best Practices:**

1. **Never commit secrets to Git** (use `.env` locally, not in repo)
2. **Use Railway Variables** for all secrets in production
3. **Rotate secrets regularly** via Railway dashboard
4. **Environment-specific secrets** using Railway Environments

**Secret Examples:**

```bash
API_SECRET_KEY=your-256-bit-secret
DATABASE_PASSWORD=complex-password
JWT_SECRET=another-secret
STRIPE_API_KEY=sk_live_...
```

### Environment-Specific Configuration

**Development vs Production:**

Railway supports multiple environments (Production, Staging, Dev):

1. **Create Environment:** Project Settings → Environments → New
2. **Deploy to Environment:** Select from dropdown during deployment
3. **Different Variables:** Each environment has separate variable sets

---

## 9. Networking Deep Dive

### Public vs Private Networking

**Public Networking:**

- **Purpose:** Internet-facing services
- **Cost:** $0.10/GB egress
- **Security:** HTTPS by default (Let's Encrypt)
- **Use for:** User-facing web apps, public APIs

**Private Networking:**

- **Purpose:** Service-to-service communication
- **Cost:** Free (no egress charges)
- **Security:** Encrypted WireGuard tunnels (IPv6)
- **Use for:** Database connections, internal API calls

### Internal Service Communication

**DNS Pattern:**

```
<service-name>.railway.internal:<port>
```

**Examples:**

```bash
# API service listens on port 8000
API_INTERNAL_URL=http://api-service.railway.internal:8000

# Database service (PostgreSQL)
DATABASE_URL=postgresql://postgres.railway.internal:5432/mydb

# Redis cache
REDIS_URL=redis://redis-service.railway.internal:6379
```

**Critical Implementation Notes:**

1. **Fixed Ports Required:** Cannot use `$PORT` variable for internal communication
   ```bash
   # API service variables
   PORT=${{PORT}}              # For public Railway access
   INTERNAL_PORT=8000          # For internal service communication
   ```

2. **Start Command Must Bind Both:**
   ```bash
   # Wrong (only binds to Railway's random port)
   uvicorn app:app --host 0.0.0.0 --port $PORT

   # Right (binds to both)
   uvicorn app:app --host 0.0.0.0 --port ${INTERNAL_PORT:-8000}
   ```

3. **Protocol:** Always `http://` (not `https://`) for internal

### CORS for Cross-Service Calls

**Scenario:** React app (web service) calls FastAPI (api service)

**API CORS Configuration:**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Get origins from environment variable
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

**Railway Variables:**

```bash
# API Service
CORS_ORIGINS=https://smoothoperator-web.up.railway.app,https://custom-domain.com

# Web Service
VITE_API_URL=https://smoothoperator-api.up.railway.app
```

---

## 10. Common Issues and Troubleshooting

### Issue 1: "Application Failed to Respond"

**Symptoms:**
- Deployment shows "Live" but returns 503 error
- "Application failed to respond" message

**Causes & Solutions:**

1. **Not Listening on $PORT**
   ```bash
   # Wrong
   uvicorn app:app --host 0.0.0.0 --port 8000

   # Right
   uvicorn app:app --host 0.0.0.0 --port $PORT
   ```

2. **Wrong Host Binding**
   ```bash
   # Wrong (localhost only)
   uvicorn app:app --host 127.0.0.1 --port $PORT

   # Right (all interfaces)
   uvicorn app:app --host 0.0.0.0 --port $PORT
   ```

3. **Port Mismatch**
   - Check: Settings → Networking → Ensure target port matches listening port
   - Verify: Logs show "Uvicorn running on http://0.0.0.0:XXXX"

### Issue 2: Port Binding Errors

**Error Message:** "Port already in use" or "Cannot bind to port"

**Solutions:**

1. **Remove Hardcoded Ports**
   ```dockerfile
   # Wrong
   CMD ["uvicorn", "app:app", "--port", "8000"]

   # Right
   CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
   ```

2. **Verify Environment Variable**
   - Railway provides `PORT` automatically
   - Check Variables tab to confirm it exists
   - Value should be present (even if empty initially)

### Issue 3: Memory Limit Exceeded

**Symptoms:**
- Container starts then immediately crashes
- Logs show "Out of Memory" or "Killed"
- App works locally but fails on Railway

**Solutions:**

1. **Check Memory Usage**
   - Free trial: 1GB limit per service
   - View: Service → Metrics → Memory graph

2. **Optimize Application**
   ```dockerfile
   # Reduce workers based on available memory
   CMD uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1
   ```

3. **Upgrade Plan**
   - Hobby plan: Same 1GB (need to redeploy after upgrade)
   - Pro plan: Configurable limits

4. **Redeploy After Upgrade**
   - Restart doesn't increase limits
   - Must trigger new deployment (push to Git)

### Issue 4: CORS Errors

**Symptoms:**
- Browser console: "No 'Access-Control-Allow-Origin' header"
- Frontend can't fetch API data
- Works in development, fails in production

**Solutions:**

1. **Check Protocol**
   ```bash
   # Wrong (Railway uses HTTPS)
   VITE_API_URL=http://smoothoperator-api.up.railway.app

   # Right
   VITE_API_URL=https://smoothoperator-api.up.railway.app
   ```

2. **Update CORS Origins**
   ```python
   # API code - include actual Railway domain
   origins = [
       "https://smoothoperator-web.up.railway.app",  # Not "http://"
   ]
   ```

3. **Verify Environment Variables**
   - API service: Check `CORS_ORIGINS` value
   - Web service: Check `VITE_API_URL` value
   - Both should use `https://`

4. **Redeploy After Changes**
   - Changing environment variables triggers automatic redeploy
   - Clear browser cache after redeployment

### Issue 5: Build Failures

**Symptoms:**
- Deployment stuck at "Building"
- Build logs show errors
- "Build failed" status

**Common Causes:**

1. **Missing Dependencies**
   ```bash
   # For Python
   pip freeze > requirements.txt

   # For Node.js
   npm install  # Updates package-lock.json
   ```

2. **Incorrect Dockerfile Path**
   - Settings → Build → Dockerfile Path
   - Verify: `./Dockerfile` (not `/Dockerfile` or `Dockerfile`)

3. **Build Context Issues**
   - Check `.dockerignore` isn't excluding necessary files
   - Verify `COPY` commands in Dockerfile

4. **Out of Memory During Build**
   - Reduce build parallelism
   - Use `npm ci --silent` instead of `npm install`
   - Optimize Docker layer caching

**Debugging Steps:**

1. **Review Build Logs**
   - Click deployment → View Logs
   - Look for red error messages
   - Scroll through entire log (errors often mid-log)

2. **Test Locally**
   ```bash
   # Build Docker image locally
   docker build -t test-image .

   # Run container
   docker run -p 8000:8000 -e PORT=8000 test-image
   ```

3. **Check Railway Status**
   - Visit https://status.railway.app
   - Verify no platform-wide issues

### Issue 6: Environment Variables Not Working

**Symptoms:**
- App can't find environment variables
- `process.env.VITE_API_URL` is undefined
- Database connection fails

**Solutions:**

1. **Vite Variables Require Rebuild**
   - Vite embeds env vars at build time
   - Changing `VITE_*` variables requires redeployment
   - Click service → Redeploy (or push to Git)

2. **Variable Naming**
   ```bash
   # Vite requires VITE_ prefix for client-side access
   VITE_API_URL=https://...  # Accessible in React
   API_URL=https://...        # NOT accessible in React
   ```

3. **Verify Variable Exists**
   - Service → Variables tab
   - Ensure no typos in variable names
   - Check for trailing spaces

4. **Reference Variables Correctly**
   ```javascript
   // Wrong (process.env doesn't exist in browser)
   const apiUrl = process.env.API_URL;

   // Right (Vite exposes via import.meta.env)
   const apiUrl = import.meta.env.VITE_API_URL;
   ```

### Issue 7: Private Networking Not Working

**Symptoms:**
- Services can't communicate internally
- "Connection refused" errors
- Works with public URLs, fails with `railway.internal`

**Solutions:**

1. **Use Fixed Ports**
   ```bash
   # API service variables
   PORT=${{PORT}}          # For Railway public access
   API_PORT=8000           # For internal communication

   # Start command
   CMD uvicorn app:app --host 0.0.0.0 --port ${API_PORT:-8000}
   ```

2. **Use HTTP (not HTTPS)**
   ```bash
   # Wrong
   https://api-service.railway.internal:8000

   # Right
   http://api-service.railway.internal:8000
   ```

3. **Verify Service Name**
   - Check exact service name (case-sensitive)
   - Settings → Service Name
   - Use in URL: `<service-name>.railway.internal`

4. **Check Port is Listening**
   - Review deployment logs
   - Should see: "Uvicorn running on http://0.0.0.0:8000"

### Issue 8: Nginx Static Files Not Found

**Symptoms:**
- 404 errors for JS/CSS files
- React app loads blank page
- Nginx serves index.html but not assets

**Solutions:**

1. **Verify Build Output Directory**
   ```dockerfile
   # Ensure correct dist path
   COPY --from=build /app/dist /usr/share/nginx/html
   ```

2. **Check Nginx Configuration**
   ```nginx
   # Ensure root matches COPY destination
   root /usr/share/nginx/html;

   # Support SPA routing
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

3. **Verify Build Ran Successfully**
   - Check build logs for `npm run build` output
   - Confirm `dist/` folder created
   - Ensure `.dockerignore` doesn't exclude `dist/`

### General Debugging Checklist

1. **Review Deployment Logs**
   - Service → Deployments → Latest → View Logs
   - Check both Build Logs and Deploy Logs

2. **Check Service Health**
   - Service tile shows status (green = healthy)
   - Click service → Metrics tab (CPU, Memory, Network)

3. **Test Locally First**
   ```bash
   # Build and run Docker image locally
   docker build -t local-test .
   docker run -p 8000:8000 -e PORT=8000 local-test

   # Verify works before pushing to Railway
   curl http://localhost:8000
   ```

4. **Verify Git Push**
   ```bash
   # Ensure latest code is pushed
   git status
   git log --oneline -5

   # Verify Railway is watching correct branch
   # Settings → Source → Branch
   ```

5. **Check Railway Status Page**
   - https://status.railway.app
   - Verify no ongoing incidents

---

## 11. Monitoring and Logs

### Viewing Logs

**Real-Time Logs:**

1. Click service tile
2. Navigate to **Deployments** tab
3. Click latest deployment
4. Two log types:
   - **Build Logs:** Docker build process
   - **Deploy Logs:** Application runtime output

**Log Streaming:**

- Logs auto-update in real-time
- Use search/filter to find specific messages
- Download logs for offline analysis

### Metrics Dashboard

**Available Metrics:**

1. **CPU Usage**
   - Percentage of allocated CPU
   - Spikes indicate heavy processing

2. **Memory Usage**
   - Current RAM consumption vs limit
   - Approaching limit = crash risk

3. **Network Traffic**
   - Ingress (incoming) and egress (outgoing)
   - Egress incurs cost ($0.10/GB)

**Accessing Metrics:**

- Service → Metrics tab
- Time range selector (1h, 24h, 7d, 30d)
- Hover for specific values

### Debugging Deployment Failures

**Step-by-Step Process:**

1. **Check Build Logs**
   - Look for red error messages
   - Common: dependency installation failures
   - Solution: Update `requirements.txt` / `package.json`

2. **Check Deploy Logs**
   - Look for application startup errors
   - Common: Port binding, database connection
   - Solution: Verify environment variables

3. **Review Recent Changes**
   - Deployments tab shows all deployments
   - Compare working vs failing deployments
   - Rollback option available

4. **Test Locally**
   - Reproduce environment exactly
   - Use same Dockerfile and env vars
   - Identify discrepancies

### Alerts and Notifications

**Setting Up:**

1. Project Settings → Notifications
2. Configure webhooks for deployment events
3. Integrations: Slack, Discord, email

**Alert Types:**

- Deployment success/failure
- Service health checks
- Resource limit warnings

---

## 12. Complete Configuration Examples

### Example 1: Frontend Repository Structure

```
my-vite-app/
├── src/
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── favicon.ico
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── Dockerfile          # ← Required for Railway
├── nginx.conf          # ← Required for production
├── .dockerignore       # ← Recommended
└── .gitignore
```

**Dockerfile:**

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**.dockerignore:**

```
node_modules
dist
.git
.env*
*.log
```

**Railway Variables:**

```bash
PORT=80
VITE_API_URL=https://your-api.up.railway.app
```

### Example 2: Backend Repository Structure

```
my-fastapi-app/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── routers/
│   └── models/
├── tests/
├── requirements.txt
├── Dockerfile          # ← Required for Railway
├── .dockerignore       # ← Recommended
└── .gitignore
```

**requirements.txt:**

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
python-dotenv==1.0.0
```

**Dockerfile:**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

**app/main.py:**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

**.dockerignore:**

```
__pycache__
*.pyc
.env
.venv
.pytest_cache
.git
```

**Railway Variables:**

```bash
PORT=8000
CORS_ORIGINS=https://your-frontend.up.railway.app
DATABASE_URL=postgresql://...
```

---

## Summary and Best Practices

### Deployment Checklist

**Before Deploying:**

- [ ] Dockerfiles tested locally
- [ ] .dockerignore files created
- [ ] Environment variables documented
- [ ] CORS configured for production domains
- [ ] Dependencies listed in requirements.txt/package.json
- [ ] Port binding uses `$PORT` variable
- [ ] Host binding uses `0.0.0.0`

**After Deploying:**

- [ ] Both services show "Healthy" status
- [ ] Public domains generated
- [ ] Environment variables updated with production URLs
- [ ] CORS origins include Railway domains
- [ ] Test API calls from frontend
- [ ] Check deployment logs for errors
- [ ] Monitor memory/CPU usage

### Key Takeaways

1. **Always use `$PORT`** - Never hardcode ports
2. **Bind to `0.0.0.0`** - Not `127.0.0.1` or `localhost`
3. **HTTPS in production** - Railway auto-provides SSL
4. **CORS is critical** - Must include exact Railway domains
5. **Private networking is free** - Use for service-to-service calls
6. **Environment variables trigger rebuilds** - Especially `VITE_*` vars
7. **Memory limits are strict** - 1GB on trial, optimize accordingly
8. **Logs are your friend** - Always check both build and deploy logs

### Performance Optimization

1. **Use multi-stage builds** - Keep images small
2. **Cache Docker layers** - Copy package files before source code
3. **Minimize workers** - Based on available memory
4. **Use private networking** - Avoid egress costs
5. **Enable gzip** - For static assets (nginx)
6. **Cache static files** - Long TTL for immutable assets

### Security Best Practices

1. **Never commit secrets** - Use Railway variables
2. **Run as non-root user** - In Dockerfile
3. **Restrict CORS origins** - Never use `["*"]` in production
4. **Use HTTPS everywhere** - Railway provides it free
5. **Regular dependency updates** - Security patches
6. **Environment isolation** - Separate staging/production

---

## Additional Resources

**Official Documentation:**
- Railway Docs: https://docs.railway.com
- Railway Status: https://status.railway.app
- Railway Templates: https://railway.app/templates

**Community:**
- Railway Help Station: https://station.railway.com
- Railway Discord: https://discord.gg/railway
- GitHub Discussions: Railway community repos

**Related Guides:**
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment/
- Vite Production Build: https://vitejs.dev/guide/build.html
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/

---

This comprehensive tutorial covers everything needed to deploy a multi-service project (Vite+React+Nginx and FastAPI+Uvicorn) to Railway in 2025. All information is based on current Railway documentation, community discussions, and production deployment patterns.
