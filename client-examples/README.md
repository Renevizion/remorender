# Client Examples

This directory contains example code for integrating the Remotion render server with your frontend application (e.g., Lovable, Next.js, React).

## Integration Approaches

### 🔒 Webhook Approach (Recommended for Lovable Cloud)

Use Supabase edge functions as a secure proxy between your app and Railway. Railway never needs your database credentials!

**Files:**
- **edgeFunctionService.ts** - Service for edge function integration (recommended)
- **EdgeFunctionRenderButton.tsx** - React component with real-time updates

### 📡 Direct API Approach (Legacy)

Call Railway server directly. Suitable for local development or when not using Lovable Cloud.

**Files:**
- **config.ts** - Configuration file for the render server URL
- **renderService.ts** - Core service for making render API calls
- **videoManager.ts** - Integration with Supabase for video plan management
- **RenderButton.tsx** - React component for rendering videos with UI

## Usage

### Option 1: Webhook Approach (Recommended)

See the complete guide: [../WEBHOOK_SETUP.md](../WEBHOOK_SETUP.md)

#### A. Basic Usage with Polling

```typescript
import { renderAndWaitForVideo } from './edgeFunctionService';

async function renderVideo(planId: string) {
  try {
    const videoUrl = await renderAndWaitForVideo(
      planId,
      remotionCode,
      {
        id: 'DynamicVideo',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: 90
      },
      {}, // inputProps
      (status) => {
        console.log('Status:', status); // Logs: pending, rendering, completed
      }
    );

    console.log('Video ready:', videoUrl);
  } catch (error) {
    console.error('Render failed:', error);
  }
}
```

#### B. Real-time Updates with Supabase Subscriptions

```typescript
import { renderVideoViaEdgeFunction, subscribeToRenderStatus } from './edgeFunctionService';

async function renderVideoRealtime(planId: string) {
  // Subscribe to real-time status updates
  const unsubscribe = subscribeToRenderStatus(
    planId,
    (status, videoUrl, error) => {
      console.log('Status update:', status);
      
      if (status === 'completed' && videoUrl) {
        console.log('Video ready:', videoUrl);
        unsubscribe(); // Clean up subscription
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

#### C. React Component with Edge Functions

```tsx
import { EdgeFunctionRenderButton } from './EdgeFunctionRenderButton';

function MyApp() {
  return (
    <div>
      <h1>My Video App</h1>
      <EdgeFunctionRenderButton
        planId="your-plan-id"
        remotionCode={remotionCode}
        composition={{
          id: 'DynamicVideo',
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
    </div>
  );
}
```

The component provides two modes:
- **Polling Mode**: Checks status every 5 seconds
- **Real-time Mode**: Uses Supabase subscriptions for instant updates

### Option 2: Direct API Approach (Legacy)

#### 1. Configure Server URL

Update `config.ts` with your Railway deployment URL:
```typescript
export const RENDER_SERVER_URL = 'https://your-app.railway.app';
```

#### 2. Use the Render Service

Basic usage:
```typescript
import { renderVideoOnRailway } from './renderService';

const remotionCode = `
import { AbsoluteFill } from 'remotion';
export const MyVideo = () => (
  <AbsoluteFill style={{ backgroundColor: 'blue' }}>
    Hello World
  </AbsoluteFill>
);
`;

const videoUrl = await renderVideoOnRailway(
  remotionCode,
  {
    id: 'DynamicVideo',
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 90
  }
);
```

#### 3. Use with Supabase

If you're using Supabase to manage video plans:
```typescript
import { handleRenderVideo } from './videoManager';

const videoUrl = await handleRenderVideo('video-plan-id');
```

#### 4. Use the React Component

```tsx
import { RenderButton } from './RenderButton';

function MyApp() {
  return (
    <div>
      <h1>My Video App</h1>
      <RenderButton planId="your-plan-id" />
    </div>
  );
}
```

## Environment Variables

### For Edge Function Approach (Recommended)

Set in Supabase dashboard or Lovable secrets:
- `RAILWAY_RENDER_URL` - Your Railway server URL (e.g., https://your-app.railway.app)
- `SUPABASE_URL` - Automatically available in Lovable Cloud
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically available in Lovable Cloud

Client environment:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### For Direct API Approach

In your client app:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

## Database Schema

For both approaches, your `video_plans` table should have:

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
```

## TypeScript

All examples are written in TypeScript. If you're using JavaScript, simply remove the type annotations.

## Comparison: Webhook vs Direct API

| Feature | Webhook Approach | Direct API |
|---------|-----------------|------------|
| Security | ✅ No credentials in Railway | ⚠️ Railway needs Supabase keys |
| Real-time Updates | ✅ Supabase subscriptions | ❌ Manual polling needed |
| Scalability | ✅ Better for high volume | ⚠️ Limited by rate limiting |
| Complexity | Medium (requires edge functions) | Low (simple API calls) |
| Best For | Production, Lovable Cloud | Local dev, testing |

## Customization

Feel free to modify these examples to fit your specific use case:
- Add error handling and retry logic
- Implement progress tracking
- Add authentication to edge functions
- Customize the UI components
- Add video preview before rendering
- Implement render queue management
