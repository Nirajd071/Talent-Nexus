# HireSphere - cPanel Deployment Guide

## Prerequisites
- cPanel hosting with **Node.js support** (check with your host)
- SSH access (recommended)
- MongoDB Atlas database (already configured)

---

## Step 1: Build the Project Locally

```bash
# In your project directory
npm install
npm run build
```

This creates a `dist/` folder with the production build.

---

## Step 2: Prepare Files for Upload

Create a folder with these files:
```
/hiresphere-deploy/
├── dist/                    # Built server files
├── client/dist/             # Built frontend (if separate)
├── package.json
├── package-lock.json
└── .htaccess               # Create this (see below)
```

---

## Step 3: Create .htaccess File

Create `.htaccess` in your project root:
```apache
RewriteEngine On
RewriteRule ^(.*)$ http://localhost:5000/$1 [P,L]
```

---

## Step 4: Upload to cPanel

### Option A: File Manager
1. Login to **cPanel**
2. Open **File Manager**
3. Navigate to `public_html` or your subdomain folder
4. Upload all files from `hiresphere-deploy/`

### Option B: SSH (Recommended)
```bash
# Connect via SSH
ssh username@your-domain.com

# Navigate to web directory
cd public_html

# Clone or upload your project
git clone https://github.com/Nirajd071/Talent-Nexus.git .
```

---

## Step 5: Setup Node.js App in cPanel

1. Go to **cPanel → Setup Node.js App**
2. Click **Create Application**
3. Fill in:
   - **Node.js version**: 18.x or 20.x
   - **Application mode**: Production
   - **Application root**: `/home/username/public_html` (or your path)
   - **Application URL**: Your domain
   - **Application startup file**: `dist/index.cjs`
4. Click **Create**

---

## Step 6: Set Environment Variables

In the Node.js App settings, add these environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | `mongodb+srv://nirajd071_db_user:%40123HireSphere@hiresphere.cxlqzcp.mongodb.net/hiresphere?retryWrites=true&w=majority&appName=HireSphere` |
| `JWT_SECRET` | `your-jwt-secret` |
| `GEMINI_API_KEY` | `your-gemini-key` |
| `GOOGLE_CLIENT_ID` | `your-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | `your-google-secret` |
| `GMAIL_USER` | `your-email@gmail.com` |
| `GMAIL_APP_PASSWORD` | `your-app-password` |

---

## Step 7: Install Dependencies

### Via cPanel Terminal or SSH:
```bash
cd /home/username/public_html
source /home/username/nodevenv/public_html/18/bin/activate
npm install --production
```

---

## Step 8: Start the Application

1. Go back to **Setup Node.js App**
2. Find your application
3. Click **Run NPM Install** (if available)
4. Click **Restart**

---

## Step 9: Configure Domain (if needed)

If using a subdomain:
1. Go to **cPanel → Subdomains**
2. Create subdomain pointing to your app folder
3. Update Google OAuth redirect URLs

---

## Troubleshooting

### App not starting?
```bash
# Check logs
tail -f /home/username/public_html/logs/error.log

# Check if port is available
netstat -tlnp | grep 5000
```

### MongoDB connection issues?
- Ensure your IP is whitelisted in MongoDB Atlas
- Add `0.0.0.0/0` to Atlas Network Access (for testing)

### 502 Bad Gateway?
- Restart the Node.js app in cPanel
- Check if the startup file path is correct

---

## Alternative: PM2 (if SSH access)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/index.cjs --name hiresphere

# Save PM2 config
pm2 save
pm2 startup
```

---

## Demo Credentials

| Role | Email | OTP Code |
|------|-------|----------|
| Admin/Recruiter | `admin.demo@hackathon.com` | `999999` |
| Candidate | `user.demo@hackathon.com` | `111111` |

---

## Support

For issues, contact: nirajdas6664521@gmail.com
