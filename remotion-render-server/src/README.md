# Remotion Compositions

This directory contains Remotion compositions that can be previewed in Remotion Studio and rendered via the server.

## Files

### `index.tsx`
Entry point for Remotion Studio. Registers the Root component.

### `Root.tsx`
Main composition registry. All compositions must be registered here to appear in Remotion Studio.

### `HelloWorld.tsx`
A sample composition demonstrating:
- Animated text with spring animation
- Customizable colors and text
- Gradient effects

**Props:**
- `titleText` (string): Main text to display
- `titleColor` (string): Color of the title text
- `logoColor1` (string): First gradient color
- `logoColor2` (string): Second gradient color

### `SupabaseVideo.tsx`
A composition for working with videos from Supabase Storage:
- Loads video from URL (via environment variable)
- Adds animated text overlay
- Shows placeholder when no video URL is provided

**Props:**
- `videoUrl` (string): URL of the video to load
- `text` (string): Overlay text to display

**Environment Variables:**
- `REMOTION_VIDEO_URL`: Set this to load a video in Studio

**Example:**
```bash
REMOTION_VIDEO_URL="https://your-project.supabase.co/storage/v1/object/public/rendered-videos/video.mp4" npm run dev
```

## Adding New Compositions

1. **Create a new component file:**
   ```tsx
   // MyComposition.tsx
   import React from 'react';
   import { AbsoluteFill } from 'remotion';

   interface MyCompositionProps {
     text: string;
   }

   export const MyComposition: React.FC<MyCompositionProps> = ({ text }) => {
     return (
       <AbsoluteFill>
         <h1>{text}</h1>
       </AbsoluteFill>
     );
   };
   ```

2. **Register in Root.tsx:**
   ```tsx
   import { MyComposition } from './MyComposition';

   // Add inside RemotionRoot component:
   <Composition
     id="MyComposition"
     component={MyComposition}
     durationInFrames={150}
     fps={30}
     width={1920}
     height={1080}
     defaultProps={{
       text: 'Hello World',
     }}
   />
   ```

3. **Restart Studio** to see your composition

## Best Practices

1. **TypeScript**: Use TypeScript with proper prop interfaces
2. **Props**: Make compositions configurable with props
3. **Defaults**: Always provide sensible default props
4. **Responsive**: Use Remotion hooks like `useVideoConfig()` for responsive design
5. **Performance**: Optimize heavy operations with `useMemo()` and `React.memo()`
6. **Assets**: Load external assets (images, videos) via URLs, not local files
7. **Environment**: Use environment variables for dynamic configuration

## Remotion Hooks

Common hooks you'll use:

- `useCurrentFrame()`: Get the current frame number
- `useVideoConfig()`: Get video dimensions, fps, duration
- `interpolate()`: Map frame ranges to value ranges
- `spring()`: Create spring animations
- `useAudioData()`: Analyze audio data
- `delayRender()`: Wait for async operations

## Resources

- [Remotion Documentation](https://www.remotion.dev/docs)
- [Remotion API Reference](https://www.remotion.dev/docs/api)
- [Example Compositions](https://github.com/remotion-dev/remotion/tree/main/packages/example)
- [Remotion Discord](https://remotion.dev/discord)
