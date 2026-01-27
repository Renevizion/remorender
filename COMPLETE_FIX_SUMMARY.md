# Complete Fix Summary - Video Rendering Issues

## What Was Wrong

### Problem 1: Videos Always 5 Seconds
Your videos were rendering at 5 seconds regardless of what duration you specified in your video plan.

**Root Cause:** The previous fix (PR #23) added `calculateMetadata` but forgot to remove the static properties. Both were present, and the static values won the fight.

```tsx
// BAD - What PR #23 did
<Composition
  durationInFrames={150}  // ❌ This overrides calculateMetadata!
  calculateMetadata={...} // This gets ignored
/>

// GOOD - What this PR does
<Composition
  calculateMetadata={...} // ✅ Now this is the only source of metadata
/>
```

### Problem 2: "Welcome to Remotion" Text
Your videos showed "Welcome to Remotion" text even though you didn't specify that content.

**Root Cause:** The defaultProps had a sample plan with that text, and when your actual plan wasn't being passed correctly, Remotion fell back to the sample.

```tsx
// BAD - Old defaultProps
defaultProps={{
  plan: samplePlan  // Had "Welcome to Remotion" scene
}}

// GOOD - New defaultProps  
defaultProps={{
  plan: defaultStudioPlan  // Has empty scenes: []
}}
```

### Problem 3: You Made Changes Today That Broke It
You said "it was working yesterday" but after changes today it stopped working.

**Root Cause:** The edge function in video-canvas-creator is sending the video plan in the wrong format.

```typescript
// WRONG - What it's currently sending
{
  plan: planData.plan  // ❌ Server can't find this
}

// RIGHT - What it needs to send
{
  inputProps: {
    plan: planData.plan  // ✅ Server looks for inputProps.plan
  }
}
```

## What This PR Fixed

### In remorender (this repo):
1. ✅ Removed static metadata properties from Root.tsx
2. ✅ Removed "Welcome to Remotion" sample plan
3. ✅ Added debug logging to server.js
4. ✅ Created documentation explaining the fixes

### What YOU Need to Fix:

In **video-canvas-creator**, update `supabase/functions/render-video/index.ts`:

```typescript
// Find this code (around line 500-520):
const renderPayload = {
  planId,
  code: remotionCode,
  plan: planData.plan,        // ❌ DELETE THIS LINE
  composition: {
    id: 'DynamicVideo',
    width,                    // ❌ DELETE THESE LINES
    height,                   // ❌
    fps,                      // ❌
    durationInFrames,         // ❌
  },
  webhookUrl,
};

// Change it to this:
const renderPayload = {
  planId,
  jobId: planId,              // ✅ ADD THIS
  code: remotionCode,
  inputProps: {               // ✅ ADD THIS WRAPPER
    plan: planData.plan,      // ✅ MOVE plan INSIDE inputProps
  },
  composition: {
    id: 'DynamicVideo',       // ✅ KEEP ONLY THE ID
  },
  webhookUrl,
};
```

## Why This Matters

The flow is:
1. Edge function sends request to remorender server
2. Server calls `selectComposition({ inputProps: { plan: ... } })`
3. Remotion calls `calculateMetadata({ props: inputProps })`
4. calculateMetadata reads `props.plan.duration` and calculates frames
5. Remotion renders DynamicVideo with the plan as props

If `inputProps` is missing, the whole chain breaks and Remotion uses defaultProps instead.

## Testing Steps

After you update the edge function:

1. **Deploy both repos:**
   - Merge this PR → Railway auto-deploys remorender
   - Update edge function → Supabase auto-deploys

2. **Test a video:**
   - Create a video with 30 second duration
   - Add your own content (text, images, etc.)
   - Render it

3. **Verify success:**
   - Video is 30 seconds long (not 5 seconds) ✅
   - Video shows your content (not "Welcome to Remotion") ✅
   - Check Railway logs - should show your inputProps with plan ✅

## Quick Reference

**Correct API Call Format:**
```typescript
fetch('https://your-railway-url.railway.app/render', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId: 'unique-job-id',
    planId: 'plan-id',
    code: remotionCode,           // Generated Remotion code
    inputProps: {                 // ✅ MUST have inputProps wrapper
      plan: {                     // ✅ Plan inside inputProps
        duration: 30,
        fps: 30,
        resolution: { width: 1920, height: 1080 },
        scenes: [ ... ]
      }
    },
    composition: {
      id: 'DynamicVideo'          // ✅ Just the ID
    },
    webhookUrl: 'https://...'
  })
});
```

## Files to Read

1. **API_INTEGRATION_FIX.md** - Detailed explanation of the edge function fix
2. **VIDEO_DURATION_FIX_EXPLANATION.md** - Why the previous fix didn't work
3. **Server logs** (after deployment) - Will show what's actually being received

## Summary

- **Duration fix:** Removed conflicting static properties ✅
- **Content fix:** Removed sample "Welcome to Remotion" plan ✅  
- **Integration issue:** Documented what you need to fix in video-canvas-creator 📝

Once you update the edge function, everything should work perfectly!
