# Quick Start Guide - Using Remotion Studio

This guide will help you get started with Remotion Studio for previewing and editing videos.

## ⚠️ Important: Code Format

**If animations work in Studio but disappear in rendered videos**, you need to fix your code format!

👉 **Read:** [CODE_FORMAT_GUIDE.md](./CODE_FORMAT_GUIDE.md) - Explains the exact format required for server rendering.

**Quick fix:** Always include `import React from 'react';` at the top of your code.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Renevizion/remorender.git
   cd remorender/remotion-render-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Remotion Studio:**
   ```bash
   npm run dev
   ```

   The studio will open in your browser at `http://localhost:3000`.

## Basic Usage

### Scenario 1: Test with Sample Compositions

1. Start the studio: `npm run dev`
2. Select "HelloWorld" from the composition dropdown
3. Edit properties in the right panel:
   - Change `titleText` to your own message
   - Adjust colors by clicking on the color pickers
4. Scrub through the timeline to see the animation
5. Press Space to play/pause

### Scenario 2: Work with Supabase Videos

If you have a video already uploaded to Supabase:

1. **Set the environment variable:**
   ```bash
   REMOTION_VIDEO_URL="https://your-project.supabase.co/storage/v1/object/public/rendered-videos/video.mp4" npm run dev
   ```

2. **Select the SupabaseVideo composition**
3. **Edit the overlay text** in the properties panel
4. **Preview your changes** in real-time

### Scenario 3: Create Your Own Composition

1. **Create a new file** in `src/MyVideo.tsx`:
   ```tsx
   import React from 'react';
   import { AbsoluteFill, useCurrentFrame } from 'remotion';

   export const MyVideo: React.FC<{ message: string }> = ({ message }) => {
     const frame = useCurrentFrame();
     
     return (
       <AbsoluteFill style={{
         backgroundColor: '#4a90e2',
         justifyContent: 'center',
         alignItems: 'center',
       }}>
         <h1 style={{ 
           color: 'white', 
           fontSize: 80,
           transform: `translateY(${frame}px)` 
         }}>
           {message}
         </h1>
       </AbsoluteFill>
     );
   };
   ```

2. **Register it** in `src/Root.tsx`:
   ```tsx
   import { MyVideo } from './MyVideo';
   
   // Add inside RemotionRoot component:
   <Composition
     id="MyVideo"
     component={MyVideo}
     durationInFrames={150}
     fps={30}
     width={1920}
     height={1080}
     defaultProps={{
       message: 'Hello from My Video!',
     }}
   />
   ```

3. **Restart the studio** to see your new composition

## Integration with Production Workflow

### Development Flow:

```
1. Develop locally with Studio (npm run dev)
   ↓
2. Perfect your composition with live preview
   ↓
3. Copy the final composition code
   ↓
4. Send to Railway server via API or edge function
   ↓
5. Video renders and uploads to Supabase
   ↓
6. Your app receives the Supabase video URL
```

### For Editing Existing Videos:

```
1. Get video URL from Supabase
   ↓
2. Load in Studio: REMOTION_VIDEO_URL="<url>" npm run dev
   ↓
3. Edit composition (add overlays, effects, text)
   ↓
4. Export modified code
   ↓
5. Send to Railway for re-rendering
   ↓
6. Get new video with changes
```

## Common Commands

```bash
# Start studio (default port 3000)
npm run dev

# Start studio with custom video
REMOTION_VIDEO_URL="https://..." npm run dev

# Start studio with custom port (if 3000 is busy)
npx remotion studio --port 3001

# List all compositions without opening browser
npx remotion compositions src/index.tsx

# Render a composition to file (for testing)
npx remotion render src/index.tsx HelloWorld output.mp4
```

## Tips

1. **Hot Reload**: Changes to your compositions auto-reload in the browser
2. **Keyboard Shortcuts**: 
   - Space: Play/Pause
   - J/L: Slower/Faster
   - Arrow Keys: Navigate frames
3. **Performance**: Lower preview quality in Studio settings for faster iteration
4. **Testing**: Always test in Studio before sending expensive renders to Railway

## Troubleshooting

**Studio won't start:**
```bash
cd remotion-render-server
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Port 3000 in use:**
Studio will automatically pick the next available port (3001, 3002, etc.)

**Changes don't show:**
- Save all files
- Restart Studio with Ctrl+C then `npm run dev`
- Check browser console for errors

## Next Steps

- Read the full guide: [REMOTION_STUDIO.md](../REMOTION_STUDIO.md)
- Deploy to Railway: [README.md](../README.md)
- Setup webhooks: [WEBHOOK_SETUP.md](../WEBHOOK_SETUP.md)
- Learn Remotion: [remotion.dev/docs](https://remotion.dev/docs)
