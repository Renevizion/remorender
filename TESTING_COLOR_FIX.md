# Testing Guide: Video Color Consistency Fix

## Overview
This guide helps you test the color consistency fix between frontend preview and backend-rendered videos.

## What Was Fixed
- Videos rendered on the backend now use the same color space configuration as frontend previews
- Added explicit encoding settings to prevent color shifts and degradation
- Improved overall video quality with better color preservation

## Testing Scenarios

### Scenario 1: Simple Color Test
**Objective**: Verify basic colors render consistently

1. Create a video with solid color backgrounds:
   - Pure red (#FF0000)
   - Pure blue (#0000FF)
   - Pure green (#00FF00)
   - Light gray (#CCCCCC)

2. Preview in frontend (Remotion Studio or browser)
3. Render on backend
4. Compare the colors in both outputs

**Expected Result**: Colors should match exactly between preview and render

### Scenario 2: Gradient Test
**Objective**: Check for color banding and gradient smoothness

1. Create a video with smooth gradients:
   - Linear gradient from black to white
   - Radial gradient with multiple colors
   - Diagonal gradient with transparency

2. Preview and render
3. Look for banding artifacts (visible steps in gradients)

**Expected Result**: 
- Gradients should be smooth in both preview and render
- No visible banding artifacts
- Transitions between colors should be seamless

### Scenario 3: Text and Graphics Test
**Objective**: Verify text rendering and overlays

1. Create a video with:
   - White text on dark background
   - Dark text on light background
   - Text with shadows and effects
   - Colored text overlays

2. Preview and render
3. Compare text clarity and color accuracy

**Expected Result**: 
- Text should be crisp and clear
- Colors should match
- Shadows and effects should render identically

### Scenario 4: Complex Scene Test
**Objective**: Test real-world usage with multiple elements

1. Create a video with:
   - Background video or image
   - Text overlays
   - Logo/graphics
   - Color grading effects
   - Transitions

2. Preview and render
3. Compare all elements

**Expected Result**: 
- All visual elements match between preview and render
- Effects apply consistently
- Transitions work the same way

## How to Test

### Using Remotion Studio (Local)

```bash
cd remotion-render-server
npm install
npm run dev
```

1. Open Remotion Studio (usually http://localhost:3000)
2. Create or load a composition
3. Preview in the studio
4. Take a screenshot of key frames
5. Render the video locally using the studio
6. Compare the rendered video with screenshots

### Using the API

```bash
# Start the server
cd remotion-render-server
npm start
```

```javascript
// From your frontend/client
const response = await fetch('http://localhost:3001/render', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    composition: {
      id: 'DynamicVideo',
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 90
    },
    inputProps: {
      plan: {
        // Your video plan here
        colors: ['#FF0000', '#0000FF', '#00FF00'],
        // ...
      }
    }
  })
});

const { videoUrl } = await response.json();
console.log('Rendered video:', videoUrl);
```

### Visual Comparison Tools

1. **Side-by-side comparison**: 
   - Take screenshots from frontend preview
   - Extract frames from rendered video using FFmpeg
   - Compare using image diff tools

2. **FFmpeg frame extraction**:
```bash
# Extract frame at 2 seconds
ffmpeg -i output.mp4 -ss 2 -vframes 1 frame.png

# Extract multiple frames
ffmpeg -i output.mp4 -vf fps=1 frame-%04d.png
```

3. **Color picker**: 
   - Use a color picker tool on both preview and rendered video
   - Compare hex values of key colors

## Common Issues to Watch For

### Issue 1: Washed Out Colors
**Symptoms**: Colors appear less saturated or vibrant in the render
**Fixed by**: pixelFormat and imageFormat settings

### Issue 2: Color Shift
**Symptoms**: Colors are different hues (e.g., red looks more orange)
**Fixed by**: Explicit YUV color space declaration

### Issue 3: Banding in Gradients
**Symptoms**: Visible steps/lines in smooth gradients
**Fixed by**: Higher CRF quality setting (18)

### Issue 4: Dark/Light Areas Clipping
**Symptoms**: Loss of detail in very dark or bright areas
**Fixed by**: PNG image format and ANGLE renderer

## Validation Checklist

- [ ] Pure colors (R, G, B) match exactly
- [ ] Gradients are smooth without banding
- [ ] Text is crisp and colors match
- [ ] Shadows and effects render consistently
- [ ] Dark areas retain detail
- [ ] Bright areas don't clip/bloom
- [ ] Transitions work the same way
- [ ] Overall saturation matches
- [ ] Color temperature matches (warm/cool tones)
- [ ] Transparency/opacity works correctly

## Performance Notes

After the fix:
- **Encoding time**: Should be similar (±10%)
- **File size**: May increase 10-30% due to higher quality
- **Visual quality**: Significantly improved
- **Color accuracy**: Much better matching

## Rollback Plan

If issues occur, you can revert the changes:

```bash
git revert HEAD
```

Or temporarily use lower quality settings:
- Change `crf: 18` to `crf: 23` (default)
- Change `imageFormat: 'png'` to `imageFormat: 'jpeg'`

## Support

If you encounter issues:
1. Check the console logs for encoding errors
2. Verify FFmpeg is installed: `ffmpeg -version`
3. Review COLOR_CONSISTENCY_FIX.md for detailed explanation
4. Open an issue with:
   - Sample video or composition
   - Screenshots comparing preview vs render
   - Console output

## Additional Resources

- [FFmpeg Color Space Documentation](https://trac.ffmpeg.org/wiki/colorspace)
- [H.264 Encoding Guide](https://trac.ffmpeg.org/wiki/Encode/H.264)
- [Remotion Rendering Options](https://www.remotion.dev/docs/renderer/render-media)
- [YUV vs RGB Color Spaces](https://en.wikipedia.org/wiki/YUV)
