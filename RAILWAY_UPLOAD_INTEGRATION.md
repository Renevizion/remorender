# Railway Integration with Upload-Video Edge Function

This guide shows how to update your Railway server to use the `upload-video` edge function for secure video uploads without needing Supabase credentials in Railway.

## Benefits

- ✅ Railway requires ZERO Supabase credentials
- ✅ All Supabase access controlled through edge functions
- ✅ Maximum security - service keys never leave Lovable Cloud
- ✅ Simpler Railway configuration

## Implementation

### Step 1: Remove Supabase Environment Variables from Railway

Remove these variables from your Railway environment:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### Step 2: Add Upload Endpoint URL to Railway

Add this environment variable to Railway:
- `UPLOAD_ENDPOINT_URL` = `https://your-project.supabase.co/functions/v1/upload-video`

**Note**: This is the ONLY environment variable needed. No Supabase credentials required!

### Step 3: Update Railway Server Code

Modify your Railway server's render function to use the upload endpoint:

```javascript
const express = require('express');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const fs = require('fs');
const path = require('path');

async function processRenderWithWebhook(code, composition, inputProps, webhookUrl, jobId, planId) {
  let tempDir = null;
  
  try {
    console.log(`[${jobId}] Processing render asynchronously...`);
    
    // ... (bundling and rendering code stays the same) ...
    
    // After rendering completes
    console.log(`[${jobId}] Render complete, uploading...`);
    
    // Read the rendered video file
    const videoBuffer = fs.readFileSync(outputPath);
    
    // Convert to base64
    const videoBase64 = videoBuffer.toString('base64');
    console.log(`[${jobId}] Video encoded, size: ${videoBase64.length} chars`);
    
    // Upload via edge function
    const uploadEndpoint = process.env.UPLOAD_ENDPOINT_URL;
    
    if (!uploadEndpoint) {
      throw new Error('UPLOAD_ENDPOINT_URL environment variable is not set');
    }
      
    console.log(`[${jobId}] Uploading to:`, uploadEndpoint);
    
    const uploadResponse = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        planId: planId,
        videoBase64: videoBase64
      })
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    const videoUrl = uploadResult.videoUrl;
    
    console.log(`[${jobId}] Upload complete:`, videoUrl);
    
    // Cleanup temp files
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Call webhook with success
    console.log(`[${jobId}] Calling webhook:`, webhookUrl);
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobId,
        planId,
        status: 'completed',
        videoUrl: videoUrl,
        fileName: uploadResult.fileName
      })
    });
    
    if (!webhookResponse.ok) {
      console.error(`[${jobId}] Webhook call failed:`, webhookResponse.statusText);
    } else {
      console.log(`[${jobId}] Webhook called successfully`);
    }
    
  } catch (error) {
    console.error(`[${jobId}] Render error:`, error);
    
    // Cleanup temp files on error
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`[${jobId}] Cleanup error:`, cleanupError);
      }
    }
    
    // Call webhook with failure
    if (webhookUrl) {
      try {
        console.log(`[${jobId}] Calling webhook with error...`);
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobId,
            planId,
            status: 'failed',
            error: error.message
          })
        });
      } catch (webhookError) {
        console.error(`[${jobId}] Failed to call webhook:`, webhookError);
      }
    }
  }
}
```

## Key Changes from Original Code

### Before (with Supabase credentials in Railway):
```javascript
// Railway uploads directly to Supabase Storage
const videoBuffer = fs.readFileSync(outputPath);
const fileName = `${Date.now()}-${composition.id}.mp4`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('rendered-videos')
  .upload(fileName, videoBuffer, {
    contentType: 'video/mp4',
    upsert: false
  });

const { data: { publicUrl } } = supabase.storage
  .from('rendered-videos')
  .getPublicUrl(fileName);
```

### After (using upload-video edge function):
```javascript
// Railway sends video to edge function for upload
const videoBuffer = fs.readFileSync(outputPath);
const videoBase64 = videoBuffer.toString('base64');

const uploadResponse = await fetch(`${uploadEndpoint}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    planId: planId,
    videoBase64: videoBase64
  })
});

const uploadResult = await uploadResponse.json();
const publicUrl = uploadResult.videoUrl;
```

## Error Handling

The edge function handles:
- ✅ Invalid or missing parameters
- ✅ Base64 decoding errors
- ✅ Storage upload failures
- ✅ Database update errors

Railway should check the response:
```javascript
if (!uploadResponse.ok) {
  throw new Error(`Upload failed: ${uploadResponse.statusText}`);
}

const result = await uploadResponse.json();
if (!result.success) {
  throw new Error(`Upload error: ${result.error}`);
}
```

## Performance Considerations

- **Base64 encoding**: Adds ~33% overhead to file size
- **Network transfer**: Video goes through edge function
- **Typical overhead**: 1-3 seconds for a 5MB video

For most use cases, the security benefits outweigh the small performance impact.

## Testing

Test the upload endpoint directly:

```bash
# Encode a test video
TEST_VIDEO_BASE64=$(base64 -w 0 test-video.mp4)

# Call the upload endpoint
curl -X POST https://your-project.supabase.co/functions/v1/upload-video \
  -H "Content-Type: application/json" \
  -d "{
    \"planId\": \"test-plan-123\",
    \"videoBase64\": \"$TEST_VIDEO_BASE64\"
  }"
```

Expected response:
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "videoUrl": "https://your-project.supabase.co/storage/v1/object/public/rendered-videos/...",
  "fileName": "1234567890-test-plan-123.mp4",
  "planId": "test-plan-123"
}
```

## Troubleshooting

### Upload fails with "base64 decode error"
- Ensure you're encoding the video correctly: `videoBuffer.toString('base64')`
- Don't include data URI prefix (`data:video/mp4;base64,`)

### Edge function timeout
- For very large videos (>50MB), consider chunked uploads or direct upload approach
- Supabase Edge Functions have execution time limits. Check the [official Supabase documentation](https://supabase.com/docs/guides/functions/limits) for current timeout values
- As of 2024, the default timeout is typically 150 seconds for functions

### Database not updating
- Check that the `planId` exists in the `video_plans` table
- Verify the edge function has access to `SUPABASE_SERVICE_ROLE_KEY`

## Next Steps

1. Deploy the updated Railway server code
2. Test with a small video first
3. Monitor Railway logs for successful uploads
4. Remove the Supabase credentials from Railway environment variables
