# Using Remotion Studio

This guide explains how to use Remotion Studio to preview and edit your videos locally before rendering them on Railway.

## Important: Code Format for Rendering

**Before you start**, understand that code format matters when sending compositions to the server for rendering. If you experience animations working in Studio but disappearing in the final render:

👉 **Read the [Code Format Guide](./CODE_FORMAT_GUIDE.md)** for the exact format required.

Common issue: Missing `import React from 'react';` or incomplete module structure.

## What is Remotion Studio?

Remotion Studio is a visual editor that allows you to:
- Preview your video compositions in real-time
- Edit composition properties (text, colors, timing, etc.)
- Scrub through frames to see exactly how your video looks
- Test different parameters before rendering on the server

## Quick Start

### 1. Start Remotion Studio

From the `remotion-render-server` directory:

```bash
cd remotion-render-server
npm install
npm run dev
```

Or using the full command:

```bash
npx remotion studio
```

The studio will open in your browser at `http://localhost:3000` (or a higher port if 3000 is in use).

## Available Compositions

### HelloWorld (Sample Composition)

A simple animated text composition perfect for testing.

**Default Properties:**
- `titleText`: "Welcome to Remotion Studio"
- `titleColor`: "#000000"
- `logoColor1`: "#91EAE4"
- `logoColor2`: "#86A8E7"

### SupabaseVideo (For Editing Supabase Videos)

A composition that can load and overlay text on videos from Supabase Storage.

**Usage:**

```bash
REMOTION_VIDEO_URL="https://your-supabase-url.supabase.co/storage/v1/object/public/rendered-videos/your-video.mp4" npm run dev
```

**Default Properties:**
- `videoUrl`: Loaded from `REMOTION_VIDEO_URL` environment variable
- `text`: "Edit Me in Studio"

## Workflow for Users

### Standard Workflow (Preview then Render)

This is how users would typically use the system:

1. **Develop Locally with Studio:**
   ```bash
   cd remotion-render-server
   npm run dev
   ```
   - Edit your composition in the studio
   - Fine-tune parameters, timing, and effects
   - Test with sample data

2. **Prepare Your Code:**
   - Once satisfied with the composition in Studio, copy the final code
   - The code should be a complete Remotion component (TSX/JSX)

3. **Render on Railway:**
   - Use the client API or edge functions to send your code to Railway
   - The server will bundle and render your video
   - Video is uploaded to Supabase Storage

4. **Get Results:**
   - Receive the Supabase URL of the rendered video
   - Use this URL in your application

### Working with Existing Videos

If you have a video already rendered to Supabase and want to edit it:

1. **Load the Video in Studio:**
   ```bash
   REMOTION_VIDEO_URL="https://your-supabase-url.supabase.co/storage/v1/object/public/rendered-videos/video.mp4" npm run dev
   ```

2. **Edit the SupabaseVideo Composition:**
   - Select "SupabaseVideo" from the composition dropdown
   - Edit the overlay text and effects
   - Preview changes in real-time

3. **Export New Code:**
   - Copy the modified composition code
   - Send it to Railway for rendering
   - Get a new video with your changes

## Environment Variables

### For Studio Development

You can pass environment variables to customize compositions:

```bash
# Load a specific video
REMOTION_VIDEO_URL="https://your-url.com/video.mp4" npm run dev

# Pass custom data (in your composition code)
REMOTION_TITLE="My Custom Title" npm run dev
```

### Using .env File

Create a `.env` file in the `remotion-render-server` directory:

```env
REMOTION_VIDEO_URL=https://your-supabase-url.supabase.co/storage/v1/object/public/rendered-videos/video.mp4
```

Then run:
```bash
npm run dev
```

## Integration with Your Workflow

### Option 1: Studio for Development Only

**Best for:** Teams where developers create compositions, users trigger renders

1. Developers use Studio to create and test compositions
2. Compositions are stored as code in your app
3. Users trigger renders via your app's UI
4. Videos render on Railway and upload to Supabase
5. Users never interact with Studio directly

### Option 2: Studio for Preview and Editing

**Best for:** Users who want to customize videos before rendering

1. User creates initial video via your app
2. Video renders and uploads to Supabase
3. User can run Studio locally with the Supabase URL:
   ```bash
   REMOTION_VIDEO_URL="<supabase-url>" npm run dev
   ```
4. User edits composition in Studio (text, effects, etc.)
5. User exports modified code from Studio
6. User re-renders via your app with the new code
7. New video uploads to Supabase

### Option 3: Hybrid Approach (Recommended)

**Best for:** Most production applications

1. **Development Phase:**
   - Use Studio to develop and test base compositions
   - Store these as templates in your codebase

2. **User Phase:**
   - Users trigger renders with their data
   - No Studio needed for end-users
   - Videos render automatically on Railway

3. **Power Users (Optional):**
   - Provide CLI or desktop app that includes Studio
   - Power users can customize and preview
   - Still renders on Railway for consistency

## How Studio Works with Server

**Important:** Studio and the rendering server are separate but complementary:

- **Studio (`npm run dev`)**: 
  - Runs locally on your machine
  - Visual editor for composition development
  - Does NOT render final videos
  - Port 3000+ (local only)

- **Rendering Server (`npm start`)**:
  - Runs on Railway (production)
  - Accepts code and renders videos
  - Uploads to Supabase Storage
  - Port defined by Railway

**You don't run both at the same time in production.** The workflow is:
1. Develop with Studio locally
2. Deploy server to Railway
3. Send composition code to Railway for production renders

## Passing Supabase URLs

The system supports both approaches:

### Pass URL as Environment Variable (Studio)
```bash
REMOTION_VIDEO_URL="<url>" npm run dev
```
Good for: Loading existing videos to preview/edit locally

### Pass URL in Composition Props (Rendering)
```typescript
const inputProps = {
  videoUrl: "https://supabase-url.com/video.mp4",
  text: "My Custom Text"
};

await renderVideoOnRailway(code, composition, inputProps);
```
Good for: Dynamic data in production renders

## Studio Configuration

Edit `remotion.config.ts` to customize Studio behavior:

```typescript
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setPort(3000); // Change default port
Config.setEntryPoint('./src/index.tsx');
```

## Adding Your Own Compositions

1. Create a new component in `src/`:
   ```tsx
   // src/MyComposition.tsx
   import { AbsoluteFill } from 'remotion';
   
   export const MyComposition = ({ text }: { text: string }) => {
     return (
       <AbsoluteFill>
         <h1>{text}</h1>
       </AbsoluteFill>
     );
   };
   ```

2. Register it in `src/Root.tsx`:
   ```tsx
   import { MyComposition } from './MyComposition';
   
   <Composition
     id="MyComposition"
     component={MyComposition}
     durationInFrames={150}
     fps={30}
     width={1920}
     height={1080}
     defaultProps={{ text: 'Hello' }}
   />
   ```

3. Restart Studio to see your new composition

## Tips & Tricks

### Fast Preview
- Use lower quality settings in Studio for faster preview
- Studio shows real-time preview, not final quality

### Testing Before Rendering
- Always test in Studio before sending to Railway
- Studio is free, Railway rendering costs resources

### Keyboard Shortcuts
- `Space`: Play/Pause
- `Arrow Keys`: Navigate frames
- `J/L`: Slower/Faster playback
- `I/O`: Set in/out points

### Debugging
- Check browser console for errors
- Make sure all imports are correct
- Verify environment variables are set

## Troubleshooting

### Studio won't start
```bash
# Clear node_modules and reinstall
cd remotion-render-server
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Port already in use
Studio will automatically use a higher port (3001, 3002, etc.)

### Video doesn't load in SupabaseVideo
- Verify the URL is public and accessible
- Check CORS settings on Supabase Storage
- Make sure the URL is set in environment variables

### Changes don't appear
- Restart Studio: `Ctrl+C` then `npm run dev`
- Check that you saved all files
- Clear browser cache

## Learn More

- [Remotion Documentation](https://www.remotion.dev/docs)
- [Remotion Studio Guide](https://www.remotion.dev/docs/studio)
- [Composition Examples](https://github.com/remotion-dev/remotion/tree/main/packages/example)
- [API Reference](https://www.remotion.dev/docs/api)
