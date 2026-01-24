# Quick Deployment Guide

This guide will help you deploy the Remotion rendering server to Railway in under 5 minutes.

## Prerequisites

- GitHub account (to connect Railway)
- Supabase account (free tier works)
- Railway account (free tier includes $5 credit)

## Step 1: Setup Supabase Storage (2 minutes)

1. Go to [supabase.com](https://supabase.com) and create a project
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Name it: `rendered-videos`
5. Make it **Public** (or configure access policies as needed)
6. Go to **Settings** → **API**
7. Copy your:
   - Project URL (looks like: `https://xxx.supabase.co`)
   - Service Role Key (secret key under "service_role")

## Step 2: Deploy to Railway (3 minutes)

### Option A: Deploy from GitHub (Recommended)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose the `Renevizion/remorender` repository
5. Railway will automatically:
   - Detect Node.js
   - Install dependencies
   - Deploy the server

### Option B: Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Navigate to the server directory
cd remotion-render-server

# Login to Railway
railway login

# Initialize and deploy
railway init
railway up

# Generate a public domain
railway domain
```

### Option C: Deploy with Railpack

Railpack will automatically detect and deploy the application using the included `start.sh` script.

1. Go to [Railpack](https://railpack.com)
2. Connect your GitHub repository
3. Railpack will automatically:
   - Detect the `start.sh` script
   - Install system dependencies (Chromium, FFmpeg) from `Aptfile`
   - Install Node.js dependencies
   - Start the server
4. Configure environment variables in Railpack dashboard (see Step 3 below)

## Step 3: Configure Environment Variables (1 minute)

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add the following environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key
3. Click **Deploy** to restart with new variables

Your server will automatically restart and be ready to use!

## Step 4: Get Your Server URL

Railway will provide you with a URL like:
```
https://your-app-name.railway.app
```

Copy this URL - you'll need it for client integration.

## Step 5: Test Your Server

Test the health endpoint:
```bash
curl https://your-app-name.railway.app/health
```

You should see:
```json
{"status":"ok","service":"remotion-render"}
```

## Step 6: Integrate with Your App

Update your client code:

```typescript
// config.ts
export const RENDER_SERVER_URL = 'https://your-app-name.railway.app';
```

See the `client-examples/` directory for complete integration examples.

## Troubleshooting

### "Environment variables required" error
Make sure you've added both `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Railway's Variables tab.

### Server not responding
Check the Railway logs:
1. Go to your project in Railway
2. Click **Deployments**
3. Click the latest deployment
4. View the logs for errors

### Rate limit errors
The server limits each IP to 10 requests per 15 minutes. For testing, this should be sufficient. For production, you may want to adjust this in `server.js`.

### Supabase upload errors
Verify:
- The bucket `rendered-videos` exists in Supabase
- The bucket has appropriate access policies
- Your service role key is correct

## Cost Estimate

**Railway Free Tier:**
- $5/month credit included
- Approximately 50-100 video renders per month
- Perfect for testing and small projects

**Paid Usage:**
- ~$0.05-0.10 per video render
- Scales automatically with demand

## Next Steps

1. Check out the [complete README](../README.md) for more details
2. Review [client integration examples](../client-examples/README.md)
3. Customize the render settings in `server.js`
4. Add authentication if needed
5. Monitor usage in Railway dashboard

## Support

- Railway Documentation: https://docs.railway.app
- Supabase Documentation: https://supabase.com/docs
- Remotion Documentation: https://remotion.dev
- Open an issue on GitHub for project-specific questions
