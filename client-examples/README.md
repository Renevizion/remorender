# Client Examples

This directory contains example code for integrating the Remotion render server with your frontend application (e.g., Lovable, Next.js, React).

## Files

- **config.ts** - Configuration file for the render server URL
- **renderService.ts** - Core service for making render API calls
- **videoManager.ts** - Integration with Supabase for video plan management
- **RenderButton.tsx** - React component for rendering videos with UI

## Usage

### 1. Configure Server URL

Update `config.ts` with your Railway deployment URL:
```typescript
export const RENDER_SERVER_URL = 'https://your-app.railway.app';
```

### 2. Use the Render Service

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
    id: 'MyVideo',
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 90
  }
);
```

### 3. Use with Supabase

If you're using Supabase to manage video plans:
```typescript
import { handleRenderVideo } from './videoManager';

const videoUrl = await handleRenderVideo('video-plan-id');
```

### 4. Use the React Component

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

For Supabase integration in `videoManager.ts`, set:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

## TypeScript

All examples are written in TypeScript. If you're using JavaScript, simply remove the type annotations.

## Customization

Feel free to modify these examples to fit your specific use case:
- Add error handling
- Implement progress tracking
- Add authentication
- Customize the UI
- Add video preview before rendering
