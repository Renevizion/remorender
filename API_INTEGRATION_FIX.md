# API Integration Fix Required

## Problem

The video-canvas-creator's `render-video` edge function is sending the video plan in the wrong format, causing renders to fail with "Welcome to Remotion" instead of the actual video content.

## Root Cause

**Current edge function code sends:**
```typescript
const renderPayload = {
  planId,
  code: remotionCode,
  plan: planData.plan,        // ❌ WRONG - 'plan' at top level
  composition: {
    id: 'DynamicVideo',
    width,
    height,
    fps,
    durationInFrames,
  },
  webhookUrl,
};

fetch(`${railwayUrl}/render`, {
  method: 'POST',
  body: JSON.stringify(renderPayload),
});
```

**But remorender server expects:**
```javascript
{
  code: string,
  composition: {
    id: string,
    // Note: width, height, fps, durationInFrames NOT needed here
  },
  inputProps: {              // ✅ CORRECT - plan inside inputProps
    plan: VideoPlan          // This is what DynamicVideo component expects
  },
  webhookUrl: string,
  jobId: string,
  planId: string
}
```

## The Fix

In **video-canvas-creator**, update `supabase/functions/render-video/index.ts`:

### Change from:
```typescript
const renderPayload = {
  planId,
  code: remotionCode,
  plan: planData.plan,        // ❌ Remove this
  composition: {
    id: 'DynamicVideo',
    width,                    // ❌ Remove these - not needed
    height,
    fps,
    durationInFrames,
  },
  webhookUrl,
};
```

### Change to:
```typescript
const renderPayload = {
  planId,
  jobId: planId,              // ✅ Add jobId for logging
  code: remotionCode,
  inputProps: {               // ✅ Wrap plan in inputProps
    plan: planData.plan,
  },
  composition: {
    id: 'DynamicVideo',       // ✅ Only the composition ID needed
  },
  webhookUrl,
};
```

## Why This Matters

1. **Server reads from inputProps**: The remorender server passes `inputProps` to Remotion's `selectComposition()` and `renderMedia()` functions
2. **DynamicVideo expects plan prop**: The DynamicVideo component signature is `DynamicVideo: React.FC<{ plan: VideoPlan }>`
3. **calculateMetadata reads from props.plan**: The composition metadata function reads `props.plan` which comes from inputProps
4. **Empty inputProps = fallback**: When inputProps is undefined/empty, Remotion uses defaultProps which is why you saw "Welcome to Remotion"

## How Remotion Processes This

```javascript
// Server calls selectComposition with inputProps
const comp = await selectComposition({
  serveUrl: bundleLocation,
  id: 'DynamicVideo',
  inputProps: { plan: actualVideoPlan }  // ✅ This is what's needed
});

// Remotion then:
// 1. Calls calculateMetadata({ props: inputProps })
//    - Returns { fps: 30, durationInFrames: 900, width: 1920, height: 1080 }
// 2. Renders DynamicVideo component with props = inputProps
//    - DynamicVideo receives { plan: actualVideoPlan }
// 3. Produces video with correct duration and content
```

## Testing After Fix

1. Update the edge function as shown above
2. Deploy the change to Supabase
3. Render a new video with your actual content
4. Check Railway logs - you should see:
   ```
   Input Props: {
     "plan": {
       "duration": 30,
       "fps": 30,
       "scenes": [ ... your actual scenes ... ]
     }
   }
   ```
5. Video output should show your content, not "Welcome to Remotion"
6. Video duration should match your plan (e.g., 30 seconds, not 5 seconds)

## Complete Example

Here's what a correct render request should look like:

```typescript
const renderRequest = {
  jobId: 'job-123',
  planId: 'plan-456',
  code: remotionCode,
  inputProps: {
    plan: {
      id: 'plan-456',
      duration: 30,
      fps: 30,
      resolution: { width: 1920, height: 1080 },
      scenes: [
        {
          id: 'scene-1',
          startTime: 0,
          duration: 5,
          elements: [
            {
              id: 'text-1',
              type: 'text',
              content: 'My Actual Content',
              position: { x: 50, y: 50, z: 1 },
              size: { width: 80, height: 20 },
              style: { fontSize: 72 }
            }
          ]
        }
      ],
      style: { ... }
    }
  },
  composition: {
    id: 'DynamicVideo'
  },
  webhookUrl: 'https://your-webhook-url'
};
```

## Summary

**What was wrong:** Edge function sent `plan` at top level instead of inside `inputProps`
**Why it failed:** Server couldn't find `inputProps`, so Remotion used defaultProps with "Welcome to Remotion"
**How to fix:** Wrap the plan in `inputProps: { plan: ... }` in the edge function
