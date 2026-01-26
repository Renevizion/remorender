# Part 6: Railway Cloud Renderer Updates (For External Server)

## Overview

This document specifies the updates needed for the Railway render server to support:
1. Dynamic aspect ratios from video plans
2. Resolution settings from `plan.resolution` 
3. Voiceover captions in generated Remotion code

These changes allow the system to render videos with varying dimensions and aspect ratios, and automatically include caption components when scenes contain voiceover content.

## What Railway Needs

### 1. Accept Aspect Ratio in Request Body

The Railway render endpoint should accept an optional `aspectRatio` field in the request:

```typescript
interface RenderRequest {
  jobId: string;
  planId: string;
  code: string;
  composition: {
    id: string;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  inputProps?: any;
  webhookUrl?: string;
  aspectRatio?: number;  // NEW: e.g., 16/9, 9/16, 1, etc.
}
```

**Usage**: The aspect ratio can be used for validation and logging. The actual dimensions should come from `plan.resolution`.

### 2. Use `plan.resolution` for Composition Dimensions

Instead of hardcoded `1920x1080` dimensions, the server should use resolution data from the plan.

**Current approach (hardcoded):**
```javascript
// DON'T DO THIS
composition: {
  id: 'MyVideo',
  width: 1920,  // hardcoded
  height: 1080, // hardcoded
  fps: 30,
  durationInFrames: 90
}
```

**Updated approach (dynamic):**
```javascript
// DO THIS - use plan.resolution
composition: {
  id: 'MyVideo',
  width: plan.resolution.width,   // from plan object
  height: plan.resolution.height, // from plan object
  fps: 30,
  durationInFrames: 90
}
```

**Implementation Note**: The `render-video` edge function will send the complete composition object with the correct width/height already populated from `plan.resolution`, so Railway doesn't need to extract it - just use the provided dimensions.

### 3. Handle Voiceover Captions in Generated Code

When scenes contain voiceover content, the Remotion code should include Caption components to display the text.

## Code Generation: `generateRemotionCode` Function

For systems that generate Remotion code (external to Railway), the code generation function should be updated:

### Caption Component Template

Include this Caption component in generated code when voiceovers are present:

```typescript
// Caption Component for Voiceovers
interface CaptionProps {
  text: string;
  startFrame: number;
  endFrame: number;
}

const Caption: React.FC<CaptionProps> = ({ text, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Only show caption during its time window
  if (frame < startFrame || frame > endFrame) {
    return null;
  }
  
  // Fade in/out animations
  const fadeInDuration = 10; // frames
  const fadeOutDuration = 10; // frames
  
  let opacity = 1;
  if (frame < startFrame + fadeInDuration) {
    opacity = (frame - startFrame) / fadeInDuration;
  } else if (frame > endFrame - fadeOutDuration) {
    opacity = (endFrame - frame) / fadeOutDuration;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '24px',
        fontWeight: 500,
        maxWidth: '80%',
        textAlign: 'center',
        opacity,
        zIndex: 100,
      }}
    >
      {text}
    </div>
  );
};
```

### Updated `generateRemotionCode` Logic

The code generation function should include Caption components when `scene.voiceover` exists:

```typescript
function generateRemotionCode(plan: VideoPlan): string {
  const { resolution, scenes } = plan;
  
  // Use plan.resolution instead of hardcoded 1920x1080
  const width = resolution.width;
  const height = resolution.height;
  
  let imports = `
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import React from 'react';
`;

  // Add Caption component if any scene has voiceover
  const hasVoiceover = scenes.some(scene => scene.voiceover);
  if (hasVoiceover) {
    imports += `
// Caption Component for Voiceovers
interface CaptionProps {
  text: string;
  startFrame: number;
  endFrame: number;
}

const Caption: React.FC<CaptionProps> = ({ text, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  
  if (frame < startFrame || frame > endFrame) {
    return null;
  }
  
  const fadeInDuration = 10;
  const fadeOutDuration = 10;
  
  let opacity = 1;
  if (frame < startFrame + fadeInDuration) {
    opacity = (frame - startFrame) / fadeInDuration;
  } else if (frame > endFrame - fadeOutDuration) {
    opacity = (endFrame - frame) / fadeOutDuration;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '24px',
        fontWeight: 500,
        maxWidth: '80%',
        textAlign: 'center',
        opacity,
        zIndex: 100,
      }}
    >
      {text}
    </div>
  );
};
`;
  }

  // Generate main composition
  let mainComponent = `
export const MyVideo: React.FC = () => {
  return (
    <AbsoluteFill>
`;

  // Generate scenes with captions
  let currentFrame = 0;
  scenes.forEach((scene, index) => {
    const sceneDuration = scene.durationInFrames;
    
    mainComponent += `
      <Sequence from={${currentFrame}} durationInFrames={${sceneDuration}}>
        <AbsoluteFill style={{ backgroundColor: '${scene.backgroundColor || '#000'}' }}>
          {/* Scene ${index + 1} content */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%'
          }}>
            <h1 style={{ color: 'white', fontSize: '48px' }}>
              ${scene.text || `Scene ${index + 1}`}
            </h1>
          </div>
`;

    // Add caption if scene has voiceover
    if (scene.voiceover) {
      mainComponent += `          <Caption 
            text="${scene.voiceover.text}" 
            startFrame={${currentFrame}} 
            endFrame={${currentFrame + sceneDuration}} 
          />
`;
    }

    mainComponent += `        </AbsoluteFill>
      </Sequence>
`;
    
    currentFrame += sceneDuration;
  });

  mainComponent += `    </AbsoluteFill>
  );
};
`;

  return imports + mainComponent;
}
```

### Example Output with Voiceover

When a scene has voiceover, the generated code includes Caption components:

```tsx
import { AbsoluteFill, useCurrentFrame, Sequence } from 'remotion';
import React from 'react';

const Caption: React.FC<CaptionProps> = ({ text, startFrame, endFrame }) => {
  // ... (component code as shown above)
};

export const MyVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
          {/* Scene content */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <h1 style={{ color: 'white', fontSize: '48px' }}>Welcome</h1>
          </div>
          {/* Voiceover caption */}
          <Caption 
            text="Welcome to our presentation" 
            startFrame={0} 
            endFrame={90} 
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
```

## Updated Edge Function Flow

The `render-video` edge function should:

1. Fetch the plan from the database using `planId`
2. Extract `plan.resolution` to get width and height
3. Pass the correct dimensions in the composition object to Railway
4. Optionally include `aspectRatio` for validation/logging

### Example Edge Function Update

```typescript
// In render-video edge function
const { data: plan, error: planError } = await supabase
  .from('video_plans')
  .select('plan')
  .eq('id', renderRequest.planId)
  .single();

if (planError || !plan) {
  return new Response(
    JSON.stringify({ success: false, error: 'Failed to fetch video plan' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Default resolution constants
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

// Extract resolution from plan with fallback to defaults
const resolution = plan.plan.resolution || { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
const aspectRatio = resolution.width / resolution.height;

// Update composition with plan resolution
const compositionWithResolution = {
  ...renderRequest.composition,
  width: resolution.width,
  height: resolution.height,
};

// Prepare payload for Railway with updated composition
const railwayPayload = {
  jobId,
  planId: renderRequest.planId,
  code: renderRequest.code,
  composition: compositionWithResolution, // Updated with plan.resolution
  inputProps: renderRequest.inputProps || {},
  webhookUrl,
  aspectRatio, // Optional: for validation/logging
};
```

## Resolution Examples

### Common Aspect Ratios

| Aspect Ratio | Width | Height | Use Case |
|-------------|-------|--------|----------|
| 16:9 (Standard) | 1920 | 1080 | YouTube, Desktop |
| 9:16 (Vertical) | 1080 | 1920 | TikTok, Instagram Stories |
| 1:1 (Square) | 1080 | 1080 | Instagram Feed |
| 4:3 (Classic) | 1440 | 1080 | Traditional TV |
| 21:9 (Ultrawide) | 2560 | 1080 | Cinematic |

### Plan Object Structure

```typescript
interface VideoPlan {
  id: string;
  plan: {
    duration: number;
    resolution: {
      width: number;
      height: number;
    };
    scenes: Array<{
      text: string;
      durationInFrames: number;
      backgroundColor?: string;
      voiceover?: {
        text: string;
        timestamp?: number;
      };
    }>;
  };
  generated_code: string;
  status: string;
}
```

## Benefits of These Updates

### 1. Dynamic Resolution Support
- ✅ Videos can be rendered in any aspect ratio
- ✅ No hardcoded dimensions
- ✅ Supports vertical (9:16), square (1:1), and custom ratios
- ✅ Better for mobile, social media, and diverse platforms

### 2. Voiceover Caption Support
- ✅ Automatically displays text for voiceover content
- ✅ Improves accessibility
- ✅ Better for viewers watching without sound
- ✅ Smooth fade in/out animations

### 3. Improved Flexibility
- ✅ Plan-driven rendering (all config in one place)
- ✅ Easier to update without code changes
- ✅ Better separation of concerns

## Railway Server Changes (Optional Enhancement)

While the edge function handles dimension extraction, Railway can optionally add validation:

```javascript
// In Railway server.js - optional validation
app.post('/render', renderLimiter, async (req, res) => {
  const { code, composition, inputProps, webhookUrl, jobId, planId, aspectRatio } = req.body;
  
  // Optional: Validate aspect ratio matches composition
  if (aspectRatio) {
    const actualRatio = composition.width / composition.height;
    const diff = Math.abs(actualRatio - aspectRatio);
    
    if (diff > 0.01) { // Allow small floating point differences
      console.warn(`[${jobId}] Aspect ratio mismatch: expected ${aspectRatio}, got ${actualRatio}`);
    }
  }
  
  // Log the resolution being used
  console.log(`[${jobId}] Rendering at ${composition.width}x${composition.height} (${aspectRatio || 'auto'})`);
  
  // ... rest of render logic
});
```

## Testing

### Test Different Resolutions

```bash
# Test vertical video (9:16)
curl -X POST https://your-project.supabase.co/functions/v1/render-video \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "test-vertical",
    "code": "...",
    "composition": {
      "id": "MyVideo",
      "width": 1080,
      "height": 1920,
      "fps": 30,
      "durationInFrames": 90
    }
  }'

# Test square video (1:1)
curl -X POST https://your-project.supabase.co/functions/v1/render-video \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "test-square",
    "code": "...",
    "composition": {
      "id": "MyVideo",
      "width": 1080,
      "height": 1080,
      "fps": 30,
      "durationInFrames": 90
    }
  }'
```

### Test Voiceover Captions

Create a plan with voiceover:

```json
{
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "scenes": [
    {
      "text": "Introduction",
      "durationInFrames": 90,
      "voiceover": {
        "text": "Welcome to our video presentation"
      }
    },
    {
      "text": "Main Content",
      "durationInFrames": 120,
      "voiceover": {
        "text": "Let's explore the key features"
      }
    }
  ]
}
```

## Migration Path

### Step 1: Update Edge Function
- Add plan fetching to `render-video`
- Extract `plan.resolution`
- Pass to Railway in composition

### Step 2: Update Code Generation
- Modify `generateRemotionCode` to use `plan.resolution`
- Add Caption component template
- Include captions when `scene.voiceover` exists

### Step 3: Update Existing Plans
```sql
-- Add resolution to existing plans (if missing)
UPDATE video_plans
SET plan = jsonb_set(
  plan, 
  '{resolution}', 
  '{"width": 1920, "height": 1080}'
)
WHERE plan->'resolution' IS NULL;
```

### Step 4: Test Thoroughly
- Test various aspect ratios
- Test with and without voiceovers
- Verify backward compatibility

## Backward Compatibility

- ✅ If `plan.resolution` is not provided, fall back to composition dimensions
- ✅ If no voiceover, Caption component is not included (no visual change)
- ✅ Existing plans without resolution continue to work with defaults
- ✅ Railway server remains compatible with old and new request formats

## Troubleshooting

### Issue: Video renders with wrong dimensions
**Solution**: Ensure `plan.resolution` is correctly set in the database and edge function extracts it properly.

### Issue: Captions not appearing
**Solution**: Verify that `scene.voiceover` exists and the Caption component is included in the generated code.

### Issue: Captions positioned incorrectly
**Solution**: Adjust the `bottom` style property in the Caption component for different screen sizes.

### Issue: Aspect ratio validation fails
**Solution**: Check for floating-point precision issues. Use a tolerance (e.g., 0.01) when comparing ratios.

## Conclusion

These updates make the Railway render system more flexible and capable of handling:
- ✅ Any video aspect ratio (vertical, square, ultrawide, etc.)
- ✅ Automatic caption generation for voiceover content
- ✅ Plan-driven configuration (resolution in one place)
- ✅ Better accessibility and user experience

The changes are backward compatible and can be rolled out incrementally.
