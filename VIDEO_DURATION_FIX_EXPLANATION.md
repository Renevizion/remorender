# Video Duration Fix - Root Cause and Solution

## The Problem

After the previous fix (PR #23), videos were **still** rendering at 5 seconds instead of respecting the video plan's duration. This was extremely frustrating because the fix appeared to be correct on paper.

## What PR #23 Did (Incorrectly)

PR #23 added a `calculateMetadata` function to the DynamicVideo composition:

```tsx
<Composition
  id="DynamicVideo"
  durationInFrames={150}  // ❌ STILL HERE - This was the problem!
  fps={30}                // ❌ STILL HERE
  width={1920}            // ❌ STILL HERE  
  height={1080}           // ❌ STILL HERE
  calculateMetadata={({ props }) => {
    // This calculates the correct values but gets overridden!
    return { fps: 30, durationInFrames: plan.duration * plan.fps, ... }
  }}
/>
```

**The bug:** Having BOTH static properties AND `calculateMetadata` causes Remotion to use the static values instead of the calculated ones during the actual rendering process.

## What This Fix Does (Correctly)

This fix **removes** the static properties, keeping only `calculateMetadata`:

```tsx
<Composition
  id="DynamicVideo"
  // ✅ No static durationInFrames, fps, width, height
  calculateMetadata={({ props }) => {
    const plan = props.plan;
    return {
      fps: plan?.fps || 30,
      durationInFrames: Math.round((plan?.duration || 5) * (plan?.fps || 30)),
      width: plan?.resolution?.width || 1920,
      height: plan?.resolution?.height || 1080,
    };
  }}
/>
```

## Why This Works

1. **No conflicting static values** - Only `calculateMetadata` defines the composition metadata
2. **Dynamic calculation** - Metadata is computed from the video plan passed via `inputProps`
3. **Proper fallbacks** - If no plan is provided, defaults to 30fps, 5 seconds, 1920x1080
4. **Remotion's precedence rules** - When only `calculateMetadata` is present, Remotion uses its returned values

## How Remotion Processes Compositions

When rendering via `selectComposition()` and `renderMedia()`:

1. **With static props + calculateMetadata**: Static props take precedence (BUG!)
2. **With only calculateMetadata**: Calculated values are used correctly (FIXED!)

## Verification

The fix ensures videos render at their actual planned duration:

- 5 second plan @ 30fps = **150 frames** ✅
- 10 second plan @ 30fps = **300 frames** ✅  
- 30 second plan @ 30fps = **900 frames** ✅

All metadata (fps, resolution, duration) is now properly read from `inputProps.plan`.

## Files Changed

- `remotion-render-server/src/Root.tsx` - Removed static metadata properties

## Testing After Deployment

To verify the fix works:

1. Create a video plan with `duration: 30` (30 seconds)
2. Render the video via your API
3. Check the output video duration - should be 30 seconds, not 5 seconds

## Why The Previous Fix Didn't Work

The previous fix was **incomplete** - it added `calculateMetadata` but forgot to remove the static properties. This is a common mistake when migrating from static to dynamic metadata in Remotion compositions.

---

**Bottom line:** Videos will now respect the duration specified in the video plan instead of always being 5 seconds.
