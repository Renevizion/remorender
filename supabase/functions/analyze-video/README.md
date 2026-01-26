# Analyze Video Edge Function

This Supabase edge function analyzes video files to extract visual patterns, colors, and timing information that can be used to generate similar videos with Remotion.

## Features

- Analyzes video metadata to extract patterns
- Identifies content type (commercial, tech demo, product showcase, etc.)
- Generates color palettes based on video type
- Extracts scene structure with transitions and animations
- Stores patterns in the database for reuse

## API

### Endpoint

```
POST /functions/v1/analyze-video
```

### Request Body

```typescript
{
  videoUrl?: string;      // URL to the video file (optional if videoName provided)
  videoName?: string;     // Name of the video (optional if videoUrl provided)
  description?: string;   // Optional description to help with analysis
}
```

### Response

```typescript
{
  success: boolean;
  message: string;
  pattern: {
    id: string;
    name: string;
    duration: number;
    colors: string[];
    typography: {
      primaryFont: string;
      secondaryFont: string;
      style: string;
    };
    scenes: Array<{
      startTime: number;
      endTime: number;
      description: string;
      transition: string;
      animation: string;
    }>;
    metadata: {
      analyzedAt: string;
      source: string;
      contentType: string;
    };
  };
  note: string;
}
```

## Usage Example

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/analyze-video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    videoUrl: 'https://example.com/video.mp4',
    videoName: 'product-showcase.mp4',
    description: 'A tech product demonstration video'
  })
});

const { pattern } = await response.json();
console.log('Extracted pattern:', pattern);
```

## How It Works

### Current Implementation (Metadata-Based)

The current implementation analyzes video metadata (filename, description) to generate intelligent patterns:

1. **Content Type Detection**: Identifies video type from filename/description
   - Tech demos
   - Product showcases
   - Explainer videos
   - Social media content
   - Commercials

2. **Pattern Generation**: Creates appropriate patterns based on content type
   - Color palettes matching the genre
   - Scene structure (opening, content, CTA)
   - Transitions and animations
   - Typography recommendations

3. **Database Storage**: Stores patterns in `video_patterns` table (optional)

### Future Enhancement: Deep Video Analysis

For comprehensive video analysis, you can enhance this function with:

1. **Frame Extraction**: Use FFmpeg to extract frames from the video
   ```typescript
   // Example with FFmpeg (requires setup)
   const ffmpeg = new FFmpeg();
   await ffmpeg.extractFrames(videoUrl, { fps: 1 }); // 1 frame per second
   ```

2. **Computer Vision**: Analyze frames for colors, objects, text
   - Use services like Google Cloud Vision API
   - Or open-source models like TensorFlow.js
   - Extract dominant colors with color-thief or similar

3. **Scene Detection**: Detect scene changes and transitions
   - Analyze pixel differences between frames
   - Identify cuts, fades, wipes

4. **Audio Analysis**: Extract audio patterns (optional)
   - Beat detection
   - Speech-to-text for extracting key messages

## Database Schema

If you want to store patterns, create this table:

```sql
CREATE TABLE video_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies as needed
ALTER TABLE video_patterns ENABLE ROW LEVEL SECURITY;
```

## Environment Variables

Required:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## Limitations

The current implementation generates patterns based on metadata rather than actual video content analysis. This is because:

1. **No Direct Video Processing**: Deno edge functions don't have built-in video processing
2. **Free Approach**: Avoids costly third-party APIs for video analysis
3. **Lightweight**: Fast response times without downloading large video files

For production use with real video analysis, consider:
- Setting up a separate video processing service with FFmpeg
- Using cloud video analysis APIs (AWS Rekognition, Google Video Intelligence)
- Implementing frame extraction in the Railway render server

## Integration with Render Pipeline

The extracted patterns can be used with the `generate-video-plan` edge function to create videos with similar styles:

```typescript
// 1. Analyze a reference video
const { pattern } = await analyzeVideo({ videoUrl: 'reference.mp4' });

// 2. Use the pattern to generate a new video
const videoRequest = {
  prompt: 'Create a product showcase for our new phone',
  referencePattern: pattern  // Apply the extracted style
};
```

## Best Practices

1. **Use Descriptive Names**: Provide clear video names and descriptions for better pattern detection
2. **Content Type Hints**: Include keywords like "tech", "product", "social" in the video name
3. **Store Patterns**: Save patterns to the database for reuse across projects
4. **Combine with AI**: Use patterns as constraints for AI video generation

## Error Handling

The function handles various error cases:
- Missing video information
- Database connection issues
- Invalid request format

All errors return appropriate HTTP status codes and error messages.
