# Remotion Render Server

A simple Express server that renders Remotion videos and uploads them to Supabase storage. Designed for deployment on Railway.

## Features

- **Health Check Endpoint**: `/health` - Check server status
- **Main Render Endpoint**: `/render` - Render custom Remotion compositions
- **Simple Render Endpoint**: `/render-simple` - Quick testing endpoint
- **Rate Limiting**: Protects against abuse (10 requests per 15 minutes per IP)

## Setup

### Prerequisites

- Node.js 18+
- Supabase account with storage bucket configured
- Railway account (for deployment)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_KEY=your_supabase_service_key
export PORT=3001
```

3. Start the server:
```bash
npm start
```

## Deployment to Railway

### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Get URL
railway domain
```

### Option B: Using Railway Dashboard (Recommended)

1. Go to https://railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Connect your GitHub repository
5. Railway will auto-detect Node.js and deploy
6. Add environment variables in Railway dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
7. Get your Railway URL (e.g., `https://your-app.railway.app`)

## API Endpoints

### Health Check
```
GET /health
```
Response:
```json
{
  "status": "ok",
  "service": "remotion-render"
}
```

### Render Video
```
POST /render
Content-Type: application/json

{
  "code": "import { AbsoluteFill } from 'remotion'; export const MyVideo = () => <AbsoluteFill>Hello</AbsoluteFill>;",
  "composition": {
    "id": "MyVideo",
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "durationInFrames": 90
  },
  "inputProps": {}
}
```

Response:
```json
{
  "success": true,
  "videoUrl": "https://your-supabase-url/storage/v1/object/public/rendered-videos/video.mp4",
  "fileName": "1234567890-MyVideo.mp4"
}
```

### Simple Render (Testing)
```
POST /render-simple
Content-Type: application/json

{
  "text": "Hello World",
  "duration": 90
}
```

## Environment Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key
- `PORT` - Server port (default: 3001)

## Cost Estimation

Railway free tier provides $5/month credit, which is sufficient for approximately 50-100 video renders depending on complexity and duration.

## Supabase Setup

1. Create a Supabase project
2. Create a storage bucket named `rendered-videos`
3. Set bucket to public or configure appropriate access policies
4. Copy your project URL and service key to Railway environment variables

## Architecture

1. Client sends Remotion code and composition details
2. Server writes code to temporary file
3. Remotion bundles the code using webpack
4. Server selects and renders the composition
5. Rendered video is uploaded to Supabase storage
6. Public URL is returned to client
7. Temporary files are cleaned up

## Troubleshooting

### Chromium Issues
If you encounter Chromium-related errors, ensure the Dockerfile includes the necessary dependencies:
```dockerfile
RUN apt-get update && apt-get install -y chromium
```

### Memory Issues
For large/complex videos, you may need to increase Railway's memory allocation in the project settings.

### Timeout Issues
Long renders may timeout. Consider implementing a queue system or background job processing for production use.

## License

MIT
