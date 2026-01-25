# Webhook Approach Setup Guide

This guide explains how to set up the secure webhook approach for video rendering, where Railway calls back to your Supabase edge function instead of directly accessing your database.

## Architecture Overview

```
Client App
    ↓ (calls with planId + code)
Supabase Edge Function: render-video
    ↓ (sends job to Railway with webhook URL)
Railway Server
    ↓ (renders video, uploads to Supabase storage)
    ↓ (calls webhook with video URL)
Supabase Edge Function: render-webhook
    ↓ (stores URL in database using service key)
Supabase Database (video_plans table)
```

## Security Benefits

✅ **No credentials in Railway**: Railway never needs your Supabase credentials
✅ **Service keys stay secure**: All database access happens in Lovable's secure edge function environment
✅ **Clean separation**: Railway focuses only on rendering, edge functions handle storage
✅ **Scalable**: Railway can process multiple jobs without database connections

## Prerequisites

1. Supabase project with edge functions enabled (Lovable Cloud includes this)
2. Railway account for the rendering server
3. A `video_plans` table in your Supabase database

### Database Schema

Your `video_plans` table should have at least these columns:

```sql
CREATE TABLE video_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_code TEXT NOT NULL,
  plan JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  final_video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add an index for faster lookups
CREATE INDEX idx_video_plans_status ON video_plans(status);
```

## Step 1: Deploy Edge Functions

### 1.1 Deploy render-webhook function

This function receives callbacks from Railway when rendering is complete.

```bash
# If using Supabase CLI
supabase functions deploy render-webhook

# If using Lovable Cloud, the functions are automatically deployed
# from the supabase/functions/ directory
```

The function is located at: `supabase/functions/render-webhook/index.ts`

### 1.2 Deploy render-video function

This function initiates render jobs on Railway.

```bash
# If using Supabase CLI
supabase functions deploy render-video

# If using Lovable Cloud, automatically deployed
```

The function is located at: `supabase/functions/render-video/index.ts`

## Step 2: Configure Environment Variables

### 2.1 Supabase Edge Function Secrets

Set these secrets for your edge functions:

```bash
# Your Railway render server URL
supabase secrets set RAILWAY_RENDER_URL=https://your-app.railway.app

# Note: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically
# available in edge functions deployed on Lovable Cloud
```

If using Supabase CLI:
```bash
supabase secrets set RAILWAY_RENDER_URL=https://your-app.railway.app
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2.2 Railway Environment Variables

In your Railway project dashboard, set these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | `your-service-role-key` | For uploading videos to storage |

**Note**: With the webhook approach, Railway still needs these credentials ONLY for uploading rendered videos to Supabase Storage. It does NOT need database access. If you prefer Railway to have zero Supabase credentials, see the "Alternative: Railway returns video data" section below.

## Step 3: Update Client Code

### Option A: Using the Service Functions (Recommended)

```typescript
import { renderAndWaitForVideo } from './edgeFunctionService';

async function renderVideo(planId: string) {
  try {
    // This will submit the job and poll for completion
    const videoUrl = await renderAndWaitForVideo(
      planId,
      remotionCode,
      {
        id: 'MyVideo',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: 90
      },
      {}, // inputProps
      (status) => {
        console.log('Status:', status);
      }
    );

    console.log('Video ready:', videoUrl);
  } catch (error) {
    console.error('Render failed:', error);
  }
}
```

### Option B: Using Real-time Subscriptions

```typescript
import { renderVideoViaEdgeFunction, subscribeToRenderStatus } from './edgeFunctionService';

async function renderVideoRealtime(planId: string) {
  // Subscribe to status updates
  const unsubscribe = subscribeToRenderStatus(
    planId,
    (status, videoUrl, error) => {
      console.log('Status:', status);
      
      if (status === 'completed' && videoUrl) {
        console.log('Video ready:', videoUrl);
        unsubscribe();
      } else if (status === 'failed') {
        console.error('Render failed:', error);
        unsubscribe();
      }
    }
  );

  // Submit the render job
  await renderVideoViaEdgeFunction(planId, remotionCode, composition);
}
```

### Option C: Using the React Component

```tsx
import { EdgeFunctionRenderButton } from './EdgeFunctionRenderButton';

function MyComponent() {
  return (
    <EdgeFunctionRenderButton
      planId="your-plan-id"
      remotionCode={remotionCode}
      composition={{
        id: 'MyVideo',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: 90
      }}
      onComplete={(videoUrl) => {
        console.log('Video ready:', videoUrl);
      }}
      onError={(error) => {
        console.error('Render failed:', error);
      }}
    />
  );
}
```

## Step 4: Test the Integration

### 4.1 Test Health Endpoint

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "remotion-render",
  "supabaseConfigured": true
}
```

### 4.2 Test Edge Function

```bash
curl -X POST https://your-project.supabase.co/functions/v1/render-video \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "planId": "test-plan-id",
    "code": "import { AbsoluteFill } from \"remotion\"; export const MyVideo = () => <AbsoluteFill style={{ backgroundColor: \"blue\" }}><h1>Test</h1></AbsoluteFill>;",
    "composition": {
      "id": "MyVideo",
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "durationInFrames": 90
    }
  }'
```

### 4.3 Monitor Status

Check your `video_plans` table:

```sql
SELECT id, status, final_video_url, error_message, updated_at
FROM video_plans
WHERE id = 'test-plan-id';
```

## Troubleshooting

### Edge Function Not Found

Make sure your edge functions are deployed:
```bash
supabase functions list
```

### Webhook Not Being Called

Check Railway logs:
```bash
# In Railway dashboard, go to Deployments → Latest → View Logs
```

Look for:
- `[jobId] Calling webhook: ...`
- `[jobId] Webhook called successfully`

### Database Not Updating

Check edge function logs:
```bash
supabase functions logs render-webhook
```

### Video Upload Failing

Verify:
1. Supabase storage bucket `rendered-videos` exists
2. Bucket has public access (or appropriate policies)
3. Railway has correct `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

## Alternative: Railway Returns Video Data

If you want Railway to have ZERO Supabase credentials, you can modify the webhook to accept the video file directly instead of a URL. This requires:

1. Railway renders the video and sends the binary data to the webhook
2. The webhook edge function uploads the video to Supabase Storage

This approach is more secure but increases network transfer times. Contact us if you need help implementing this variation.

## Cost Considerations

**Edge Function Invocations**: Free tier includes 500,000 invocations/month
**Railway Rendering**: ~$0.05-0.10 per video render
**Storage**: Supabase free tier includes 1GB

## Next Steps

1. Set up monitoring for failed renders
2. Add authentication to edge functions if needed
3. Implement retry logic for failed webhooks
4. Add video processing queue for high volume

## Support

For issues:
- Check Railway logs for rendering errors
- Check Supabase edge function logs for webhook errors
- Verify all environment variables are set correctly
- Ensure database schema matches expected structure
