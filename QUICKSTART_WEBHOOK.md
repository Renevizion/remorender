# Quick Start: Webhook Approach

This is a quick reference for implementing the webhook approach. For detailed instructions, see [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md).

## Overview

The webhook approach allows Railway to render videos without needing your Supabase credentials. Instead, Railway calls back to your Supabase edge function when rendering is complete.

## Setup (5 minutes)

### 1. Deploy Edge Functions

Your edge functions are in `supabase/functions/`:
- `render-video` - Initiates renders
- `render-webhook` - Receives callbacks

**If using Lovable Cloud**: Functions auto-deploy from this directory.

**If using Supabase CLI**:
```bash
supabase functions deploy render-video
supabase functions deploy render-webhook
```

### 2. Set Environment Variables

**In Supabase/Lovable Secrets:**
```bash
RAILWAY_RENDER_URL=https://your-app.railway.app
```

**In Railway:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - For uploading to storage

### 3. Update Your Client Code

```typescript
import { renderAndWaitForVideo } from './client-examples/edgeFunctionService';

// Submit and wait for render
const videoUrl = await renderAndWaitForVideo(
  planId,
  remotionCode,
  { id: 'MyVideo', width: 1920, height: 1080, fps: 30, durationInFrames: 90 }
);
```

## Database Schema

```sql
CREATE TABLE video_plans (
  id UUID PRIMARY KEY,
  generated_code TEXT NOT NULL,
  plan JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  final_video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Flow

1. Client calls `render-video` edge function with planId + code
2. Edge function sends job to Railway with webhook URL
3. Railway renders video, uploads to Supabase Storage
4. Railway calls `render-webhook` with video URL
5. Edge function updates database with video URL
6. Client receives video URL (via polling or real-time subscription)

## Testing

Test the edge function:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/render-video \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"planId":"test","code":"...","composition":{...}}'
```

## Benefits

✅ **Secure**: No database credentials in Railway  
✅ **Scalable**: Railway focuses on rendering only  
✅ **Production-ready**: Proper error handling and webhooks  
✅ **Real-time**: Optional Supabase subscriptions for instant updates

## Support

- Full guide: [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)
- Client examples: [client-examples/README.md](./client-examples/README.md)
- Main README: [README.md](./README.md)
