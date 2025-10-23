# Railway Deployment - SmoothOperator Quick Start

**Target:** First-time Railway users
**Time:** ~10 minutes
**Cost:** Free tier (sufficient for demo)

---

## Step 1: Create Railway Project

1. Go to https://railway.app and sign in (GitHub account recommended)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose: `djdjm-value-shore/smoothoperatormini`
5. Railway will detect the repo but **don't deploy yet**

---

## Step 2: Add Services

You'll create **two services** from the same repo (one for API, one for web).

### Service 1: API (Backend)

1. Click **"+ New"** → **"GitHub Repo"** → Select `smoothoperatormini` again
2. Name it: `api`
3. **Settings** → **Source**:
   - Root Directory: `/api`
   - Builder: Dockerfile
4. **Settings** → **Deploy**:
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - (Railway auto-detects Dockerfile, but set this as fallback)
5. **Settings** → **Networking** → **Public Networking**:
   - Click **"Generate Domain"**
   - Copy URL (e.g., `https://smoothoperator-api-production.up.railway.app`)
   - Save this as **API_URL**

### Service 2: Web (Frontend)

1. Click **"+ New"** → **"GitHub Repo"** → Select `smoothoperatormini` again
2. Name it: `web`
3. **Settings** → **Source**:
   - Root Directory: `/web`
   - Builder: Dockerfile
4. **Settings** → **Deploy**:
   - Start Command: `nginx -g 'daemon off;'`
   - (Dockerfile handles this, but set as fallback)
5. **Settings** → **Networking** → **Public Networking**:
   - Click **"Generate Domain"**
   - Copy URL (e.g., `https://smoothoperator-web-production.up.railway.app`)
   - Save this as **WEB_URL**

---

## Step 3: Configure Environment Variables

### API Service Environment Variables

Go to **api service** → **Variables** tab:

```bash
APP_PASSCODE=your_secret_passcode_here
SESSION_SECRET=your_64_character_random_string_here
ALLOWED_ORIGINS=https://smoothoperator-web-production.up.railway.app
LOG_LEVEL=INFO
```

**How to generate SESSION_SECRET:**
```bash
# Run this locally to generate a secure secret:
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**Important:** Replace `ALLOWED_ORIGINS` with your actual WEB_URL from Step 2.

### Web Service Environment Variables

Go to **web service** → **Variables** tab:

```bash
VITE_API_URL=https://smoothoperator-api-production.up.railway.app
```

**Important:** Replace with your actual API_URL from Step 2.

---

## Step 4: Deploy Services

1. **Deploy API first:**
   - Go to api service → **Deployments** tab
   - Click **"Deploy"** (or it may auto-deploy after env vars are set)
   - Wait for green checkmark (~2-3 minutes)

2. **Deploy Web second:**
   - Go to web service → **Deployments** tab
   - Click **"Deploy"**
   - Wait for green checkmark (~2-3 minutes)

**Why this order?** Web build needs API_URL at build time (Vite env vars are baked into bundle).

---

## Step 5: Verify Deployment

### Quick Test

1. **Open WEB_URL** in browser
2. Should see login page with passcode prompt
3. Enter your `APP_PASSCODE`
4. Should redirect to settings page
5. Paste OpenAI API key (starts with `sk-`)
6. Should redirect to chat page

### Happy Path Test

In chat, send:
```
Save a note titled 'test' with content 'hello world'
```

**Expected behavior:**
- You should see agent handoff message: `→ Handoff to Archivist`
- Tool call visible: `🔧 Calling save_note(...)`
- Tool result: `✓ save_note completed: {"success":true}`
- Agent responds confirming note saved

Then send:
```
List my notes
```

**Expected:** Agent lists "test" note.

---

## Step 6: Update Embed Demo (Optional)

If you want to use the iframe embed demo:

1. Open `smoothoperator-embed-demo.html` locally
2. Find line 126: `src="https://WEB_DOMAIN/chat?embed=1"`
3. Replace `WEB_DOMAIN` with your actual WEB_URL
4. Save and double-click file to open in browser
5. Chat should load in iframe

---

## Troubleshooting

### API won't start
- **Check logs:** api service → **Deployments** → Click latest → **View Logs**
- **Common issue:** Missing environment variables
- **Fix:** Verify all 4 API env vars are set (APP_PASSCODE, SESSION_SECRET, ALLOWED_ORIGINS, LOG_LEVEL)

### Web won't start
- **Check logs:** web service → **Deployments** → Click latest → **View Logs**
- **Common issue:** VITE_API_URL not set or incorrect
- **Fix:** Verify VITE_API_URL matches API_URL (no trailing slash)

### CORS errors in browser console
- **Symptom:** Browser shows "blocked by CORS policy"
- **Fix:** Check `ALLOWED_ORIGINS` in API service matches WEB_URL exactly (including https://)

### Chat doesn't stream
- **Symptom:** Messages don't appear in real-time
- **Check:** API logs for errors
- **Check:** Browser console for SSE connection errors
- **Fix:** Verify `/api/chatkit` endpoint is accessible: `curl https://your-api-url.up.railway.app/api/chatkit`

### 404 on web routes
- **Symptom:** Refresh on /chat or /settings shows 404
- **Fix:** Verify nginx.conf has `try_files $uri $uri/ /index.html;` (should be in repo)

---

## Cost Estimates (Free Tier)

Railway free tier includes:
- $5 credit/month
- ~500 hours of uptime

**Expected usage:**
- API: ~0.5 GB RAM, minimal CPU → ~$2-3/month
- Web: nginx static serving → ~$0.50/month
- **Total: ~$3.50/month** (under free tier)

---

## Final Checklist

- [ ] API service deployed (green checkmark)
- [ ] Web service deployed (green checkmark)
- [ ] Can access web URL and see login page
- [ ] Passcode authentication works
- [ ] Can set OpenAI API key
- [ ] Chat interface loads
- [ ] Can send message and see streaming response
- [ ] Agent handoff visible (Concierge → Archivist)
- [ ] Tool calls visible (save_note)
- [ ] Embed demo updated with actual URLs (optional)

---

## URLs to Share

Once deployed, share these with your boss:

```
Web URL:  https://[your-web-domain].up.railway.app
API URL:  https://[your-api-domain].up.railway.app
Passcode: [your APP_PASSCODE]
```

**Security Note:** Keep APP_PASSCODE private. Free tier has no auth beyond this passcode.

---

## Next Steps After Deployment

1. **Monitor logs:** Check for errors in both services
2. **Test embed:** Update and test `smoothoperator-embed-demo.html`
3. **Document URLs:** Update README.md with actual deployment URLs
4. **Share demo:** Send WEB_URL and passcode to stakeholders

---

## Redeployment (After Code Changes)

Railway auto-deploys on git push to master:

```bash
# Make changes locally
git add .
git commit -m "Update feature X"
git push origin master

# Railway will automatically rebuild and redeploy both services
# Watch deployment progress in Railway dashboard
```

**Note:** If you change environment variables, you must manually trigger redeploy:
- Go to service → **Settings** → Click **"Redeploy"**

---

## Quick Reference Commands

### Generate SESSION_SECRET
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Check API Health
```bash
curl https://your-api-url.up.railway.app/
# Should return: {"message":"SmoothOperator API","status":"healthy"}
```

### Check Web Static Files
```bash
curl -I https://your-web-url.up.railway.app/
# Should return: 200 OK with content-type: text/html
```

### View Railway Logs (CLI)
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login and link project
railway login
railway link

# View logs
railway logs --service api
railway logs --service web
```

---

**Deployment time:** ~10 minutes
**Total services:** 2 (api + web)
**Environment variables:** 5 total (4 for api, 1 for web)
**Build time:** ~2-3 minutes per service
**Cost:** Free tier sufficient

Ready for competition submission. 🚀
