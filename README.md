# Remorender - Remotion Rendering Server

A complete solution for rendering Remotion videos on Railway/Railpack with client integration examples. This project includes a Node.js/Express server that renders Remotion compositions and uploads them to Supabase storage, along with TypeScript/React client code for easy integration.

## Project Structure

```
remorender/
├── remotion-render-server/    # Express server for video rendering
│   ├── package.json            # Server dependencies
│   ├── server.js               # Main Express server
│   ├── Dockerfile              # Docker configuration for Railway
│   ├── .gitignore              # Git ignore patterns
│   └── remotion/               # Remotion compositions directory
│       └── README.md           # Composition examples
├── client-examples/            # Client integration examples
│   ├── config.ts               # Server URL configuration
│   ├── renderService.ts        # Core render API service
│   ├── videoManager.ts         # Supabase integration
│   ├── RenderButton.tsx        # React UI component
│   └── README.md               # Client usage guide
└── README.md                   # This file
```

## Features

- 🎥 Render custom Remotion compositions on-demand
- ☁️ Automatic upload to Supabase storage
- 🚀 Deploy to Railway or Railpack with one click
- 🔄 Health check endpoint for monitoring
- 📦 Simple API for client integration
- 🎨 React components for UI integration
- 🐳 Docker support for consistent deployments

## Requirements

- Node.js 20.0.0 or higher
- Supabase account (optional - server can run without it for local testing)
- Railway or compatible hosting platform (for production deployment)

## Quick Start

### 1. Deploy Server

#### Option A: Deploy with Railpack
1. Go to [Railpack](https://railpack.com)
2. Connect your GitHub repository (`Renevizion/remorender`)
3. Railpack will automatically detect and build using `start.sh`
4. Add environment variables (see step 2 below)

#### Option B: One-Click Deploy on Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

#### Option C: Using Railway Dashboard
1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect this repository
4. Railway auto-detects Node.js and deploys
5. Add environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Your Supabase service role key
6. Get your Railway URL (e.g., `https://your-app.railway.app`)

#### Option D: Using Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Navigate to server directory
cd remotion-render-server

# Login and deploy
railway login
railway init
railway up
railway domain
```

### 2. Setup Supabase Storage

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to Storage → Create bucket → Name it `rendered-videos`
3. Set bucket to public or configure access policies
4. Copy your project URL and service key

### 3. Integrate with Your App

Copy the client examples and update the configuration:

```typescript
// config.ts
export const RENDER_SERVER_URL = 'https://your-app.railway.app';
```

Use the render service:
```typescript
import { renderVideoOnRailway } from './renderService';

const videoUrl = await renderVideoOnRailway(
  remotionCode,
  { id: 'MyVideo', width: 1920, height: 1080, fps: 30, durationInFrames: 90 }
);
```

Or use the React component:
```tsx
import { RenderButton } from './RenderButton';

<RenderButton planId="your-video-plan-id" />
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status

### Render Video
```
POST /render
Content-Type: application/json

{
  "code": "import { AbsoluteFill } from 'remotion'; ...",
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

### Simple Render (Testing)
```
POST /render-simple
Content-Type: application/json

{
  "text": "Hello World",
  "duration": 90
}
```

## Development

### Local Server Setup
```bash
cd remotion-render-server
npm install

# Set environment variables (optional for local testing)
export SUPABASE_URL=your_url
export SUPABASE_SERVICE_KEY=your_key
export PORT=3001

# Note: Server requires Node.js 20 or higher
# Check your version with: node --version

# Start server
npm start
```

**Note:** If you don't set the Supabase environment variables, the server will start but videos won't be uploaded to cloud storage. This is useful for local development and testing.

### Testing
Test with curl:
```bash
curl http://localhost:3001/health

curl -X POST http://localhost:3001/render-simple \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello World","duration":90}'
```

## Documentation

- [Server Documentation](./remotion-render-server/README.md) - Detailed server setup and API docs
- [Client Examples](./client-examples/README.md) - Integration examples and usage
- [Remotion Compositions](./remotion-render-server/remotion/README.md) - How to create compositions

## Cost Estimation

Railway free tier provides $5/month credit:
- Estimated 50-100 video renders per month (depending on complexity)
- Additional renders at ~$0.05-0.10 per render

## Architecture

```
Client App (Lovable/React)
    ↓ HTTP POST /render
Railway Server (Express)
    ↓ Bundle & Render
Remotion + Chromium
    ↓ Upload video
Supabase Storage
    ↓ Return URL
Client App receives video URL
```

## Troubleshooting

### Chromium Issues
Ensure Dockerfile includes Chromium dependencies

### Memory Issues
Increase Railway memory allocation in project settings

### Timeout Issues
Long renders may timeout. Consider:
- Implementing a queue system
- Using background job processing
- Shorter video durations for testing

### CORS Issues
The server includes CORS support by default. If you need to restrict origins:
```javascript
app.use(cors({ origin: 'https://your-app.com' }));
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation in each directory
- Review the example code in `client-examples/`