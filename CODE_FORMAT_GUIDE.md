# Code Format Guide for Rendering

This document explains the exact format your Remotion code needs to be in when sending it to the Railway server for rendering.

## The Problem

When you develop compositions in Remotion Studio, you might copy just the component code. However, when sending code to the server for rendering, it needs to be in a specific format with proper imports and exports.

**Symptoms:**
- ✅ Animations work in Studio preview
- ❌ Animations disappear in rendered video
- ❌ Shapes or transitions missing in final output

## Required Code Format

Your code must be a **complete, self-contained module** with:

1. React import (explicit)
2. Remotion imports
3. Component export
4. Proper JSX syntax

### ✅ Correct Format

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    fps,
    frame,
    config: {
      damping: 100,
    },
  });
  
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  return (
    <AbsoluteFill style={{
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        transform: `scale(${scale})`,
        opacity,
      }}>
        <h1 style={{ fontSize: 100, color: 'black' }}>
          Hello World
        </h1>
      </div>
    </AbsoluteFill>
  );
};
```

### ❌ Incorrect Format (Missing React Import)

```tsx
// ❌ This will fail to render animations properly
import { AbsoluteFill, useCurrentFrame, spring } from 'remotion';

export const MyVideo = () => {
  // ... rest of code
};
```

### ❌ Incorrect Format (No Export)

```tsx
// ❌ This won't work - no export
import React from 'react';
import { AbsoluteFill } from 'remotion';

const MyVideo = () => {
  return <AbsoluteFill>Hello</AbsoluteFill>;
};
```

## Component Requirements

### 1. Import React Explicitly

```tsx
import React from 'react';
```

Even though JSX transformation might work without it in some environments, **always import React** to ensure consistency between Studio and server rendering.

### 2. Import All Remotion Functions

List ALL Remotion functions you use:

```tsx
import { 
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Video,
  Audio,
  Img,
  // ... any other Remotion imports
} from 'remotion';
```

### 3. Export Your Component

Use a **named export**:

```tsx
export const MyVideo = () => {
  // ...
};
```

### 4. Use Proper Props Interface (Optional but Recommended)

```tsx
interface MyVideoProps {
  text: string;
  color: string;
}

export const MyVideo: React.FC<MyVideoProps> = ({ text, color }) => {
  // ...
};
```

## Common Animations That Need Proper Format

### Spring Animations

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Spring animation for scale
  const scale = spring({
    fps,
    frame,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5,
    },
  });
  
  return (
    <AbsoluteFill>
      <div style={{ transform: `scale(${scale})` }}>
        Animated!
      </div>
    </AbsoluteFill>
  );
};
```

### Interpolate Animations

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();
  
  // Fade in
  const opacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  // Move from left
  const translateX = interpolate(
    frame,
    [0, 60],
    [-1000, 0],
    {
      extrapolateRight: 'clamp',
    }
  );
  
  return (
    <AbsoluteFill>
      <div style={{ 
        opacity,
        transform: `translateX(${translateX}px)`
      }}>
        Animated Text
      </div>
    </AbsoluteFill>
  );
};
```

## How to Send Code from Studio

### Step 1: Develop in Studio

```bash
cd remotion-render-server
npm run dev
```

### Step 2: Perfect Your Composition

- Edit in Studio
- Test all animations
- Verify everything looks correct

### Step 3: Export Code in Correct Format

When you're ready to render on the server, structure your code like this:

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

// Copy your component code from Studio HERE
// Make sure all imports are at the top
// Make sure the export is included

export const MyVideo = () => {
  // Your composition code
  return <AbsoluteFill>...</AbsoluteFill>;
};
```

### Step 4: Send to Server

```typescript
import { renderVideoOnRailway } from './renderService';

const code = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const scale = spring({ fps: 30, frame });
  
  return (
    <AbsoluteFill>
      <div style={{ transform: \`scale(\${scale})\` }}>
        Hello World
      </div>
    </AbsoluteFill>
  );
};
`;

const videoUrl = await renderVideoOnRailway(code, {
  id: 'MyVideo',
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 150,
});
```

## Composition ID Must Match

The `id` in the composition config **must match** your exported component name:

```typescript
// Code exports: MyVideo
export const MyVideo = () => { ... };

// Composition config must use: 'MyVideo'
const composition = {
  id: 'MyVideo',  // ← Must match component name
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 150,
};
```

## Testing Your Code Format

Before sending to production, test with the `/render-simple` endpoint:

```bash
curl -X POST http://localhost:3001/render-simple \
  -H "Content-Type: application/json" \
  -d '{"text":"Test","duration":90}'
```

If this works but your custom code doesn't, the issue is in your code format.

## Debugging Checklist

If animations disappear in the final render:

- [ ] React is imported explicitly: `import React from 'react';`
- [ ] All Remotion functions are imported: `import { ... } from 'remotion';`
- [ ] Component is exported: `export const MyVideo = () => { ... };`
- [ ] Composition ID matches component name
- [ ] All dependencies (spring, interpolate, etc.) are imported
- [ ] JSX syntax is correct (proper closing tags, quotes, etc.)
- [ ] No external dependencies that aren't available on the server
- [ ] All inline styles use proper React style object syntax

## Server-Side Rendering Differences

The server uses **headless Chromium** to render. Some things that work in Studio might not work on the server:

**✅ Will Work:**
- Remotion animations (spring, interpolate)
- CSS transforms and transitions
- Inline styles
- Web-safe fonts
- Public URLs for images/videos

**❌ Might Not Work:**
- Local file system access
- Browser-specific APIs
- Custom fonts without proper loading
- External dependencies not in package.json

## Example: Complete Working Code

This is a complete, working example you can use as a template:

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface VideoProps {
  titleText: string;
  titleColor: string;
}

export const MyAnimatedVideo: React.FC<VideoProps> = ({
  titleText = 'Hello World',
  titleColor = '#000000',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Spring animation for entrance
  const scale = spring({
    fps,
    frame: frame - 10,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  // Fade in at start, fade out at end
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Rotate continuously
  const rotation = interpolate(
    frame,
    [0, durationInFrames],
    [0, 360]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          opacity,
        }}
      >
        <h1
          style={{
            fontSize: 100,
            fontWeight: 'bold',
            color: titleColor,
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            margin: 0,
          }}
        >
          {titleText}
        </h1>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #91EAE4, #86A8E7)',
            margin: '40px auto 0',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
```

## Need Help?

If you're still experiencing issues:

1. Check the server logs for specific error messages
2. Test the `/render-simple` endpoint to verify server is working
3. Verify your code format matches the examples above
4. Check that all imports are present
5. Ensure React is explicitly imported

---

**Remember:** The key difference between Studio and server rendering is that the server needs a complete, self-contained code module with all imports explicitly declared.
