# Deployment Notes: Video Duration Fix

## What Was Fixed
Videos were only rendering as 5-second "Welcome to Remotion" clips instead of the full duration specified in the video plan. This is now fixed.

## Changes Made
- Modified: `remotion-render-server/src/Root.tsx`
- Added `calculateMetadata` function to dynamically compute video duration from the plan

## Deployment Steps

### For Railway (Production)
1. **Merge this PR** to your main/production branch
2. **Railway will auto-deploy** the changes (no manual steps needed)
3. **Test with a new render** - submit a video with duration > 5 seconds
4. **Verify** the output video has the correct duration

### For Local Development
1. Pull the changes: `git pull origin copilot/fix-video-render-issue`
2. Install dependencies: `cd remotion-render-server && npm install`
3. Restart your development server

## What to Test
Create a test video plan with these properties:
```json
{
  "id": "test-duration",
  "duration": 10,
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 },
  "scenes": [
    {
      "id": "scene-1",
      "startTime": 0,
      "duration": 10,
      "elements": [
        {
          "id": "text-1",
          "type": "text",
          "content": "Testing 10 seconds",
          "position": { "x": 50, "y": 50, "z": 1 },
          "size": { "width": 80, "height": 20 },
          "style": { "fontSize": 72, "fontWeight": 800 }
        }
      ]
    }
  ]
}
```

Expected result: A 10-second video (not 5 seconds!)

## Backward Compatibility
✅ Existing functionality is preserved
✅ Videos with no plan will default to 5 seconds (as before)
✅ No breaking changes to the API

## Rollback Plan
If issues occur:
1. Revert this PR
2. Railway will auto-deploy the previous version
3. Report the issue in GitHub

## Support
If you encounter any issues:
- Check Railway logs for errors
- Verify the video plan includes `duration`, `fps`, and `resolution` fields
- Ensure `composition.id` is set to `'DynamicVideo'` (not 'HelloWorld')
