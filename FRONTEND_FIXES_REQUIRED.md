# Frontend Fixes to Match Backend Updates

## Overview
The backend has been updated to use the **DynamicVideo** component from the frontend, which includes all advanced Remotion features. The frontend needs to be updated to use the correct composition ID and data structure.

---

## 🔴 CRITICAL CHANGES REQUIRED

### 1. Update Composition ID in Client Examples

**File: `client-examples/videoManager.ts`**

**Line 50 - Change:**
```typescript
// ❌ BEFORE:
const videoUrl = await renderVideoOnRailway(
  data.generated_code,
  {
    id: 'MyVideo',  // ← Wrong composition ID
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: data.plan.duration * 30
  }
);

// ✅ AFTER:
const videoUrl = await renderVideoOnRailway(
  data.generated_code,
  {
    id: 'DynamicVideo',  // ← Correct composition ID
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: data.plan.duration * 30
  }
);
```

### 2. Update All Client Example References

Search and replace in `client-examples/` directory:
- Replace: `id: 'MyVideo'`
- With: `id: 'DynamicVideo'`

Files to check:
- ✅ `videoManager.ts` (line 50)
- ✅ `README.md` (update examples)
- ✅ Any other files using composition config

---

## 📋 Input Props Structure

The backend's **DynamicVideo** component expects a `plan` prop that matches the `VideoPlan` interface:

```typescript
interface VideoPlan {
  id: string;
  duration: number;
  fps: 30;
  resolution: { width: number; height: number };
  aspectRatio?: 'landscape' | 'portrait' | 'square';
  scenes: PlannedScene[];
  requiredAssets: AssetRequirement[];
  style: GlobalStyles;
  captions?: CaptionData[];
}
```

### Example Frontend API Call

```typescript
// When rendering a video, send:
const response = await fetch(`${RENDER_SERVER_URL}/render`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    composition: {
      id: 'DynamicVideo',  // ← Must match backend composition
      width: plan.resolution.width,
      height: plan.resolution.height,
      fps: plan.fps,
      durationInFrames: plan.duration * plan.fps
    },
    inputProps: {
      plan: videoPlan  // ← Your VideoPlan object
    },
    // Optional: webhook, jobId, planId for async processing
  })
});
```

---

## ✅ What's Now Available

The backend now supports ALL the same Remotion features as the frontend:

### Advanced Elements
- ✅ **CodeEditor** - Syntax-highlighted code with typing animation
- ✅ **ProgressBar** - Animated progress indicators
- ✅ **AnimatedText** - Character-by-character text reveal
- ✅ **PhoneMockup** - iPhone/Android device frames
- ✅ **LogoGrid** - Scrolling or static logo grids
- ✅ **DataVisualization** - Bar, line, pie, donut charts
- ✅ **AudioVisualization** - Real audio waveforms using @remotion/media-utils

### Video Effects
- ✅ **ColorGrading** - Cinematic, vintage, vibrant, moody presets
- ✅ **FilmGrain** - Analog film texture
- ✅ **Vignette** - Darkened edges effect
- ✅ **Bloom** - Glow/bloom effect

### Layout
- ✅ **ResponsiveContainer** - Multi-aspect ratio support (landscape, portrait, square, ultrawide)
- ✅ **Safe areas** - Mobile-safe content positioning

### Remotion Features
- ✅ **@remotion/transitions** - Fade, slide, wipe transitions
- ✅ **@remotion/shapes** - Circle, Rect, Triangle, Star, Polygon
- ✅ **@remotion/paths** - SVG path animations
- ✅ **@remotion/noise** - Organic motion with noise
- ✅ **@remotion/motion-blur** - Trail effects for fast animations
- ✅ **@remotion/layout-utils** - Text measurement

---

## 🚀 Testing Your Changes

### 1. Backend Test (Already Working)
```bash
cd remotion-render-server
npm run studio
# Open http://localhost:3000
# Verify "DynamicVideo" composition appears
```

### 2. Frontend Integration Test
```typescript
// Test with a minimal plan:
const testPlan: VideoPlan = {
  id: 'test-1',
  duration: 3,
  fps: 30,
  resolution: { width: 1920, height: 1080 },
  scenes: [{
    id: 'scene-1',
    startTime: 0,
    duration: 3,
    description: 'Test scene',
    elements: [{
      id: 'text-1',
      type: 'text',
      content: 'Hello from DynamicVideo!',
      position: { x: 50, y: 50, z: 1 },
      size: { width: 80, height: 20 },
      style: { fontSize: 64 },
      animation: {
        name: 'fadeIn',
        type: 'fade',
        duration: 1,
        delay: 0,
        easing: 'ease-out',
        properties: {}
      }
    }],
    animations: [],
    transition: null
  }],
  requiredAssets: [],
  style: {
    colorPalette: ['#ffffff', '#06b6d4', '#1e293b', '#0f172a'],
    typography: { primary: 'Inter', secondary: 'Roboto', sizes: {} },
    spacing: 8,
    borderRadius: 8
  }
};

// Then call render with composition.id = 'DynamicVideo' and inputProps.plan = testPlan
```

---

## 📦 Migration Checklist

- [ ] Update `client-examples/videoManager.ts` composition ID to `'DynamicVideo'`
- [ ] Update all client example files that reference composition ID
- [ ] Update README.md examples
- [ ] Test backend with `npm run studio` (verify DynamicVideo appears)
- [ ] Test frontend → backend integration with a simple VideoPlan
- [ ] Verify generated videos match Remotion Studio preview
- [ ] Update any documentation or guides that mention composition IDs

---

## 🆘 Troubleshooting

### Issue: "Composition 'MyVideo' not found"
**Solution:** You're still using the old composition ID. Update to `'DynamicVideo'`.

### Issue: "Property 'plan' is required"
**Solution:** Ensure you're passing `inputProps: { plan: videoPlan }` in your render request.

### Issue: Elements not rendering correctly
**Solution:** Verify your VideoPlan structure matches the TypeScript interfaces in `remotion-render-server/src/types/video.ts`.

### Issue: Missing imports in DynamicVideo
**Solution:** All required packages are now installed. If you see import errors, run:
```bash
cd remotion-render-server
npm install
```

---

## 📞 Support

If you encounter issues after making these changes:
1. Check backend logs for detailed error messages
2. Verify the VideoPlan structure matches the expected interface
3. Test with the minimal example plan provided above
4. Ensure all dependencies are installed in both frontend and backend
