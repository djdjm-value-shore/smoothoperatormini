# Railway Deployment Guide - SmoothOperator

**Last Updated:** October 2025 (Railway v2 Dashboard)
**Target:** First-time Railway users
**Time:** 15-20 minutes
**Cost:** Hobby plan ($5/month) or Trial (sufficient for demo)

This guide reflects the **current Railway dashboard** and deployment workflow as of October 2025.

---

## Overview

SmoothOperator is a monorepo with two deployable services:
- **API Service** (`api/` directory) - FastAPI backend with multi-agent orchestration
- **Web Service** (`web/` directory) - React frontend with Vite

Both services deploy from the same GitHub repository using Railway's monorepo support.

---

## Prerequisites

Before you begin, ensure you have:

1. ✅ **GitHub Account** - Railway integrates via GitHub Apps
2. ✅ **GitHub Repository** - Your SmoothOperator code pushed to GitHub
3. ✅ **Railway Account** - Sign up at https://railway.app (use GitHub auth)
4. ✅ **OpenAI API Key** - For testing the chat functionality (get at https://platform.openai.com)

---

## Step 1: Create New Railway Project

1. Navigate to **https://railway.app/new**
2. Click **"New Project"**
3. Select **"Empty Project"** (we'll add services manually for better control)
4. Name your project: `smoothoperator` or similar

You'll land on the **project canvas** - your infrastructure dashboard.

---

## Step 2: Add API Service (Backend)

### 2.1 Create the Service

1. On the project canvas, click the **"New"** button (or press `Cmd+K` / `Ctrl+K`)
2. Select **"GitHub Repo"**
3. Choose your repository (e.g., `username/homework`)
   - If not listed, click **"Configure GitHub App"** to grant Railway access
4. Railway creates a service and starts initial scan

### 2.2 Configure Root Directory (Monorepo Setup)

1. Click the newly created service tile
2. Go to **Settings** tab
3. Under **Source** section, find **"Root Directory"**
4. Set to: `/api`
5. Railway will now only build from the `api/` directory

### 2.3 Verify Dockerfile Detection

1. Go to **Deployments** tab
2. Check logs for: `"Using detected Dockerfile!"`
3. Railway automatically uses `api/Dockerfile` because of root directory setting

### 2.4 Configure Build Settings (Optional)

Railway auto-detects settings from Dockerfile, but you can override:

1. **Settings** → **Deploy** section
2. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - (Dockerfile already sets this, but good as backup)
3. Leave **Build Command** empty (Dockerfile handles it)

### 2.5 Generate Public Domain

1. **Settings** → **Networking** section
2. Find **"Public Networking"**
3. Click **"Generate Domain"**
4. Copy the generated URL (e.g., `smoothoperator-api-production-abc123.up.railway.app`)
5. **Save this URL** - you'll need it for environment variables

---

## Step 3: Add Web Service (Frontend)

### 3.1 Create the Service

1. Click **"New"** button again on project canvas
2. Select **"GitHub Repo"**
3. Choose the **same repository** (e.g., `username/homework`)
4. Railway creates a second service

### 3.2 Configure Root Directory

1. Click the new service tile
2. Go to **Settings** tab
3. Under **Source** section, set **"Root Directory"** to: `/web`

### 3.3 Verify Dockerfile Detection

1. Go to **Deployments** tab
2. Check logs for: `"Using detected Dockerfile!"`
3. Railway uses `web/Dockerfile`

### 3.4 Generate Public Domain

1. **Settings** → **Networking** section
2. Click **"Generate Domain"**
3. Copy the generated URL (e.g., `smoothoperator-web-production-xyz789.up.railway.app`)
4. **Save this URL** - needed for CORS configuration

---

## Step 4: Configure Environment Variables

**⚠️ Critical:** Configure variables BEFORE first deployment to avoid rebuild cycles.

### 4.1 API Service Variables

1. Click the **API service** tile
2. Go to **Variables** tab
3. Click **"New Variable"** for each of these:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `APP_PASSCODE` | Your secret passcode | Used for login authentication |
| `SESSION_SECRET` | 64-char random string | Generate with command below |
| `ALLOWED_ORIGINS` | `https://your-web-domain.up.railway.app` | **Use your actual web URL from Step 3.4** |
| `LOG_LEVEL` | `INFO` | Or `DEBUG` for verbose logs |

**Generate SESSION_SECRET:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**Alternative - Use RAW Editor:**
1. Click **"RAW Editor"** button
2. Paste all variables at once:
```
APP_PASSCODE=your_secret_passcode_here
SESSION_SECRET=generated_64_char_string_here
ALLOWED_ORIGINS=https://your-web-domain.up.railway.app
LOG_LEVEL=INFO
```
3. Click **"Update Variables"**

### 4.2 Web Service Variables

1. Click the **Web service** tile
2. Go to **Variables** tab
3. Add this single variable:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `VITE_API_URL` | `https://your-api-domain.up.railway.app` | **Use your actual API URL from Step 2.5** |

**⚠️ Important:**
- Do NOT include trailing slash
- Must start with `https://`
- Vite bakes this into the build, so changing it requires redeploy

**Using Variable References:**
Railway lets you reference other services. Instead of copy-paste, you can use:
```
VITE_API_URL=${{API.RAILWAY_PUBLIC_DOMAIN}}
```
(Replace `API` with your actual API service name)

---

## Step 5: Deploy Services

### 5.1 Understanding Auto-Deploy

Railway automatically deploys when:
- ✅ Environment variables are added/changed (triggers staged deploy)
- ✅ New commits pushed to connected GitHub branch
- ✅ Manual trigger via Command Palette

After setting variables in Step 4, Railway should auto-trigger deployments.

### 5.2 Monitor Deployment Progress

**For API Service:**
1. Click **API service** tile
2. Go to **Deployments** tab
3. Watch the latest deployment
4. Check logs for:
   - `"Using detected Dockerfile!"`
   - `"Building..."`
   - `"Application startup complete"`
   - Green checkmark = success (takes ~2-4 minutes)

**For Web Service:**
1. Click **Web service** tile
2. Go to **Deployments** tab
3. Watch the latest deployment
4. Check logs for:
   - Vite build output
   - nginx start message
   - Green checkmark = success (takes ~3-5 minutes)

### 5.3 Manual Deploy (If Needed)

If auto-deploy didn't trigger:
1. Press `Cmd+K` / `Ctrl+K` (Command Palette)
2. Type "deploy"
3. Select **"Deploy Latest Commit"**
4. Choose the service

**Or:**
1. Click service tile
2. **Settings** → Bottom of page
3. Click **"Redeploy"** button

### 5.4 Deployment Order Matters

**Deploy API before Web** if possible, because:
- Web build needs `VITE_API_URL` at build time
- API has no build-time dependencies on Web
- Both can deploy simultaneously, but API should finish first

---

## Step 6: Verify Deployment

### 6.1 Health Check - API

Test API is running:
```bash
curl https://your-api-domain.up.railway.app/health
```

**Expected response:**
```json
{"status": "healthy", "service": "api"}
```

### 6.2 Health Check - Web

Open in browser:
```
https://your-web-domain.up.railway.app
```

**Expected:** Login page with passcode prompt

### 6.3 End-to-End Test

**Step 1 - Authentication:**
1. Enter your `APP_PASSCODE` from Step 4
2. Click "Login"
3. Should redirect to `/settings`

**Step 2 - API Key Setup:**
1. Paste your OpenAI API key (starts with `sk-`)
2. Click "Save"
3. Should redirect to `/chat`

**Step 3 - Agent Handoff Test:**
1. In chat, send:
   ```
   Save a note titled 'test' with content 'hello world'
   ```

2. **Expected behavior:**
   - Agent transition: `Concierge → Archivist`
   - Tool call visible: `save_note(title="test", content="hello world")`
   - Tool result: `{"success": true}`
   - Confirmation message

3. Send:
   ```
   List my notes
   ```

4. **Expected:** Agent lists `["test"]`

**✅ Success:** All agents, handoffs, and MCP tools working!

---

## Step 7: Configure Watch Paths (Optional)

Prevent unnecessary rebuilds by setting watch paths:

### API Service Watch Paths
1. Click **API service** → **Settings**
2. Find **"Watch Paths"** section
3. Add:
   ```
   /api/**
   ```
4. API only rebuilds when `api/` directory changes

### Web Service Watch Paths
1. Click **Web service** → **Settings**
2. Add:
   ```
   /web/**
   ```
3. Web only rebuilds when `web/` directory changes

**Benefit:** Changing README.md won't trigger both services to rebuild.

---

## Step 8: Update Embed Demo (Optional)

Update the static HTML demo file:

1. Open `smoothoperator-embed-demo.html` in editor
2. Find the iframe `src` attribute
3. Replace placeholder with your actual web domain:
   ```html
   <iframe src="https://your-web-domain.up.railway.app/chat?embed=1">
   ```
4. Save and double-click file to test locally
5. Chat interface should load in iframe

---

## Troubleshooting

### Deployment Failed

**Symptom:** Red X on deployment, "BUILD_FAILED" or "CRASHED"

**Check:**
1. Click deployment → View full logs
2. Look for error messages (often mid-log, not at bottom)
3. Common issues:
   - Dockerfile syntax error
   - Missing dependencies in requirements.txt
   - Port binding issues

**Fix:**
- Ensure Dockerfile uses `0.0.0.0:$PORT` (Railway provides `$PORT`)
- Check root directory setting matches your repo structure
- Verify all files committed to GitHub

### API Service Not Responding

**Symptom:** Web can't connect to API, network errors

**Debug Steps:**
1. Test health endpoint:
   ```bash
   curl https://your-api-domain.up.railway.app/health
   ```
2. Check deployment logs for startup errors
3. Verify `PORT` environment variable is used (Railway auto-provides)
4. Check service is listening on `0.0.0.0`, not `localhost`

**Fix:**
- API must bind to `0.0.0.0:$PORT` (in Dockerfile CMD or uvicorn command)
- Generate public domain if not done yet (Settings → Networking)

### CORS Errors in Browser

**Symptom:** Console shows `"blocked by CORS policy"`

**Debug:**
1. Open browser dev tools → Network tab
2. Check failed request headers
3. Verify `Origin` header value

**Fix:**
1. API service → Variables
2. Check `ALLOWED_ORIGINS` exactly matches web domain:
   - ✅ `https://web-production-abc.up.railway.app`
   - ❌ `http://web-production-abc.up.railway.app` (missing https)
   - ❌ `https://web-production-abc.up.railway.app/` (trailing slash)
3. Update variable and redeploy API

### Web Build Failed

**Symptom:** Web deployment fails during Vite build

**Check logs for:**
- `"VITE_API_URL is not defined"`
- TypeScript errors
- Missing dependencies

**Fix:**
1. Verify `VITE_API_URL` variable exists
2. Must be set BEFORE build (Vite bakes it in)
3. Redeploy after adding variable

### Session/Cookie Issues

**Symptom:** Login redirects to login page, or "Unauthorized" errors

**Debug:**
1. Browser dev tools → Application → Cookies
2. Check for `session_id` cookie from API domain
3. Check cookie attributes (HttpOnly, Secure, SameSite)

**Fix:**
- Ensure `SESSION_SECRET` is set in API variables
- Check browser allows third-party cookies (if using embed)
- Verify API domain is using HTTPS (Railway default)

### Changes Not Deploying

**Symptom:** Pushed code to GitHub but Railway didn't rebuild

**Check:**
1. Service Settings → **Auto Deploys** (should be enabled)
2. Watch Paths might be filtering your changes
3. GitHub → Settings → Integrations → Railway (verify permissions)

**Fix:**
- Manual deploy: `Cmd+K` → "Deploy Latest Commit"
- Check watch paths don't exclude your changed files
- Re-authorize GitHub App if needed

### High Build Times

**Symptom:** Builds taking >5 minutes

**Optimization:**
1. Verify Docker layer caching is working
2. Check Dockerfile doesn't invalidate cache unnecessarily
3. Review dependency installation (uv should be fast)

**Railway provides cache automatically** - no special config needed.

---

## Pricing & Usage

### Current Plans (October 2025)

**Trial Plan** (Free):
- $5 usage credit (one-time)
- All features enabled
- Good for testing/demos

**Hobby Plan** ($5/month):
- $5 usage credit included
- Additional usage billed per hour
- 2 custom domains per service
- Suitable for production

### Expected Costs - SmoothOperator

**API Service:**
- RAM: ~512MB
- CPU: Minimal (event-driven)
- Est: $2-4/month

**Web Service:**
- RAM: ~100MB (nginx)
- CPU: Very low (static)
- Est: $0.50-1/month

**Total: ~$3-5/month** (Hobby plan covers this)

### Cost Optimization Tips

1. **Use auto-sleep** for demos (Settings → Sleep after inactivity)
2. **Set usage limits** (Project Settings → Usage Limits)
3. **Delete unused deployments** (keeps one active + one previous)
4. **Monitor usage** (Project → Usage tab)

---

## Final Checklist

Before considering deployment complete:

### Infrastructure
- [ ] Railway project created
- [ ] API service added with root directory `/api`
- [ ] Web service added with root directory `/web`
- [ ] Both services show green checkmarks in Deployments tab
- [ ] Public domains generated for both services

### Configuration
- [ ] API: All 4 environment variables set (APP_PASSCODE, SESSION_SECRET, CORS_ORIGINS, LOG_LEVEL)
- [ ] Web: VITE_API_URL variable set
- [ ] CORS_ORIGINS matches web domain exactly
- [ ] Watch paths configured (optional but recommended)

### Verification
- [ ] API health check returns 200 OK
- [ ] Web loads login page
- [ ] Passcode authentication works
- [ ] Can save OpenAI API key
- [ ] Chat interface loads and connects
- [ ] Messages stream in real-time
- [ ] Agent handoff visible (Concierge → Archivist)
- [ ] MCP tool calls work (save_note, list_titles)

### Documentation
- [ ] Web URL documented
- [ ] API URL documented
- [ ] Passcode recorded securely
- [ ] Embed demo updated (if using)

---

## Deployment Summary

Once complete, you'll have:

**🌐 Web URL:** `https://[project-name]-web.up.railway.app`
**🔌 API URL:** `https://[project-name]-api.up.railway.app`
**🔐 Passcode:** `[your-APP_PASSCODE]`

**To share:**
```
Demo: https://your-web.up.railway.app
Passcode: [share privately]
Note: Users need their own OpenAI API key
```

---

## CI/CD Workflow

Railway automatically handles continuous deployment:

### Automatic Deploys

**Triggers:**
- Push to connected GitHub branch (usually `main` or `master`)
- Environment variable changes
- Manual deploy via Command Palette

**Process:**
1. Commit and push code
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
2. Railway detects push (within seconds)
3. Builds both services (only if watch paths match)
4. Deploys automatically
5. Rollback available if issues occur

### Manual Deploys

**When needed:**
- Environment variable changes
- Force rebuild without code changes
- Rollback to previous deployment

**Methods:**
1. **Command Palette:** `Cmd+K` → "Deploy Latest Commit"
2. **Service Settings:** Scroll down → "Redeploy" button
3. **CLI:** `railway up`

### Rollback Strategy

If deployment breaks:
1. Go to service → **Deployments** tab
2. Click previous successful deployment
3. Click **"Redeploy"** on that deployment
4. Railway switches traffic immediately

---

## Railway CLI (Optional)

For power users, install the CLI:

### Installation
```bash
npm install -g @railway/cli

# Or via Homebrew (Mac)
brew install railway
```

### Authentication
```bash
railway login
# Opens browser for OAuth
```

### Link Project
```bash
cd /path/to/homework
railway link
# Select your project from list
```

### Useful Commands

**View logs in real-time:**
```bash
railway logs          # All services
railway logs -s api   # API only
railway logs -s web   # Web only
```

**Deploy from local:**
```bash
railway up            # Deploys current directory
```

**Run locally with Railway variables:**
```bash
railway run uvicorn app.main:app --reload
```

**Check service status:**
```bash
railway status
```

---

## Advanced Configuration

### Custom Domains

**Add your own domain:**
1. Service → Settings → Networking
2. Click "+ Custom Domain"
3. Enter domain (e.g., `chat.example.com`)
4. Add CNAME record at DNS provider:
   - Name: `chat`
   - Value: `[generated-value].up.railway.app`
5. Railway auto-issues SSL certificate

**Limits:**
- Trial: 1 custom domain total
- Hobby: 2 per service
- Pro: 20 per service

### Health Checks

**Configure custom health checks:**
1. Service → Settings
2. Find "Health Check" section
3. Set path: `/health`
4. Set timeout: 30s
5. Set interval: 30s

**Benefits:**
- Railway won't route traffic until healthy
- Auto-restart on health check failures

### Scheduled Jobs (Cron)

Not needed for SmoothOperator, but Railway supports:
```json
{
  "schedule": "0 2 * * *",
  "command": "python cleanup.py"
}
```

Configure in `railway.json` at repo root.

### Secrets Management

**For sensitive variables:**
1. Variables tab → Click variable → "Seal"
2. Value hidden in UI
3. Still provided to deployments
4. Can't be unsealed (one-way)

Use for: API keys, database passwords, secrets

---

## Monitoring & Debugging

### View Metrics

**Project-level:**
- Project canvas → Click "Metrics" tab
- Shows CPU, RAM, network across all services

**Service-level:**
- Click service → "Metrics" tab
- Detailed resource usage over time

### Logs

**Real-time logs:**
- Service → Deployments → Click active deployment
- Auto-scrolls, searchable

**Log levels:**
- Set `LOG_LEVEL=DEBUG` for verbose output
- Set `LOG_LEVEL=ERROR` for production (quieter)

### Alerts

**Set up usage alerts:**
1. Project Settings → Usage Limits
2. Set monthly limit (e.g., $10)
3. Enable email notifications
4. Railway stops services at limit

---

## Production Readiness

### Pre-Production Checklist

Before going production:
- [ ] Add custom domain
- [ ] Enable health checks
- [ ] Set usage limits
- [ ] Configure alerts
- [ ] Seal sensitive variables
- [ ] Test rollback procedure
- [ ] Document recovery process
- [ ] Set up monitoring

### Scale Considerations

**When to upgrade:**
- Traffic >10K requests/day → Consider Pro plan
- Need >2 custom domains → Pro required
- Multiple environments → Use Railway environments feature
- Team collaboration → Add team members (Pro)

**Horizontal scaling:**
- Railway supports replicas (Pro plan)
- Increase via Settings → Scale
- Load balancer included

---

## Quick Reference

### Essential URLs
```bash
# Railway Dashboard
https://railway.app/project/[project-id]

# API Health
https://[api-domain].up.railway.app/health

# API Docs (FastAPI)
https://[api-domain].up.railway.app/docs

# Web App
https://[web-domain].up.railway.app
```

### Essential Commands
```bash
# Generate session secret
python -c "import secrets; print(secrets.token_urlsafe(48))"

# Test API health
curl https://[api-domain].up.railway.app/health

# Test web serving
curl -I https://[web-domain].up.railway.app

# View Railway logs
railway logs -s api --tail 100
```

### Environment Variables Reference

**API Service:**
| Variable | Example | Required |
|----------|---------|----------|
| APP_PASSCODE | `my-secret-pass` | ✅ |
| SESSION_SECRET | `[64-char-string]` | ✅ |
| CORS_ORIGINS | `https://web.up.railway.app` | ✅ |
| LOG_LEVEL | `INFO` | ✅ |

**Web Service:**
| Variable | Example | Required |
|----------|---------|----------|
| VITE_API_URL | `https://api.up.railway.app` | ✅ |

**Railway Auto-Provided:**
| Variable | Description |
|----------|-------------|
| PORT | Service port (usually 8000 or 80) |
| RAILWAY_PUBLIC_DOMAIN | Public service URL |
| RAILWAY_PRIVATE_DOMAIN | Internal service URL |
| RAILWAY_ENVIRONMENT | Environment name (production/staging) |

---

## Support & Resources

**Official Documentation:**
- Railway Docs: https://docs.railway.com
- Railway Discord: https://discord.gg/railway
- Status Page: https://status.railway.app

**Project Resources:**
- GitHub Repo: [your-repo-url]
- SPEC.md: Project specification
- ARCH.md: Architecture documentation
- README.md: Project overview

---

## Summary

**Total Time:** 15-20 minutes
**Services:** 2 (API + Web)
**Environment Variables:** 5 total
**Build Time:** 3-5 minutes per service
**Monthly Cost:** $3-5 (Hobby plan)

**What You Built:**
✅ Multi-agent chat application
✅ Agent handoff system (Concierge ↔ Archivist)
✅ MCP tool integration (note-taking)
✅ Embeddable widget support
✅ Production-ready deployment on Railway

**Next Steps:**
1. Test thoroughly
2. Update README with live URLs
3. Share demo with stakeholders
4. Monitor usage and logs
5. Consider custom domain for production

🚀 **Deployment Complete!**
