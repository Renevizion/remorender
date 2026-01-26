# Analyze Video Edge Function

**FREE • NO SIGNUP • FFMPEG-POWERED** - Analyzes uploaded videos with **real frame extraction, scene detection, and audio analysis**.

## Features

- ✅ **100% FREE** - No API keys, subscriptions, or costs
- ✅ **NO SIGNUP** - Works out of the box
- ✅ **FFmpeg Frame Extraction** - Direct frame extraction from MP4 files
- ✅ **Scene Change Detection** - Automatic detection of scene transitions  
- ✅ **Audio Analysis** - Volume levels, beat detection, audio features
- ✅ **Real Color Extraction** - Extracts actual dominant colors from video frames
- ✅ **YouTube Support** - Analyze YouTube videos via URL
- ✅ **Fast Processing** - Typical 5-10 seconds for full analysis

## What's Included

### 1. Direct Frame Extraction ✨ NEW!
Extracts actual frames from uploaded MP4 files using FFmpeg:
- Distributes frames evenly across video duration
- High-quality JPEG frames
- Configurable frame count (default: 5)

### 2. Scene Change Detection ✨ NEW!
Automatically detects when scenes change:
- Uses FFmpeg's scene detection filter
- Configurable sensitivity threshold  
- Returns precise timestamps of scene transitions

### 3. Audio Analysis ✨ NEW!
Analyzes audio track features:
- Mean and max volume levels
- Beat detection (rhythm analysis)
- Audio codec information
- Detects presence of audio

## Setup

### Environment Variables

Add to your Supabase project secrets:

```bash
RAILWAY_RENDER_URL=https://your-railway-server.railway.app
```

**Note:** This is the same Railway server used for video rendering - it already has FFmpeg installed! No additional setup needed.

## API

### Endpoint

```
POST /functions/v1/analyze-video
```

### Request Body

**Option 1: Upload Video File (FFmpeg Analysis)**
```typescript
{
  videoBase64: string;       // Base64-encoded video file
  videoName: string;         // Name of the video
  frameCount?: number;       // Number of frames to extract (default: 5)
}
```

**Option 2: YouTube URL**
```typescript
{
  videoUrl: string;          // YouTube URL
  frameCount?: number;
}
```

### Response

**FFmpeg Analysis Response:**

```typescript
{
  success: true;
  message: "Video analyzed with FFmpeg on Railway server";
  analysisMethod: "ffmpeg-deep-analysis";
  features: {
    frameExtraction: true;
    sceneDetection: true;
    audioAnalysis: true;
    colorExtraction: true;
  };
  pattern: {
    id: string;
    name: string;
    duration: number;          // Actual video duration in seconds
    resolution: {
      width: number;           // Video width
      height: number;          // Video height
    };
    fps: number;               // Actual frames per second
    colors: string[];          // Real colors extracted from frames!
    scenes: Array<{
      startTime: number;       // Scene start timestamp
      endTime: number;         // Scene end timestamp
      duration: number;        // Scene duration in seconds
      description: string;
      transition: string;      // "cut" for scene changes
      hasAudio: boolean;
    }>;
    audio: {
      hasAudio: boolean;
      meanVolume: number;      // Average volume in dB
      maxVolume: number;       // Peak volume in dB
      hasBeat: boolean;        // Detected rhythm/beat
    };
    sceneChanges: number[];    // Exact timestamps of scene changes
    metadata: {
      analyzedAt: string;
      source: string;
      analysisMethod: "ffmpeg-deep-analysis";
      videoCodec: string;      // e.g., "h264", "vp9"
      audioCodec: string;      // e.g., "aac", "mp3"
      bitrate: number;         // Bitrate in bits/sec
      fileSize: number;        // File size in bytes
    };
  };
}
```

## Usage from Frontend

### Upload Video File for FFmpeg Analysis

```typescript
// 1. Get video file from input
const fileInput = document.querySelector('input[type="file"]');
const videoFile = fileInput.files[0];

// 2. Convert to base64
const reader = new FileReader();
reader.readAsDataURL(videoFile);
reader.onload = async () => {
  const base64 = reader.result.split(',')[1];
  
  // 3. Send to analyze-video function
  const response = await fetch('https://your-project.supabase.co/functions/v1/analyze-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_SUPABASE_ANON_KEY`
    },
    body: JSON.stringify({
      videoBase64: base64,
      videoName: videoFile.name,
      frameCount: 5  // Extract 5 frames
    })
  });
  
  const { pattern, features } = await response.json();
  
  console.log('Video analyzed!');
  console.log('Duration:', pattern.duration, 'seconds');
  console.log('Resolution:', pattern.resolution);
  console.log('Scene changes at:', pattern.sceneChanges);
  console.log('Colors:', pattern.colors);
  console.log('Has audio:', pattern.audio.hasAudio);
  console.log('Audio has beat:', pattern.audio.hasBeat);
};
```

### React Component Example

```tsx
import { useState } from 'react';

function VideoAnalyzer() {
  const [analyzing, setAnalyzing] = useState(false);
  const [pattern, setPattern] = useState(null);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAnalyzing(true);
    
    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      // Analyze video with FFmpeg
      const response = await fetch('/functions/v1/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64: base64,
          videoName: file.name,
          frameCount: 5
        })
      });
      
      const data = await response.json();
      setPattern(data.pattern);
      setAnalyzing(false);
    };
  };
  
  return (
    <div>
      <input type="file" accept="video/*" onChange={handleFileUpload} />
      
      {analyzing && <p>Analyzing video with FFmpeg...</p>}
      
      {pattern && (
        <div>
          <h3>Analysis Complete!</h3>
          <p>Duration: {pattern.duration.toFixed(2)}s</p>
          <p>Resolution: {pattern.resolution.width}x{pattern.resolution.height}</p>
          <p>FPS: {pattern.fps}</p>
          <p>Scenes detected: {pattern.scenes.length}</p>
          <p>Scene changes at: {pattern.sceneChanges.join(', ')}s</p>
          
          <h4>Colors:</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            {pattern.colors.map(color => (
              <div 
                key={color} 
                style={{ 
                  width: 50, 
                  height: 50, 
                  backgroundColor: color,
                  border: '1px solid #ccc'
                }} 
                title={color}
              />
            ))}
          </div>
          
          {pattern.audio.hasAudio && (
            <div>
              <h4>Audio:</h4>
              <p>Mean volume: {pattern.audio.meanVolume.toFixed(2)} dB</p>
              <p>Max volume: {pattern.audio.maxVolume.toFixed(2)} dB</p>
              <p>Has beat: {pattern.audio.hasBeat ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## How It Works

### FFmpeg Analysis (Uploaded Videos)

1. **Video Upload**: Frontend sends base64-encoded video to Supabase edge function
2. **Forwarding**: Edge function forwards to Railway server with FFmpeg
3. **Frame Extraction**: FFmpeg extracts frames at specified intervals
4. **Scene Detection**: FFmpeg detects scene changes using scene filter
5. **Audio Analysis**: FFmpeg analyzes audio track for volume and features
6. **Color Extraction**: Colors sampled from extracted frames
7. **Pattern Generation**: All data compiled into structured pattern
8. **Cleanup**: Temporary files automatically deleted

### YouTube Analysis

1. Extracts video ID from YouTube URL
2. Uses free YouTube thumbnail URLs (no API key needed!)
3. Analyzes thumbnails for colors
4. Returns pattern based on metadata

## Performance

- **Uploaded Videos (FFmpeg)**: 5-10 seconds (depends on video length)
- **YouTube Videos**: 2-3 seconds
- **Frame Extraction**: ~1 second per 5 frames
- **Scene Detection**: ~2-3 seconds
- **Audio Analysis**: ~1-2 seconds

## Best Practices

### 1. Optimize Video Size
- Keep uploads under 50MB for best performance
- Use standard codecs (H.264, AAC)
- 720p or 1080p works great

### 2. Frame Count
```typescript
{
  videoBase64: base64Data,
  frameCount: 3  // Fewer frames = faster analysis
}
```

### 3. Use for Pattern Generation
```typescript
// Analyze reference video
const { pattern } = await analyzeVideo({ videoBase64: base64 });

// Generate new video with same style
const newVideo = await generateVideo({
  prompt: 'Create a product showcase',
  colors: pattern.colors,           // Use real extracted colors
  duration: pattern.duration,
  scenes: pattern.scenes.length,
  audioTempo: pattern.audio.hasBeat ? 'upbeat' : 'calm'
});
```

## Troubleshooting

### "RAILWAY_RENDER_URL not configured"
- Set `RAILWAY_RENDER_URL` in Supabase project settings → Edge Functions → Secrets
- Use the same Railway URL from your video rendering setup

### "FFmpeg video analysis failed"
- Ensure video format is supported (MP4, MOV, AVI, WebM)
- Check video isn't corrupted
- Try reducing file size

### Slow Analysis
- Reduce `frameCount` (try 3 instead of 5)
- Use smaller video files
- Compress video before upload

## Cost

**Completely FREE:**
- ✅ No FFmpeg license fees (open source)
- ✅ No external API costs
- ✅ Railway server already has FFmpeg installed
- ✅ Supabase edge function included in free tier

## Why This is Amazing

✅ **Real Frame Extraction** - Not guessing, actually looking at video frames  
✅ **Scene Detection** - Automatic detection of cuts and transitions  
✅ **Audio Analysis** - Understand audio features and rhythm  
✅ **No External Dependencies** - Uses your existing Railway server  
✅ **Production Ready** - FFmpeg is industry-standard video processing  
✅ **Zero Cost** - Completely free, no API subscriptions  

Perfect for building AI video generators, video editing tools, content analysis platforms, and more!
