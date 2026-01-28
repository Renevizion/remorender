# Video Color Consistency Fix

## Problem
Videos rendered on the backend had different colors and styles compared to the frontend preview. This was causing confusion and making it difficult to predict the final output.

## Root Cause
The issue was caused by missing color space and encoding configuration in the video rendering pipeline:

1. **Frontend Preview**: Uses sRGB/RGB color space (browser canvas/DOM)
2. **Backend Rendering**: H.264 encoder was defaulting to YUV 4:2:0 (BT.709) without explicit configuration
3. **Missing Settings**: No pixel format, image format, or quality settings were specified

This mismatch caused:
- Color shifts between preview and rendered output
- Loss of saturation in certain color ranges
- Color banding in gradients
- Inconsistent visual styles

## Solution

### 1. Updated renderMedia Configuration (server.js)
Added explicit color space and encoding settings to all `renderMedia()` calls:

```javascript
await renderMedia({
  composition: comp,
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: outputPath,
  inputProps: inputProps || {},
  // Color space and encoding configuration for consistent colors
  pixelFormat: 'yuv420p',      // Explicit YUV 4:2:0 format
  imageFormat: 'png',          // PNG for better color fidelity during frame extraction
  crf: 18,                     // High quality (0-51, lower is better)
  x264Preset: 'medium',        // Balanced quality/speed
  chromiumOptions: {
    headless: true,
    gl: 'angle'                // Better color rendering with ANGLE
  },
  onProgress: ({ progress }) => {
    console.log(`Render progress: ${Math.round(progress * 100)}%`);
  }
});
```

### 2. Updated Remotion Studio Config (remotion.config.ts)
Configured matching settings for Remotion Studio previews:

```typescript
Config.setVideoImageFormat('png');      // Match server setting
Config.setPixelFormat('yuv420p');       // Match server setting
Config.setCrf(18);                      // Match server quality
Config.setCodec('h264');                // Match server codec
Config.setChromiumOpenGlRenderer('angle'); // Better color rendering
```

## Key Settings Explained

### pixelFormat: 'yuv420p'
- Standard YUV 4:2:0 chroma subsampling format
- Most compatible with H.264/MP4
- Explicit declaration ensures consistency across platforms

### imageFormat: 'png'
- PNG preserves full color information during frame extraction
- JPEG can introduce compression artifacts that affect colors
- Better for maintaining color fidelity throughout the pipeline

### crf: 18
- Constant Rate Factor for quality control
- Range: 0 (lossless) to 51 (worst quality)
- 18 = visually lossless quality
- Lower values = larger file sizes but better color preservation

### x264Preset: 'medium'
- Balances encoding speed with quality
- Options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
- 'medium' provides good quality without excessive encoding time

### gl: 'angle'
- ANGLE (Almost Native Graphics Layer Engine) 
- Better OpenGL/WebGL rendering in Chromium
- Improves color accuracy and gradient rendering
- Reduces color banding artifacts

## Testing
After applying these changes:
1. Render a video with gradients and vibrant colors
2. Compare the frontend preview with the rendered output
3. Colors should now match consistently

## Impact
- ✅ Consistent colors between frontend preview and backend render
- ✅ Better color preservation in gradients and effects
- ✅ Higher quality output with minimal file size impact
- ✅ Predictable results for users

## Performance Notes
- CRF 18 may increase file sizes by 10-30% compared to default settings
- Encoding time should remain similar with 'medium' preset
- For faster encoding, use 'fast' or 'faster' preset (slight quality trade-off)
- For maximum quality, use 'slow' or 'slower' preset (longer encoding time)

## Future Improvements
Consider adding:
- Color profile embedding (sRGB/Rec.709 metadata)
- HDR support for wide color gamut content
- User-configurable quality settings
- Color grading presets that work consistently across preview and render

## References
- [FFmpeg Color Space Guide](https://trac.ffmpeg.org/wiki/colorspace)
- [H.264 CRF Guide](https://trac.ffmpeg.org/wiki/Encode/H.264#crf)
- [Remotion Rendering Options](https://www.remotion.dev/docs/renderer/render-media)
